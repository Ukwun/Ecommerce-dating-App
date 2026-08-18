const express = require('express');
const axios = require('axios');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Return = require('../models/Return');
const PaymentMethod = require('../models/PaymentMethod');
const Subscription = require('../models/Subscription');
const AdminUser = require('../models/AdminUser');
const { protect } = require('../middleware/auth');
const SecurityLog = require('../models/SecurityLog');
const { EVENT_TYPES } = require('../constants/eventTaxonomy');
const { trackUserEvent } = require('../utils/eventLogger');
const { evaluateAbuseRisk } = require('../utils/fraudMonitor');

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const getClientIp = (req) => req.ip || req.connection?.remoteAddress || 'Unknown';

router.get('/payment-methods', protect, async (req, res) => {
  const methods = await PaymentMethod.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, data: methods });
});

router.post('/payment-methods/initialize', protect, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Paystack is not configured' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const reference = `card_${user._id}_${Date.now()}`;
    const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      email: user.email,
      amount: 5000,
      reference,
      callback_url: 'marketplace://payment-method-added',
      metadata: { type: 'payment_method_setup', userId: String(user._id) },
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, timeout: 15000 });
    res.json({ success: true, data: response.data.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.message || error.message });
  }
});

router.post('/payment-methods/verify', protect, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Paystack is not configured' });
    const { reference, isDefault = false } = req.body;
    const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, timeout: 15000 });
    const data = response.data.data;
    if (data.status !== 'success' || data.metadata?.type !== 'payment_method_setup' || String(data.metadata.userId) !== req.user.id) {
      return res.status(422).json({ error: 'Card authorization could not be verified' });
    }
    if (!data.authorization?.reusable || !data.authorization?.authorization_code) {
      return res.status(422).json({ error: 'This card cannot be saved for future charges' });
    }
    if (isDefault) await PaymentMethod.updateMany({ user: req.user.id }, { isDefault: false });
    const method = await PaymentMethod.findOneAndUpdate(
      { user: req.user.id, signature: data.authorization.signature },
      {
        user: req.user.id,
        provider: 'paystack',
        authorizationCode: data.authorization.authorization_code,
        signature: data.authorization.signature,
        email: data.customer.email,
        cardType: data.authorization.card_type,
        brand: data.authorization.brand,
        last4: data.authorization.last4,
        expMonth: data.authorization.exp_month,
        expYear: data.authorization.exp_year,
        bank: data.authorization.bank,
        countryCode: data.authorization.country_code,
        reusable: true,
        isDefault,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await axios.post(`${PAYSTACK_BASE_URL}/refund`, { transaction: reference, amount: 5000 }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, timeout: 15000 });
    res.json({ success: true, data: method, message: 'Card saved; verification charge refund initiated' });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.message || error.message });
  }
});

router.delete('/payment-methods/:id', protect, async (req, res) => {
  const deleted = await PaymentMethod.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!deleted) return res.status(404).json({ error: 'Payment method not found' });
  res.json({ success: true });
});

router.post('/payments/charge-saved', protect, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Paystack is not configured' });
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment.status === 'completed') return res.status(409).json({ error: 'Order is already paid' });
    const method = await PaymentMethod.findOne({ _id: req.body.paymentMethodId, user: req.user.id, reusable: true }).select('+authorizationCode');
    if (!method) return res.status(404).json({ error: 'Saved payment method not found' });
    const reference = `order_${order._id}_${Date.now()}`;
    const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/charge_authorization`, {
      authorization_code: method.authorizationCode,
      email: method.email,
      amount: Math.round(order.total * 100),
      reference,
      callback_url: 'marketplace://payment-complete',
      metadata: { orderId: String(order._id), userId: req.user.id },
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, timeout: 20000 });
    await Payment.create({
      user: req.user.id, order: order._id, amount: order.total, currency: 'NGN', method: 'card',
      status: response.data.data.status === 'success' ? 'processing' : 'pending',
      paystack: {
        reference: response.data.data.reference || reference,
        authorizationCode: method.authorizationCode,
        cardType: method.cardType,
        last4: method.last4,
        signature: method.signature,
        reusable: true,
        authorizationUrl: response.data.data.authorization_url,
      },
    });
    res.json({ success: true, data: response.data.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.message || error.message });
  }
});

router.post('/subscriptions/initialize', protect, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Paystack is not configured' });
    const plans = {
      monthly: process.env.PAYSTACK_PREMIUM_MONTHLY_PLAN,
      biannual: process.env.PAYSTACK_PREMIUM_BIANNUAL_PLAN,
      annual: process.env.PAYSTACK_PREMIUM_ANNUAL_PLAN,
    };
    const planCode = plans[req.body.planId];
    if (!planCode) return res.status(422).json({ error: 'Selected premium plan is not configured' });
    const user = await User.findById(req.user.id);
    const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      email: user.email,
      plan: planCode,
      callback_url: 'marketplace://subscription-complete',
      metadata: { type: 'premium_subscription', userId: String(user._id), planId: req.body.planId },
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, timeout: 15000 });
    await Subscription.create({ user: user._id, planId: req.body.planId, planCode, status: 'pending' });
    res.json({ success: true, data: response.data.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.message || error.message });
  }
});

// ✅ Initialize payment with Paystack
router.post('/payments/initialize', protect, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order is required' });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (order.payment.status === 'completed') {
      return res.status(409).json({ error: 'Order has already been paid' });
    }
    const user = await User.findById(req.user.id);
    const amount = order.total;
    const email = user.email;

    // Initialize payment with Paystack
    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: amount * 100, // Paystack uses kobo
        email,
        metadata: {
          orderId,
          userId: req.user.id
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );

    // Save payment record
    const payment = new Payment({
      user: req.user.id,
      order: orderId,
      amount,
      method: 'paystack',
      status: 'pending',
      paystack: {
        accessCode: paystackResponse.data.data.access_code,
        authorizationUrl: paystackResponse.data.data.authorization_url,
        reference: paystackResponse.data.data.reference
      }
    });

    await payment.save();

    await SecurityLog.create({
      userId: req.user.id,
      username: email,
      action: 'payment_initiated',
      description: 'payment initialization requested',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      method: req.method,
      endpoint: req.path,
      status: 'success',
      metadata: { orderId, amount },
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Payment initialized',
      data: {
        accessCode: paystackResponse.data.data.access_code,
        authorizationUrl: paystackResponse.data.data.authorization_url,
        reference: paystackResponse.data.data.reference
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Verify payment
router.post('/payments/verify', protect, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
    }

    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference required' });
    }

    // Verify with Paystack
    const paystackResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );

    const paystackData = paystackResponse.data.data;

    // Update payment record
    const payment = await Payment.findOne({ 'paystack.reference': reference });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (paystackData.status === 'success') {
      payment.status = 'success';
      payment.paystack.authorizationCode = paystackData.authorization.authorization_code;
      payment.paystack.cardType = paystackData.authorization.card_type;
      payment.paystack.last4 = paystackData.authorization.last4;
      payment.paidAt = new Date();
      await payment.save();

      // Update order payment status
      const order = await Order.findById(payment.order);
      if (order) {
        if (order.inventoryReservationStatus !== 'committed') {
          if (order.inventoryReservationExpiresAt < new Date()) {
            return res.status(409).json({ error: 'Inventory reservation expired; contact support for an automatic refund' });
          }
          for (const item of order.products) {
            await Product.updateOne(
              { _id: item.product, reservedStock: { $gte: item.quantity }, stock: { $gte: item.quantity } },
              { $inc: { stock: -item.quantity, reservedStock: -item.quantity, purchases: item.quantity } }
            );
          }
          order.inventoryReservationStatus = 'committed';
        }
        order.payment.status = 'completed';
        order.payment.transactionId = paystackData.id;
        order.payment.paystackRef = reference;
        order.payment.paidAt = new Date();
        order.status = 'confirmed';
        await order.save();

        await trackUserEvent({
          userId: req.user.id,
          eventType: EVENT_TYPES.PAYMENT_SUCCESS,
          price: paystackData.amount / 100,
          metadata: {
            orderId: String(order._id),
            reference,
          },
        });
      }

      await SecurityLog.create({
        userId: req.user.id,
        action: 'payment_verified',
        description: 'payment verified successfully',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        method: req.method,
        endpoint: req.path,
        status: 'success',
        metadata: { reference },
      }).catch(() => {});

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          status: 'success',
          amount: paystackData.amount / 100,
          reference: paystackData.reference
        }
      });
    } else {
      payment.status = 'failed';
      payment.failureReason = paystackData.gateway_response;
      await payment.save();

      await trackUserEvent({
        userId: req.user.id,
        eventType: EVENT_TYPES.PAYMENT_FAILED,
        metadata: {
          reference,
          reason: paystackData.gateway_response,
        },
      });

      await SecurityLog.create({
        userId: req.user.id,
        action: 'payment_verified',
        description: 'payment verification failed',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        method: req.method,
        endpoint: req.path,
        status: 'failed',
        metadata: { reference, reason: paystackData.gateway_response },
      }).catch(() => {});

      const risk = await evaluateAbuseRisk({ userId: req.user.id, ipAddress: getClientIp(req) });
      const { enqueueFraudReview } = require('../jobs/queue');
      await enqueueFraudReview({ userId: req.user.id, ipAddress: getClientIp(req) }, `fraud-payment-${reference}`).catch(() => false);
      if (risk.riskLevel === 'high') {
        await SecurityLog.create({
          userId: req.user.id,
          action: 'suspicious_activity_detected',
          description: 'high risk payment failure threshold reached',
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'Unknown',
          method: req.method,
          endpoint: req.path,
          status: 'blocked',
          riskLevel: 'high',
          metadata: { reference },
        }).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        reason: paystackData.gateway_response
      });
    }
  } catch (error) {
    await trackUserEvent({
      userId: req.user?.id,
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      metadata: {
        source: 'payments_verify_exception',
        error: error.message,
      },
    });
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get payment details
router.get('/payments/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const adminUser = await AdminUser.findOne({ userId: req.user.id, isActive: true }).select('permissions');
    if (payment.user.toString() !== req.user.id && !adminUser?.permissions?.includes('manage_payments')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get user payments
router.get('/payments', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { user: req.user.id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('order')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Payment webhook from Paystack — with real signature verification
router.post('/payments/webhook/paystack', async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      console.error('Paystack webhook rejected: PAYSTACK_SECRET is not configured');
      return res.status(503).json({ error: 'Payment webhook is not configured' });
    }
    const signature = req.headers['x-paystack-signature'];
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(req.rawBody || Buffer.from(JSON.stringify(req.body)))
      .digest('hex');

    const signatureIsValid = typeof signature === 'string' &&
      signature.length === hash.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
    if (!signatureIsValid) {
      console.warn('⚠️  Invalid Paystack webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event)) {
      const { reconcileTransfer } = require('../services/sellerSettlement');
      await reconcileTransfer(event, data);
    }

    if (event === 'charge.success') {
      const reference = data.reference;

      const payment = await Payment.findOne({ 'paystack.reference': reference });
      if (payment && (data.currency !== payment.currency || Number(data.amount) !== Math.round(payment.amount * 100))) {
        console.warn('Paystack webhook amount mismatch:', reference);
        return res.status(422).json({ error: 'Payment amount or currency mismatch' });
      }
      if (payment && payment.status !== 'success') {
        payment.status = 'success';
        payment.paidAt = new Date();
        await payment.save();

        // Update order
        const order = await Order.findById(payment.order);
        if (order) {
          if (order.inventoryReservationStatus !== 'committed') {
            for (const item of order.products) {
              await Product.updateOne(
                { _id: item.product, reservedStock: { $gte: item.quantity }, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity, reservedStock: -item.quantity, purchases: item.quantity } }
              );
            }
            order.inventoryReservationStatus = 'committed';
          }
          order.payment.status = 'completed';
          order.status = 'confirmed';
          await order.save();
        }
      }
    }

    if (event.startsWith('refund.')) {
      const payment = await Payment.findOne({ 'paystack.reference': data.transaction_reference });
      if (payment) {
        payment.paystack.refundStatus = data.status || event.replace('refund.', '');
        await payment.save();
        const returnData = await Return.findOne({ orderId: payment.order, status: 'refund_initiated' });
        if (returnData && event === 'refund.processed') {
          returnData.status = 'refund_completed';
          returnData.refundCompletedAt = new Date();
          await returnData.save();
          await Order.findByIdAndUpdate(payment.order, { status: 'refunded', 'payment.status': 'refunded' });
          const { recordOrderRefund } = require('../services/sellerSettlement');
          await recordOrderRefund(payment.order, payment.paystack.refundedAmount || payment.amount);
        }
      }
    }

    if (['subscription.create', 'subscription.disable', 'subscription.not_renew', 'invoice.payment_failed'].includes(event)) {
      const subscription = await Subscription.findOne({ planCode: data.plan?.plan_code, user: data.metadata?.userId });
      if (subscription) {
        subscription.subscriptionCode = data.subscription_code || subscription.subscriptionCode;
        subscription.customerCode = data.customer?.customer_code || subscription.customerCode;
        subscription.emailToken = data.email_token || subscription.emailToken;
        subscription.nextPaymentDate = data.next_payment_date || subscription.nextPaymentDate;
        subscription.status = event === 'subscription.create' ? 'active' : event === 'invoice.payment_failed' ? 'attention' : 'non-renewing';
        await subscription.save();
        await User.findByIdAndUpdate(subscription.user, {
          isPremium: subscription.status === 'active',
          subscriptionExpiresAt: subscription.nextPaymentDate,
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
