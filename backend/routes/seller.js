const express = require('express');
const SellerProfile = require('../models/SellerProfile');
const SellerAnalytics = require('../models/SellerAnalytics');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Return = require('../models/Return');
const SellerFollow = require('../models/SellerFollow');
const { protect, seller } = require('../middleware/admin');

const router = express.Router();

router.get('/profiles/:sellerId', async (req, res) => {
  try {
    const profile = await SellerProfile.findOne({ _id: req.params.sellerId, verificationStatus: 'approved' }).populate('userId', 'name avatar createdAt');
    if (!profile) return res.status(404).json({ error: 'Verified seller not found' });
    const followers = await SellerFollow.countDocuments({ seller: profile._id });
    return res.json({ success: true, data: { ...profile.toObject(), followers } });
  } catch {
    return res.status(400).json({ error: 'Invalid seller profile' });
  }
});

router.get('/profiles/:sellerId/follow-status', protect, async (req, res) => {
  const following = await SellerFollow.exists({ follower: req.user.id, seller: req.params.sellerId });
  res.json({ success: true, following: Boolean(following) });
});

router.post('/profiles/:sellerId/follow', protect, async (req, res) => {
  const profile = await SellerProfile.findOne({ _id: req.params.sellerId, verificationStatus: 'approved' }).select('userId');
  if (!profile) return res.status(404).json({ error: 'Verified seller not found' });
  if (profile.userId.toString() === req.user.id) return res.status(400).json({ error: 'You cannot follow your own store' });
  await SellerFollow.updateOne({ follower: req.user.id, seller: profile._id }, { $setOnInsert: { follower: req.user.id, seller: profile._id } }, { upsert: true });
  res.status(201).json({ success: true, following: true });
});

router.delete('/profiles/:sellerId/follow', protect, async (req, res) => {
  await SellerFollow.deleteOne({ follower: req.user.id, seller: req.params.sellerId });
  res.json({ success: true, following: false });
});

// ============================================================================
// SELLER PROFILE MANAGEMENT
// ============================================================================

// ✅ Get current seller profile
router.get('/profile', protect, async (req, res) => {
  try {
    const sellerProfile = await SellerProfile.findOne({ userId: req.user.id });

    if (!sellerProfile) {
      return res.status(404).json({ error: 'No seller profile found. Apply to become a seller first.' });
    }

    res.status(200).json({ success: true, data: sellerProfile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Apply to become a seller
router.post('/apply', protect, async (req, res) => {
  try {
    const { businessName, businessCategory, businessDescription, registrationNumber } = req.body;

    // Check if already applied
    const existingSeller = await SellerProfile.findOne({ userId: req.user.id });
    if (existingSeller) {
      return res.status(400).json({ error: 'You have already applied as a seller' });
    }

    // Validate required fields
    if (!businessName || !businessCategory) {
      return res.status(400).json({ error: 'Business name and category are required' });
    }

    // Create seller profile
    const newSeller = new SellerProfile({
      userId: req.user.id,
      businessName,
      businessCategory,
      businessDescription: businessDescription || '',
      registrationNumber: registrationNumber || '',
      verificationStatus: 'pending'
    });

    await newSeller.save();

    // Create analytics record
    const analytics = new SellerAnalytics({
      sellerId: newSeller._id
    });
    await analytics.save();

    res.status(201).json({
      success: true,
      message: 'Seller application submitted. Please wait for admin approval.',
      data: newSeller
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update seller profile
router.put('/profile', protect, seller, async (req, res) => {
  try {
    const { businessDescription, contactEmail, contactPhone, businessWebsite, storeDescription } = req.body;

    const updateData = {};
    if (businessDescription) updateData.businessDescription = businessDescription;
    if (contactEmail) updateData.contactEmail = contactEmail;
    if (contactPhone) updateData.contactPhone = contactPhone;
    if (businessWebsite) updateData.businessWebsite = businessWebsite;
    if (storeDescription) updateData.storeDescription = storeDescription;

    const updated = await SellerProfile.findByIdAndUpdate(
      req.seller._id,
      updateData,
      { new: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update bank details for payouts
router.put('/bank-details', protect, seller, async (req, res) => {
  try {
    const { bankName, accountNumber, accountName, bankCode } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: 'All bank details are required' });
    }

    const updated = await SellerProfile.findByIdAndUpdate(
      req.seller._id,
      {
        bankName,
        accountNumber,
        accountName,
        bankCode,
        bankVerified: false // Reset verification
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bank details updated. Will be verified before first payout.',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SELLER ORDERS & PRODUCTS
// ============================================================================

// ✅ Get my orders (seller dashboard)
router.get('/orders', protect, seller, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { 'products.product': { $exists: true } };

    // Get all products from this seller
    const sellerProducts = await Product.find({ seller: req.user.id });
    const productIds = sellerProducts.map(p => p._id);

    // Find orders containing these products
    const orders = await Order.find({
      'products.product': { $in: productIds }
    })
      .populate('user', 'name email avatar')
      .populate('products.product', 'title price')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const sellerProductSet = new Set(productIds.map(id => id.toString()));
    const scopedOrders = orders.map(order => {
      const value = order.toObject();
      value.products = value.products.filter(item => sellerProductSet.has(String(item.product?._id || item.product)));
      value.fulfillments = (value.fulfillments || []).filter(item => String(item.seller) === req.user.id);
      value.subtotal = value.fulfillments.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      value.total = value.subtotal;
      delete value.payment;
      return value;
    });

    const total = await Order.countDocuments({
      'products.product': { $in: productIds }
    });

    res.status(200).json({
      success: true,
      count: scopedOrders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: scopedOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get my products
router.get('/products', protect, seller, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const products = await Product.find({ seller: req.user.id })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ seller: req.user.id });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: products
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get returns for my products
router.get('/returns', protect, seller, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const returns = await Return.find({ sellerId: req.seller._id })
      .populate('buyerId', 'name email')
      .populate('orderId', 'orderNumber')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Return.countDocuments({ sellerId: req.seller._id });

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

// ✅ Approve return (seller action)
router.post('/returns/:returnId/approve', protect, seller, async (req, res) => {
  try {
    const { notes } = req.body;

    const returnData = await Return.findById(req.params.returnId);
    if (!returnData) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Verify this seller owns the return
    if (returnData.sellerId.toString() !== req.seller._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    returnData.status = 'approved_by_seller';
    returnData.sellerNotes = notes || '';
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

// ============================================================================
// SELLER ANALYTICS & DASHBOARD
// ============================================================================

// ✅ Get seller dashboard stats
router.get('/dashboard', protect, seller, async (req, res) => {
  try {
    // Get seller profile
    const seller = req.seller;

    // Get analytics
    const analytics = await SellerAnalytics.findOne({ sellerId: req.seller._id });

    // Calculate current month stats
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const sellerProducts = await Product.find({ seller: req.user.id });
    const productIds = sellerProducts.map(p => p._id);

    const monthOrders = await Order.find({
      'products.product': { $in: productIds },
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });

    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);

    res.status(200).json({
      success: true,
      data: {
        profile: {
          businessName: seller.businessName,
          totalEarnings: seller.totalEarnings,
          pendingEarnings: seller.pendingEarnings,
          averageRating: seller.averageRating,
          totalRatings: seller.totalRatings
        },
        currentMonth: {
          orders: monthOrders.length,
          revenue: monthRevenue,
          averageOrderValue: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0
        },
        lifetime: {
          totalOrders: seller.totalOrders,
          totalSales: seller.totalSales,
          totalEarnings: seller.totalEarnings
        },
        analytics: analytics || {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get seller analytics
router.get('/analytics', protect, seller, async (req, res) => {
  try {
    const analytics = await SellerAnalytics.findOne({ sellerId: req.seller._id });

    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }

    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
