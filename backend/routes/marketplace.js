const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const UserActivity = require('../models/UserActivity');
const RecommendationEngine = require('../utils/RecommendationEngine');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /marketplace/api/activity/log
 * @desc    Log user activity (view, search, favorite, purchase, etc.)
 * @access  Private
 */
router.post('/activity/log', protect, async (req, res) => {
  try {
    const { activityType, productId, sellerId, searchQuery, category, price, metadata } = req.body;

    const activity = await UserActivity.create({
      userId: req.user.id,
      activityType,
      productId: productId || null,
      sellerId: sellerId || null,
      searchQuery: searchQuery || null,
      category: category || null,
      price: price || null,
      metadata: metadata || {}
    });

    res.status(201).json({
      success: true,
      activity
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/discover
 * @desc    Get personalized product discovery for user
 * @access  Private
 */
router.get('/discover', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get personalized recommendations
    const personalizedProducts = await RecommendationEngine.getPersonalizedProducts(
      req.user.id,
      limit * 2 // Fetch more to ensure variety
    );

    // If not enough personalized products, supplement with trending
    let recommendedProducts = personalizedProducts;
    if (personalizedProducts.length < limit) {
      const trendingProducts = await RecommendationEngine.getTrendingProducts(limit);
      recommendedProducts = [
        ...personalizedProducts,
        ...trendingProducts.filter(p => !personalizedProducts.find(pp => pp._id.toString() === p._id.toString()))
      ].slice(0, limit);
    } else {
      recommendedProducts = personalizedProducts.slice(0, limit);
    }

    // Get total count of available products
    const totalProducts = await Product.countDocuments({ stock: { $gt: 0 } });
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      page,
      limit,
      totalPages,
      data: recommendedProducts,
      hasMore: page < totalPages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/products/trending
 * @desc    Get trending products in the last 7 days
 * @access  Public
 */
router.get('/products/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const trendingProducts = await RecommendationEngine.getTrendingProducts(Number(limit));

    res.json({
      success: true,
      data: trendingProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/products/:id/similar
 * @desc    Get similar products to a specific product
 * @access  Public
 */
router.get('/products/:id/similar', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const similarProducts = await RecommendationEngine.getSimilarProducts(
      req.params.id,
      Number(limit)
    );

    res.json({
      success: true,
      data: similarProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/products/search
 * @desc    Search for products with logging
 * @access  Private
 */
router.get('/products/search', protect, async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sortBy = 'relevance', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Log search activity
    if (q) {
      await UserActivity.create({
        userId: req.user.id,
        activityType: 'product_search',
        searchQuery: q,
        metadata: { searchTerm: q }
      });
    }

    // Build search query
    const searchQuery = {};
    if (q) {
      searchQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }

    if (category) {
      searchQuery.category = category;
    }

    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = Number(minPrice);
      if (maxPrice) searchQuery.price.$lte = Number(maxPrice);
    }

    searchQuery.stock = { $gt: 0 };

    // Determine sort order
    let sortObj = {};
    switch (sortBy) {
      case 'price_asc':
        sortObj = { price: 1 };
        break;
      case 'price_desc':
        sortObj = { price: -1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'rating':
        sortObj = { ratings: -1, numOfReviews: -1 };
        break;
      default:
        sortObj = { ratings: -1 };
    }

    const products = await Product.find(searchQuery)
      .populate('seller', 'name avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      page,
      limit,
      totalProducts,
      totalPages,
      data: products,
      hasMore: page < totalPages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/user/stats
 * @desc    Get user activity stats
 * @access  Private
 */
router.get('/user/stats', protect, async (req, res) => {
  try {
    const stats = await RecommendationEngine.getUserStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/products/by-category/:category
 * @desc    Get products by category
 * @access  Public
 */
router.get('/products/by-category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const products = await Product.find({
      category: { $regex: req.params.category, $options: 'i' },
      stock: { $gt: 0 }
    })
      .populate('seller', 'name avatar')
      .sort({ ratings: -1, numOfReviews: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments({
      category: { $regex: req.params.category, $options: 'i' },
      stock: { $gt: 0 }
    });

    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      page,
      limit,
      totalProducts,
      totalPages,
      data: products,
      hasMore: page < totalPages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
