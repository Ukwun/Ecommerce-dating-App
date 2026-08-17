const express = require('express');
const SellerProfile = require('../models/SellerProfile');
const Return = require('../models/Return');
const SupportTicket = require('../models/SupportTicket');
const AdminUser = require('../models/AdminUser');
const Order = require('../models/Order');
const User = require('../models/User');
const Payment = require('../models/Payment');
const axios = require('axios');
const { protect, adminWithPermission, logSecurityAction } = require('../middleware/admin');
const sendResendEmail = require('../utils/resendEmail');

const router = express.Router();

// ============================================================================
// SELLER VERIFICATION MANAGEMENT
// ============================================================================

// ✅ Get all sellers (with pagination & filtering)
router.get('/sellers', protect, adminWithPermission('view_seller_details'), async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10, category } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.verificationStatus = status;
    if (category) query.businessCategory = category;

    const sellers = await SellerProfile.find(query)
      .populate('userId', 'name email avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await SellerProfile.countDocuments(query);

    logSecurityAction(req, null, 'view_seller_details', 'success');

    res.status(200).json({
      success: true,
      count: sellers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: sellers
    });
  } catch (error) {
    logSecurityAction(req, null, 'admin_action', 'failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get single seller details
router.get('/sellers/:sellerId', protect, adminWithPermission('view_seller_details'), async (req, res) => {
  try {
    const seller = await SellerProfile.findById(req.params.sellerId)
      .populate('userId', 'name email avatar')
      .populate('approvedBy', 'name email');

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    res.status(200).json({ success: true, data: seller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seller requests verification
router.post('/sellers/:sellerId/request-verification', protect, async (req, res) => {
  try {
    const { documents } = req.body;
    const seller = await SellerProfile.findById(req.params.sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    if (seller.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only submit verification for your own seller profile' });
    }
    seller.verificationStatus = 'pending';
    seller.verificationDocuments = documents || [];
    await seller.save();
    res.status(200).json({ success: true, message: 'Verification requested', data: seller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Approve seller application
router.post('/sellers/:sellerId/approve', protect, adminWithPermission('approve_sellers'), async (req, res) => {
  try {
    const { notes } = req.body;
    const seller = await SellerProfile.findById(req.params.sellerId).populate('userId', 'name email');
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    seller.verificationStatus = 'approved';
    seller.verificationDate = new Date();
    seller.approvedBy = req.admin._id;
    seller.verificationNotesFromAdmin = notes || '';
    seller.verificationDocuments = seller.verificationDocuments || [];
    await seller.save();
    // Send notification to seller (email)
    if (seller.userId && seller.userId.email) {
      await sendResendEmail({
        to: seller.userId.email,
        subject: 'Your Seller Application is Approved!',
        text: `Hi ${seller.userId.name},\n\nCongratulations! Your seller application has been approved. You can now start listing products and selling on the marketplace.\n\nBest regards,\nMarketplace Team`,
        idempotencyKey: `seller-approved-${seller._id}-${seller.verificationDate.getTime()}`,
      });
    }
    logSecurityAction(req, null, 'seller_approved', 'success', `Seller ${seller.businessName} approved`);
    res.status(200).json({
      success: true,
      message: 'Seller approved successfully',
      data: seller
    });
  } catch (error) {
    logSecurityAction(req, null, 'admin_action', 'failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Reject seller application
router.post('/sellers/:sellerId/reject', protect, adminWithPermission('reject_sellers'), async (req, res) => {
  try {
    const { reason } = req.body;
    const seller = await SellerProfile.findById(req.params.sellerId).populate('userId', 'name email');
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    seller.verificationStatus = 'rejected';
    seller.rejectionReason = reason;
    seller.verificationDate = new Date();
    seller.approvedBy = req.admin._id;
    await seller.save();
    // Send rejection email
    if (seller.userId && seller.userId.email) {
      await sendResendEmail({
        to: seller.userId.email,
        subject: 'Your Seller Application was Rejected',
        text: `Hi ${seller.userId.name},\n\nUnfortunately, your seller application was rejected. Reason: ${reason}\n\nBest regards,\nMarketplace Team`,
        idempotencyKey: `seller-rejected-${seller._id}-${seller.verificationDate.getTime()}`,
      });
    }
    logSecurityAction(req, null, 'seller_rejected', 'success', `Seller ${seller.businessName} rejected`);
    res.status(200).json({
      success: true,
      message: 'Seller application rejected',
      data: seller
    });
  } catch (error) {
    logSecurityAction(req, null, 'admin_action', 'failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Suspend seller account
router.post('/sellers/:sellerId/suspend', protect, adminWithPermission('suspend_sellers'), async (req, res) => {
  try {
    const { reason, durationDays } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    const seller = await SellerProfile.findById(req.params.sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    seller.verificationStatus = 'suspended';
    seller.suspensionReason = reason;
    if (durationDays) {
      seller.suspensionUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }
    await seller.save();

    logSecurityAction(req, null, 'admin_action', 'success', `Seller ${seller.businessName} suspended`);

    res.status(200).json({
      success: true,
      message: 'Seller suspended successfully',
      data: seller
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RETURN & REFUND MANAGEMENT
// ============================================================================

// ✅ Get all returns
router.get('/returns', protect, adminWithPermission('process_returns'), async (req, res) => {
  try {
    const { status = 'requested', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const returns = await Return.find(query)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'businessName')
      .populate('orderId', 'orderNumber')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Return.countDocuments(query);

    res.status(200).json({
      success: true,
      count: returns.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: returns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get return details
router.get('/returns/:returnId', protect, adminWithPermission('process_returns'), async (req, res) => {
  try {
    const returnData = await Return.findById(req.params.returnId)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'businessName')
      .populate('orderId');

    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    res.status(200).json({ success: true, data: returnData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Approve return request
router.post('/returns/:returnId/approve', protect, adminWithPermission('process_returns'), async (req, res) => {
  try {
    const { notes } = req.body;

    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    returnData.status = 'approved_by_seller';
    returnData.approvedAt = new Date();
    returnData.approvedBy = req.admin._id;
    returnData.adminNotes = notes || '';
    await returnData.save();

    res.status(200).json({
      success: true,
      message: 'Return approved',
      data: returnData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Reject return
router.post('/returns/:returnId/reject', protect, adminWithPermission('process_returns'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    returnData.status = 'rejected';
    returnData.rejectedAt = new Date();
    returnData.approvedBy = req.admin._id;
    returnData.adminNotes = reason;
    await returnData.save();

    res.status(200).json({
      success: true,
      message: 'Return rejected',
      data: returnData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Approve refund (process payment back to buyer)
router.post('/returns/:returnId/refund-approve', protect, adminWithPermission('approve_refunds'), async (req, res) => {
  try {
    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    if (['refund_initiated', 'refund_completed', 'closed'].includes(returnData.status)) {
      return res.status(409).json({ error: 'This return has already entered the refund process' });
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ error: 'Paystack refunds are not configured' });
    }
    const order = await Order.findById(returnData.orderId);
    const payment = await Payment.findOne({ order: returnData.orderId, status: 'success' });
    if (!order || !payment?.paystack?.reference) {
      return res.status(422).json({ error: 'A successful original Paystack payment was not found' });
    }

    const refundAmount = returnData.originalPrice - (returnData.deduction || 0);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > payment.amount) {
      return res.status(422).json({ error: 'Calculated refund amount is invalid' });
    }
    const paystackResponse = await axios.post('https://api.paystack.co/refund', {
      transaction: payment.paystack.reference,
      amount: Math.round(refundAmount * 100),
      currency: payment.currency,
      customer_note: `Refund for return ${returnData.returnNumber}`,
      merchant_note: `Approved by admin ${req.admin._id}`,
    }, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    
    returnData.finalRefundAmount = refundAmount;
    returnData.status = 'refund_initiated';
    returnData.refundInitiatedAt = new Date();
    returnData.refundTransactionId = String(paystackResponse.data.data.id);
    payment.paystack.refundId = String(paystackResponse.data.data.id);
    payment.paystack.refundStatus = paystackResponse.data.data.status || 'pending';
    payment.paystack.refundedAmount = refundAmount;

    await Promise.all([returnData.save(), payment.save()]);

    res.status(200).json({
      success: true,
      message: 'Refund approved and initiated',
      data: returnData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SUPPORT TICKET MANAGEMENT
// ============================================================================

// ✅ Get all support tickets
router.get('/support-tickets', protect, adminWithPermission('handle_disputes'), async (req, res) => {
  try {
    const { status = 'open', priority, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await SupportTicket.find(query)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ priority: -1, createdAt: -1 });

    const total = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: tickets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Assign ticket to admin
router.put('/support-tickets/:ticketId/assign', protect, adminWithPermission('respond_support_tickets'), async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.assignedTo = req.admin._id;
    ticket.assignedAt = new Date();
    ticket.status = 'in-progress';
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket assigned',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Reply to support ticket
router.post('/support-tickets/:ticketId/reply', protect, adminWithPermission('respond_support_tickets'), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: req.user.id,
      senderType: 'admin',
      message
    });

    // If first response, record response time
    if (!ticket.firstResponseTime && ticket.messages.length === 1) {
      const responseTime = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60); // in minutes
      ticket.firstResponseTime = responseTime;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Reply added',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Close support ticket
router.put('/support-tickets/:ticketId/close', protect, adminWithPermission('respond_support_tickets'), async (req, res) => {
  try {
    const { resolution } = req.body;

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.status = 'closed';
    ticket.resolution = resolution || '';
    ticket.resolvedBy = req.admin._id;
    ticket.resolvedAt = new Date();
    ticket.closedAt = new Date();

    // Calculate resolution time
    if (ticket.resolvedAt) {
      const resolutionTime = (ticket.resolvedAt - new Date(ticket.createdAt)) / (1000 * 60 * 60); // in hours
      ticket.resolutionTime = resolutionTime;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket closed',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ANALYTICS & DASHBOARD
// ============================================================================

// ✅ Get platform analytics
router.get('/analytics/dashboard', protect, adminWithPermission('view_analytics'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSellers = await SellerProfile.countDocuments({ verificationStatus: 'approved' });
    const totalOrders = await Order.countDocuments();
    const pendingReturns = await Return.countDocuments({ status: 'requested' });
    const openTickets = await SupportTicket.countDocuments({ status: 'open' });

    // Calculate revenue (sum of completed orders)
    const ordersRevenue = await Order.aggregate([
      { $match: { 'status': 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalRevenue = ordersRevenue[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSellers,
        totalOrders,
        totalRevenue,
        pendingReturns,
        openTickets
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
