const express = require('express');
const SellerProfile = require('../models/SellerProfile');
const SellerAnalytics = require('../models/SellerAnalytics');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Return = require('../models/Return');
const SellerFollow = require('../models/SellerFollow');
const { protect, seller } = require('../middleware/admin');
const axios = require('axios');
const SellerLedgerEntry = require('../models/SellerLedgerEntry');
const SellerPayout = require('../models/SellerPayout');
const { releaseMaturedEntries, createPayout } = require('../services/sellerSettlement');
const SellerBankAccount = require('../models/SellerBankAccount');

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
    const { businessName, businessCategory, businessDescription, registrationNumber, legalFullName, contactEmail, contactPhone, businessAddress } = req.body;

    // Check if already applied
    const existingSeller = await SellerProfile.findOne({ userId: req.user.id });
    if (existingSeller) {
      return res.status(400).json({ error: 'You have already applied as a seller' });
    }

    // Validate required fields
    if (!businessName || !businessCategory || !legalFullName || !contactEmail || !contactPhone || !businessAddress?.addressLine1 || !businessAddress?.city || !businessAddress?.state) {
      return res.status(400).json({ error: 'Legal name, contact details, business name, category and address are required' });
    }

    // Create seller profile
    const newSeller = new SellerProfile({
      userId: req.user.id,
      businessName,
      businessCategory,
      businessDescription: businessDescription || '',
      registrationNumber: registrationNumber || '',
      legalFullName,
      contactEmail,
      contactPhone,
      businessAddress,
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

    if (!bankName || !bankCode || !/^\d{10}$/.test(String(accountNumber || ''))) {
      return res.status(400).json({ error: 'All bank details are required' });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Bank verification is not configured' });
    const verification = await axios.get('https://api.paystack.co/bank/resolve', { params: { account_number: accountNumber, bank_code: bankCode }, headers: { Authorization: `Bearer ${secret}` }, timeout: 15000 });
    const resolvedName = verification.data?.data?.account_name;
    if (!resolvedName) return res.status(422).json({ error: 'The bank account could not be verified' });

    const updated = await SellerProfile.findByIdAndUpdate(
      req.seller._id,
      {
        bankName,
        accountNumber,
        accountName: resolvedName,
        bankCode,
        bankVerified: true,
        paystackRecipientCode: undefined,
        paystackRecipientAccountFingerprint: undefined,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bank details verified and saved.',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bank-accounts', protect, seller, async (req, res) => {
  const accounts = await SellerBankAccount.find({ seller: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, data: accounts.map(account => ({ ...account.toObject(), accountNumber: `******${account.accountNumber.slice(-4)}` })) });
});

router.post('/bank-accounts', protect, seller, async (req, res) => {
  try {
    const { bankName, bankCode, accountNumber } = req.body;
    if (!bankName || !bankCode || !/^\d{10}$/.test(String(accountNumber || ''))) return res.status(422).json({ error: 'Valid bank details are required' });
    const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Bank verification is not configured' });
    const verification = await axios.get('https://api.paystack.co/bank/resolve', { params: { account_number: accountNumber, bank_code: bankCode }, headers: { Authorization: `Bearer ${secret}` }, timeout: 15000 });
    const accountName = verification.data?.data?.account_name;
    if (!accountName) return res.status(422).json({ error: 'The account could not be verified' });
    const hasAccount = await SellerBankAccount.exists({ seller: req.user.id });
    const account = await SellerBankAccount.create({ seller: req.user.id, bankName, bankCode, accountNumber, accountName, verified: true, isDefault: !hasAccount });
    res.status(201).json({ success: true, data: { ...account.toObject(), accountNumber: `******${accountNumber.slice(-4)}` } });
  } catch (error) { res.status(422).json({ error: error.response?.data?.message || error.message }); }
});

router.patch('/bank-accounts/:id/default', protect, seller, async (req, res) => {
  const account = await SellerBankAccount.findOne({ _id: req.params.id, seller: req.user.id, verified: true });
  if (!account) return res.status(404).json({ error: 'Verified bank account not found' });
  await SellerBankAccount.updateMany({ seller: req.user.id }, { $set: { isDefault: false } });
  account.isDefault = true; await account.save();
  res.json({ success: true });
});

router.delete('/bank-accounts/:id', protect, seller, async (req, res) => {
  const used = await SellerPayout.exists({ seller: req.user.id, bankAccount: req.params.id, status: { $in: ['requested', 'queued', 'processing'] } });
  if (used) return res.status(409).json({ error: 'This account is attached to an active withdrawal' });
  const removed = await SellerBankAccount.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
  if (!removed) return res.status(404).json({ error: 'Bank account not found' });
  if (removed.isDefault) {
    const replacement = await SellerBankAccount.findOne({ seller: req.user.id, verified: true }).sort({ createdAt: -1 });
    if (replacement) { replacement.isDefault = true; await replacement.save(); }
  }
  res.json({ success: true });
});

router.get('/ledger', protect, seller, async (req, res) => {
  await releaseMaturedEntries(req.user.id);
  const entries = await SellerLedgerEntry.find({ seller: req.user.id }).sort({ createdAt: -1 }).limit(200);
  const balance = entries.filter(row => row.status === 'available').reduce((sum, row) => sum + (row.direction === 'credit' ? row.amount : -row.amount), 0);
  res.json({ success: true, data: entries, availableBalance: Math.round(balance * 100) / 100 });
});

router.get('/payouts', protect, seller, async (req, res) => {
  const payouts = await SellerPayout.find({ seller: req.user.id }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: payouts });
});

router.post('/payouts', protect, seller, async (req, res) => {
  try {
    const active = await SellerPayout.exists({ seller: req.user.id, status: { $in: ['requested', 'queued', 'processing'] } });
    if (active) return res.status(409).json({ error: 'A payout is already in progress' });
    const payout = await createPayout(req.user.id, req.body.bankAccountId);
    res.status(202).json({ success: true, data: payout, message: 'Withdrawal requested and awaiting admin approval' });
  } catch (error) {
    res.status(422).json({ error: error.response?.data?.message || error.message });
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

router.get('/products/:id', protect, seller, async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
  if (!product) return res.status(404).json({ error: 'Listing not found' });
  res.json({ success: true, data: product });
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
