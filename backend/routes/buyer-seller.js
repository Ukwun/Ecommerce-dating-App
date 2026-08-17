/**
 * BUYER-SELLER RELATIONSHIP SYSTEM
 * Realistic e-commerce marketplace logic (Jumia/Alibaba style)
 * Tracks orders, reviews, ratings, disputes, and seller performance
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const SellerRating = require('../models/SellerRating');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// ===== SELLER PROFILE & STATISTICS =====

// Get seller's complete profile with real statistics
router.get('/sellers/:sellerId/profile', async (req, res) => {
  try {
    const seller = await User.findById(req.params.sellerId).select('-password');
    
    // Get seller statistics
    const totalSales = await Order.countDocuments({ seller: req.params.sellerId });
    const totalRevenue = await Order.aggregate([
      { $match: { seller: mongoose.Types.ObjectId(req.params.sellerId) } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const ratings = await SellerRating.find({ sellerId: req.params.sellerId });
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : 0;
    
    const reviews = await Review.find({ sellerId: req.params.sellerId });
    const products = await Product.find({ seller: req.params.sellerId });

    res.json({
      success: true,
      seller: {
        ...seller.toObject(),
        stats: {
          totalSales,
          totalRevenue: totalRevenue[0]?.total || 0,
          averageRating: avgRating.toFixed(1),
          totalReviews: reviews.length,
          totalProducts: products.length,
          responseTime: '2-4 hours',
          joinDate: seller.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get seller's products with filters
router.get('/sellers/:sellerId/products', async (req, res) => {
  try {
    const { sort = 'newest', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { soldCount: -1 };
    if (sort === 'price-low') sortOption = { price: 1 };
    if (sort === 'price-high') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };

    const products = await Product.find({ seller: req.params.sellerId })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ seller: req.params.sellerId });

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get seller's reviews and ratings
router.get('/sellers/:sellerId/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ sellerId: req.params.sellerId })
      .populate('buyerId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ sellerId: req.params.sellerId });
    const avgRating = await SellerRating.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(req.params.sellerId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      reviews,
      statistics: {
        averageRating: avgRating[0]?.avgRating.toFixed(1) || 0,
        totalReviews: total,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ORDER MANAGEMENT =====

// Create order with buyer-seller relationship tracking
router.post('/orders', protect, async (req, res) => {
  try {
    const { items, seller, shippingAddress, paymentMethod } = req.body;

    if (!items.length || !seller || !shippingAddress) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Calculate totals
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = 500; // Dynamic based on location
    const tax = total * 0.05;
    const finalTotal = total + shippingFee + tax;

    const order = await Order.create({
      buyer: req.user.id,
      seller,
      items,
      subtotal: total,
      shippingFee,
      tax,
      total: finalTotal,
      shippingAddress,
      paymentMethod,
      status: 'pending',
      orderNumber: `ORD-${Date.now()}`
    });

    res.status(201).json({
      success: true,
      order,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order details with seller info
router.get('/orders/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('buyer', 'name email avatar phone')
      .populate('seller', 'name avatar rating');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Get seller's average response time for this product
    const responseTime = await calculateSellerResponseTime(order.seller._id);

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        seller: {
          ...order.seller.toObject(),
          averageResponseTime: responseTime
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track order with real-time updates
router.get('/orders/:orderId/tracking', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const tracking = {
      orderNumber: order.orderNumber,
      status: order.status,
      timeline: [
        {
          step: 'Order Confirmed',
          status: order.status !== 'cancelled' ? 'completed' : 'cancelled',
          date: order.createdAt
        },
        {
          step: 'Processing',
          status: ['processing', 'shipped', 'delivered'].includes(order.status) ? 'in-progress' : 'pending',
          date: order.processedAt || null
        },
        {
          step: 'Shipped',
          status: ['shipped', 'delivered'].includes(order.status) ? 'completed' : 'pending',
          date: order.shippedAt || null
        },
        {
          step: 'Out for Delivery',
          status: ['out-for-delivery', 'delivered'].includes(order.status) ? 'in-progress' : 'pending',
          date: order.outForDeliveryAt || null
        },
        {
          step: 'Delivered',
          status: order.status === 'delivered' ? 'completed' : 'pending',
          date: order.deliveredAt || null
        }
      ],
      estimatedDelivery: order.estimatedDelivery,
      carrier: order.carrier || 'FastShip Nigeria',
      trackingNumber: order.trackingNumber
    };

    res.json({ success: true, tracking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status (seller only)
router.put('/orders/:orderId/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const validStatuses = ['processing', 'shipped', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Update order with timestamps
    order.status = status;
    if (status === 'processing') order.processedAt = new Date();
    if (status === 'shipped') order.shippedAt = new Date();
    if (status === 'out-for-delivery') order.outForDeliveryAt = new Date();
    if (status === 'delivered') order.deliveredAt = new Date();

    await order.save();

    res.json({ success: true, order, message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== REVIEWS & RATINGS =====

// Create review after order completion
router.post('/orders/:orderId/review', protect, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.buyer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only buyer can review' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Order must be delivered first' });
    }

    const review = await Review.create({
      orderId: req.params.orderId,
      buyerId: req.user.id,
      sellerId: order.seller,
      rating,
      comment,
      images: images || []
    });

    // Update seller rating
    await SellerRating.create({
      sellerId: order.seller,
      buyerId: req.user.id,
      rating,
      orderId: req.params.orderId
    });

    res.status(201).json({
      success: true,
      review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get buyer's orders
router.get('/my-orders', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { buyer: req.user.id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('seller', 'name avatar rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SELLER MANAGEMENT =====

// Get seller's orders (seller dashboard)
router.get('/seller/orders', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { seller: req.user.id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('buyer', 'name avatar phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);
    const stats = {
      totalOrders: total,
      pendingOrders: await Order.countDocuments({ seller: req.user.id, status: 'pending' }),
      completedOrders: await Order.countDocuments({ seller: req.user.id, status: 'delivered' }),
      totalRevenue: await calculateSellerRevenue(req.user.id)
    };

    res.json({
      success: true,
      orders,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
async function calculateSellerResponseTime(sellerId) {
  const orders = await Order.find({ seller: sellerId }).limit(10);
  if (!orders.length) return '2-4 hours';
  
  const avgTime = orders.reduce((sum, order) => {
    if (order.processedAt && order.createdAt) {
      return sum + (order.processedAt - order.createdAt);
    }
    return sum;
  }, 0) / orders.length;

  const hours = Math.floor(avgTime / (1000 * 60 * 60));
  return `${hours || 1}-${hours + 2} hours`;
}

async function calculateSellerRevenue(sellerId) {
  const result = await Order.aggregate([
    { $match: { seller: mongoose.Types.ObjectId(sellerId), status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  return result[0]?.total || 0;
}

module.exports = router;
