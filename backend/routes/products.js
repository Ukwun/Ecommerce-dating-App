const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { seller } = require('../middleware/admin');
const Review = require('../models/Review');

// Create new product
router.post('/products', protect, seller, async (req, res) => {
  try {
    const { name, description, price, oldPrice, category, stock, sizes, colors, images } = req.body;

    const product = await Product.create({
      seller: req.user.id,
      name,
      description,
      price,
      oldPrice,
      category,
      stock,
      sizes,
      colors,
      images
    });

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const { seller, page = 1, limit = 20, sort, search, category, minPrice, maxPrice, color, size } = req.query;
    const query = {};
    if (seller) query.seller = seller;

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Other filters
    if (category) query.category = category;
    if (color) query.colors = color;
    if (size) query.sizes = size;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort) {
      if (sort === 'price-asc') sortOption = { price: 1 };
      else if (sort === 'price-desc') sortOption = { price: -1 };
      else if (sort === 'rating-desc') sortOption = { ratings: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// Get single product
router.get('/products/:id', async (req, res) => {
  try {
    // Check for valid ID format to prevent "No product found" crashes
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID format' });
    }

    const product = await Product.findById(req.params.id)
      .populate('seller', 'name avatar businessName averageRating verified joinedDate')
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Alibaba Experience: Get reviews, but also similar products and seller performance
    const reviews = await Review.find({ product: req.params.id })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    // Cross-sell logic: Find items in the same category
    const similarItems = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    }).limit(6).select('name price images ratings');

    res.status(200).json({ 
      success: true, 
      data: { 
        ...product, 
        latestReviews: reviews,
        similarProducts: similarItems,
        shippingInfo: { estimatedDays: "3-5 days", cost: "Calculated at checkout" }
      } 
    });
  } catch (error) {
    console.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Update product
router.put('/products/:id', protect, async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure user is product owner
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this product' });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Delete product
router.delete('/products/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure user is product owner
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product removed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ Submit review for a product
router.post('/products/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Check if user already reviewed this product
    const Review = require('../models/Review');
    const existing = await Review.findOne({ product: req.params.id, user: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      product: req.params.id,
      user: req.user.id,
      rating: Number(rating),
      comment: comment || '',
    });

    // Recalculate product rating
    const reviews = await Review.find({ product: req.params.id });
    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    product.ratings = Math.round(avgRating * 10) / 10;
    product.numOfReviews = reviews.length;
    await product.save();

    const populated = await Review.findById(review._id).populate('user', 'name avatar');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
