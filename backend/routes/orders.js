const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ✅ Create order from cart
router.post('/orders', protect, async (req, res) => {
  try {
    const { products, shippingAddress, shippingCost } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'No products in order' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address required' });
    }

    let subtotal = 0;
    const orderProducts = [];

    // Validate and prepare products
    for (const item of products) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(400).json({ error: `Product ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
      }

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      orderProducts.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price,
        totalPrice
      });

      // Update product stock
      product.stock -= item.quantity;
      product.purchases += item.quantity;
      product.inStock = product.stock > 0;
      await product.save();
    }

    const tax = Math.round(subtotal * 0.1); // 10% tax
    const total = subtotal + shippingCost + tax;

    const order = new Order({
      user: req.user.id,
      products: orderProducts,
      shippingAddress,
      subtotal,
      shippingCost,
      tax,
      total
    });

    await order.save();

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      {
        items: [],
        subtotal: 0,
        shippingCost: 0,
        tax: 0,
        total: 0
      }
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get user orders
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { user: req.user.id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('products.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
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

// ✅ Get single order
router.get('/orders/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('products.product')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update order status (seller/admin)
router.put('/orders/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    if (status === 'delivered') {
      order.deliveredAt = Date.now();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Cancel order
router.put('/orders/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot cancel order in ${order.status} status` });
    }

    // Restore product stock
    for (const item of order.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.purchases -= item.quantity;
        product.inStock = true;
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get order statistics (admin)
router.get('/admin/stats/orders', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        byStatus: stats
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Rate Driver
router.post('/orders/:id/rate-driver', protect, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    order.driverRating = rating;
    order.driverFeedback = feedback;
    await order.save();

    res.json({ success: true, message: 'Driver rated successfully', data: order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Tip Driver
router.post('/orders/:id/tip-driver', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    order.driverTip = (order.driverTip || 0) + Number(amount);
    await order.save();

    res.json({ success: true, message: 'Tip added successfully', data: order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Report Issue
router.post('/orders/:id/report-issue', protect, async (req, res) => {
  try {
    const { issue } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    order.issueReported = true;
    order.issueDescription = issue;
    await order.save();

    res.json({ success: true, message: 'Issue reported successfully', data: order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
