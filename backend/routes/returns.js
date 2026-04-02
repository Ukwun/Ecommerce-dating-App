const express = require('express');
const Return = require('../models/Return');
const Order = require('../models/Order');
const { protect } = require('../middleware/admin');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Generate unique return number
const generateReturnNumber = () => {
  return `RET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// ============================================================================
// CUSTOMER RETURNS
// ============================================================================

// ✅ Request a return for an order
router.post('/requests', protect, async (req, res) => {
  try {
    const { orderId, products, reason, detailedReason } = req.body;

    // Validate required fields
    if (!orderId || !products || !reason) {
      return res.status(400).json({ error: 'Order, products, and reason are required' });
    }

    // Check if order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'This order does not belong to you' });
    }

    // Check order status (can't return if not delivered)
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Can only return delivered orders' });
    }

    // Check if return window is still open (e.g., 30 days)
    const daysSinceDelivery = (Date.now() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 30) {
      return res.status(400).json({ error: 'Return window has closed (30 days)' });
    }

    // Check if return already exists
    const existingReturn = await Return.findOne({ orderId, status: { $nin: ['closed', 'refund_completed'] } });
    if (existingReturn) {
      return res.status(400).json({ error: 'A return request already exists for this order' });
    }

    // Get seller ID from order
    const firstProduct = order.products[0];
    const seller = firstProduct.seller; // Assuming product has seller info

    // Calculate refund amount (sum of returned items)
    let refundAmount = 0;
    for (const item of products) {
      const orderItem = order.products.find(p => p.product.toString() === item.productId);
      if (orderItem) {
        refundAmount += orderItem.price * item.quantity;
      }
    }

    // Create return request
    const newReturn = new Return({
      returnNumber: generateReturnNumber(),
      orderId,
      buyerId: req.user.id,
      sellerId: seller,
      products,
      reason,
      detailedReason: detailedReason || '',
      originalPrice: refundAmount,
      refundAmount,
      status: 'requested'
    });

    await newReturn.save();

    res.status(201).json({
      success: true,
      message: 'Return request submitted. Waiting for seller approval.',
      data: newReturn
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get my returns
router.get('/my-returns', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { buyerId: req.user.id };
    if (status) query.status = status;

    const returns = await Return.find(query)
      .populate('orderId', 'orderNumber')
      .populate('sellerId', 'businessName')
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
router.get('/:returnId', protect, async (req, res) => {
  try {
    const returnData = await Return.findById(req.params.returnId)
      .populate('orderId')
      .populate('sellerId', 'businessName');

    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Check authorization
    if (returnData.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({ success: true, data: returnData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Add proof images/video to return
router.post('/:returnId/upload-proof', protect, async (req, res) => {
  try {
    const { images, video } = req.body;

    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Check authorization
    if (returnData.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only add proof if return is requested
    if (returnData.status !== 'requested') {
      return res.status(400).json({ error: 'Can only add proof for requested returns' });
    }

    if (images) {
      returnData.images = images;
    }
    if (video) {
      returnData.video = video;
    }

    await returnData.save();

    res.status(200).json({
      success: true,
      message: 'Proof uploaded',
      data: returnData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Ship product back (generate/download return label)
router.post('/:returnId/ship-back', protect, async (req, res) => {
  try {
    const { trackingNumber } = req.body;

    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Check authorization
    if (returnData.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Must have label first
    if (!returnData.returnShippingLabel) {
      return res.status(400).json({ error: 'Return shipping label not available yet' });
    }

    returnData.status = 'item_shipped_back';
    if (trackingNumber) {
      returnData.returnTrackingNumber = trackingNumber;
    }
    await returnData.save();

    res.status(200).json({
      success: true,
      message: 'Return marked as shipped back',
      data: returnData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Cancel return request
router.post('/:returnId/cancel', protect, async (req, res) => {
  try {
    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Check authorization
    if (returnData.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only cancel if still requested or approved
    if (!['requested', 'approved_by_seller'].includes(returnData.status)) {
      return res.status(400).json({ error: 'Cannot cancel return at this stage' });
    }

    returnData.status = 'closed';
    await returnData.save();

    res.status(200).json({
      success: true,
      message: 'Return cancelled',
      data: returnData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RETURN STATUS TRACKING
// ============================================================================

// ✅ Get return status timeline
router.get('/:returnId/timeline', protect, async (req, res) => {
  try {
    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    const timeline = [
      {
        status: 'Requested',
        timestamp: returnData.requestedAt,
        completed: true,
        description: 'Return request submitted'
      },
      {
        status: 'Seller Review',
        timestamp: returnData.approvedAt,
        completed: returnData.status !== 'requested',
        description: 'Waiting for seller to review'
      },
      {
        status: 'Shipping Label',
        timestamp: returnData.labelGeneratedAt,
        completed: ['item_shipped_back', 'item_received', 'verified', 'refund_approved', 'refund_completed'].includes(returnData.status),
        description: 'Return shipping label generated'
      },
      {
        status: 'Item Shipped',
        timestamp: returnData.itemShippedAt,
        completed: ['item_received', 'verified', 'refund_approved', 'refund_completed'].includes(returnData.status),
        description: 'Item shipped back to seller'
      },
      {
        status: 'Item Received',
        timestamp: returnData.itemReceivedDate,
        completed: ['verified', 'refund_approved', 'refund_completed'].includes(returnData.status),
        description: 'Return item received by seller'
      },
      {
        status: 'Verification',
        timestamp: returnData.verifiedAt,
        completed: ['refund_approved', 'refund_completed'].includes(returnData.status),
        description: 'Return verified by seller'
      },
      {
        status: 'Refund Approved',
        timestamp: returnData.refundInitiatedAt,
        completed: ['refund_completed'].includes(returnData.status),
        description: 'Refund approved and processing'
      },
      {
        status: 'Refund Completed',
        timestamp: returnData.refundCompletedAt,
        completed: returnData.status === 'refund_completed',
        description: 'Refund completed'
      }
    ];

    res.status(200).json({
      success: true,
      currentStatus: returnData.status,
      timeline
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
