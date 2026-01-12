const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { protect } = require('../middleware/auth');

// Get reviews for a product
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Add a review
router.post('/', protect, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      rating,
      comment
    });
    
    // Populate user details for immediate frontend display
    await review.populate('user', 'name avatar');

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;