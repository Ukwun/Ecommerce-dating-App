const express = require('express');
const axios = require('axios');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_key_here';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// ✅ Initialize payment with Paystack
router.post('/payments/initialize', authMiddleware, async (req, res) => {
  try {
    const { orderId, email, amount } = req.body;

    if (!orderId || !email || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

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
router.post('/payments/verify', authMiddleware, async (req, res) => {
  try {
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
        order.payment.status = 'completed';
        order.payment.transactionId = paystackData.id;
        order.payment.paystackRef = reference;
        order.payment.paidAt = new Date();
        order.status = 'confirmed';
        await order.save();
      }

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

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        reason: paystackData.gateway_response
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get payment details
router.get('/payments/:id', authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
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
router.get('/payments', authMiddleware, async (req, res) => {
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

// ✅ Payment webhook from Paystack
router.post('/payments/webhook/paystack', async (req, res) => {
  try {
    const hash = req.headers['x-paystack-signature'];
    const body = JSON.stringify(req.body);

    // Verify signature (optional but recommended)
    // const crypto = require('crypto');
    // const hash2 = crypto.createHmac('sha512', PAYSTACK_SECRET).update(body).digest('hex');
    // if (hash !== hash2) return res.status(400).json({ error: 'Invalid signature' });

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const reference = data.reference;

      const payment = await Payment.findOne({ 'paystack.reference': reference });
      if (payment && payment.status !== 'success') {
        payment.status = 'success';
        payment.paidAt = new Date();
        await payment.save();

        // Update order
        const order = await Order.findById(payment.order);
        if (order) {
          order.payment.status = 'completed';
          order.status = 'confirmed';
          await order.save();
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
