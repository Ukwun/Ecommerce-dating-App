const express = require('express');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ✅ Add to wishlist
router.post('/wishlist', protect, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      user: req.user.id,
      product: productId
    });

    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    const wishlistItem = new Wishlist({
      user: req.user.id,
      product: productId
    });

    await wishlistItem.save();
    await wishlistItem.populate('product');

    res.status(201).json({
      success: true,
      message: 'Added to wishlist',
      data: wishlistItem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get user wishlist
router.get('/wishlist', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const wishlist = await Wishlist.find({ user: req.user.id })
      .populate('product')
      .sort({ addedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Wishlist.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      data: wishlist,
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

// ✅ Check if product in wishlist
router.get('/wishlist/:productId/check', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const item = await Wishlist.findOne({
      user: req.user.id,
      product: productId
    });

    res.json({
      success: true,
      inWishlist: !!item
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Remove from wishlist
router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const item = await Wishlist.findOneAndDelete({
      user: req.user.id,
      product: productId
    });

    if (!item) {
      return res.status(404).json({ error: 'Not in wishlist' });
    }

    res.json({
      success: true,
      message: 'Removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get wishlist count
router.get('/wishlist/count/all', protect, async (req, res) => {
  try {
    const count = await Wishlist.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
