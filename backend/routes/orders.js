const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { protect } = require('../middleware/auth');
const AdminUser = require('../models/AdminUser');
const { EVENT_TYPES } = require('../constants/eventTaxonomy');
const { trackUserEvent } = require('../utils/eventLogger');
const { enqueueReservationRelease } = require('../jobs/queue');

const router = express.Router();

// ✅ Create order from cart
router.post('/orders', protect, async (req, res) => {
  const reservedProducts = [];
  const releaseReservations = () => Promise.all(
    reservedProducts.map(entry => Product.updateOne({ _id: entry.product }, { $inc: { reservedStock: -entry.quantity } }))
  );
  try {
    const { products, shippingAddress, shippingCost } = req.body;

    await trackUserEvent({
      userId: req.user.id,
      eventType: EVENT_TYPES.CHECKOUT_START,
      metadata: {
        itemCount: products?.length || 0,
        hasShippingAddress: Boolean(shippingAddress),
      },
    });

    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'No products in order' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address required' });
    }
    const allowedShippingCosts = [1000, 2500];
    if (!allowedShippingCosts.includes(Number(shippingCost))) {
      return res.status(422).json({ error: 'Invalid shipping method or price' });
    }

    let subtotal = 0;
    const orderProducts = [];
    const fulfillmentMap = new Map();

    // Validate and prepare products
    for (const item of products) {
      const product = await Product.findById(item.product);
      
      if (!product || product.inStock === false || Number(product.stock) <= 0) {
        await releaseReservations();
        return res.status(400).json({ error: `Product ${item.product} not found` });
      }

      if (product.stock - (product.reservedStock || 0) < item.quantity) {
        await releaseReservations();
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      const reserved = await Product.updateOne(
        { _id: product._id, $expr: { $gte: [{ $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] }, item.quantity] } },
        { $inc: { reservedStock: item.quantity } }
      );
      if (!reserved.modifiedCount) {
        await releaseReservations();
        return res.status(409).json({ error: `${product.name} was just reserved by another buyer` });
      }
      reservedProducts.push({ product: product._id, quantity: item.quantity });

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      orderProducts.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price,
        totalPrice
      });
      const sellerId = String(product.seller);
      const fulfillment = fulfillmentMap.get(sellerId) || { seller: product.seller, products: [], subtotal: 0 };
      fulfillment.products.push({ product: product._id, quantity: item.quantity, totalPrice });
      fulfillment.subtotal += totalPrice;
      fulfillmentMap.set(sellerId, fulfillment);

      await trackUserEvent({
        userId: req.user.id,
        eventType: EVENT_TYPES.PURCHASE,
        productId: item.product,
        category: product.category,
        price: totalPrice,
        metadata: { quantity: item.quantity, unitPrice: product.price },
      });
    }

    const taxRate = Number(process.env.MARKETPLACE_TAX_RATE || 0.075);
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + Number(shippingCost) + tax;

    const order = new Order({
      user: req.user.id,
      products: orderProducts,
      fulfillments: Array.from(fulfillmentMap.values()),
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

    await trackUserEvent({
      userId: req.user.id,
      eventType: EVENT_TYPES.CHECKOUT_COMPLETED,
      price: total,
      metadata: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        products: orderProducts.length,
      },
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

    const adminUser = await AdminUser.findOne({ userId: req.user.id, isActive: true });
    if (order.user._id.toString() !== req.user.id && !adminUser?.permissions?.includes('manage_orders')) {
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

    const [adminUser, orderProducts] = await Promise.all([
      AdminUser.findOne({ userId: req.user.id, isActive: true }),
      Product.find({ _id: { $in: order.products.map(item => item.product) } }).select('seller')
    ]);
    const canManageAllOrders = adminUser?.permissions?.includes('manage_orders');
    const ownsEveryProduct = orderProducts.length === order.products.length &&
      orderProducts.every(product => product.seller.toString() === req.user.id);
    if (!canManageAllOrders && !ownsEveryProduct) {
      return res.status(403).json({ error: 'Only the order seller or an authorized administrator can update status' });
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

// Update only the authenticated seller's portion of a multi-seller order.
router.put('/orders/:id/fulfillments/status', protect, async (req, res) => {
  try {
    const { status, trackingNumber, carrier } = req.body;
    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid fulfillment status' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const fulfillment = order.fulfillments.find(item => item.seller.toString() === req.user.id);
    if (!fulfillment) return res.status(403).json({ error: 'This order has no fulfillment assigned to your seller account' });
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      refunded: [],
    };
    if (!transitions[fulfillment.status]?.includes(status)) {
      return res.status(409).json({ error: `Cannot move fulfillment from ${fulfillment.status} to ${status}` });
    }
    if (status === 'shipped' && (!trackingNumber || !carrier)) {
      return res.status(400).json({ error: 'Carrier and tracking number are required when shipping' });
    }
    fulfillment.status = status;
    if (trackingNumber) fulfillment.trackingNumber = trackingNumber;
    if (carrier) fulfillment.carrier = carrier;
    if (status === 'shipped') fulfillment.shippedAt = new Date();
    if (status === 'delivered') fulfillment.deliveredAt = new Date();
    const statuses = order.fulfillments.map(item => item.status);
    if (statuses.every(value => value === 'delivered')) order.status = 'delivered';
    else if (statuses.some(value => value === 'shipped')) order.status = 'shipped';
    else if (statuses.some(value => value === 'processing')) order.status = 'processing';
    else if (statuses.every(value => value === 'cancelled')) order.status = 'cancelled';
    else if (statuses.some(value => value === 'confirmed')) order.status = 'confirmed';
    await order.save();
    await enqueueReservationRelease(String(order._id), Math.max(0, order.inventoryReservationExpiresAt.getTime() - Date.now())).catch(() => false);
    if (status === 'delivered') {
      const { enqueueSettlement } = require('../jobs/queue');
      await enqueueSettlement({ orderId: order._id.toString(), sellerId: req.user.id }, `settlement-${order._id}-${req.user.id}`);
    }
    res.json({ success: true, data: fulfillment, orderStatus: order.status });
  } catch (error) {
    await releaseReservations().catch(() => {});
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

    const adminUser = await AdminUser.findOne({ userId: req.user.id, isActive: true }).select('permissions');
    if (order.user.toString() !== req.user.id && !adminUser?.permissions?.includes('manage_orders')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot cancel order in ${order.status} status` });
    }

    // Release a pending reservation or restore committed inventory.
    for (const item of order.products) {
      const product = await Product.findById(item.product);
      if (product) {
        if (order.inventoryReservationStatus === 'reserved') {
          product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
        } else if (order.inventoryReservationStatus === 'committed') {
          product.stock += item.quantity;
          product.purchases = Math.max(0, product.purchases - item.quantity);
          product.inStock = true;
        }
        await product.save();
      }
    }

    order.status = 'cancelled';
    order.inventoryReservationStatus = 'released';
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
    const adminUser = await AdminUser.findOne({ userId: req.user.id, isActive: true }).select('permissions');
    if (!adminUser?.permissions?.includes('view_analytics')) {
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
