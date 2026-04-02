const express = require('express');
const router = express.Router();
const SellerRating = require('../models/SellerRating');
const PushNotification = require('../models/PushNotification');
const RecommendationEngine = require('../utils/RecommendationEngine');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /marketplace/api/sellers/rate
 * @desc    Rate a seller after purchase
 * @access  Private
 */
router.post('/sellers/rate', protect, async (req, res) => {
  try {
    const { sellerId, orderId, rating, comment, categories } = req.body;

    // Validate
    if (!sellerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seller ID or rating (must be 1-5)'
      });
    }

    // Check if already rated
    const existingRating = await SellerRating.findOne({
      buyer: req.user.id,
      seller: sellerId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this seller'
      });
    }

    // Create rating
    const sellerRating = await SellerRating.create({
      seller: sellerId,
      buyer: req.user.id,
      order: orderId,
      rating,
      comment: comment || null,
      categories: categories || {
        productQuality: rating,
        delivery: rating,
        communication: rating
      }
    });

    // Notify seller
    await PushNotification.create({
      userId: sellerId,
      title: 'New Seller Rating',
      body: `You received a ${rating}⭐ rating`,
      notificationType: 'rating_received',
      relatedId: sellerRating._id,
      relatedType: 'user',
      data: {
        buyerId: req.user.id,
        rating: rating,
        comment: comment
      }
    });

    res.status(201).json({
      success: true,
      data: sellerRating
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/sellers/:id/ratings
 * @desc    Get ratings for a specific seller
 * @access  Public
 */
router.get('/sellers/:id/ratings', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const ratings = await SellerRating.find({ seller: req.params.id })
      .populate('buyer', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SellerRating.countDocuments({ seller: req.params.id });

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: ratings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/sellers/:id/stats
 * @desc    Get seller statistics and average ratings
 * @access  Public
 */
router.get('/sellers/:id/stats', async (req, res) => {
  try {
    const stats = await RecommendationEngine.getSellerStats(req.params.id);

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
 * @route   GET /marketplace/api/sellers/top-rated
 * @desc    Get top-rated sellers
 * @access  Public
 */
router.get('/top-rated', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topSellers = await RecommendationEngine.getTopRatedSellers(Number(limit));

    res.json({
      success: true,
      data: topSellers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
