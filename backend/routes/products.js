const express = require('express');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ✅ Create product (seller only)
router.post('/products', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, price, originalPrice, stock, images, thumbnail, specifications, tags } = req.body;

    if (!title || !description || !category || !price || !images || !thumbnail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const product = new Product({
      title,
      description,
      category,
      price,
      originalPrice: originalPrice || price,
      stock,
      images,
      thumbnail,
      specifications,
      tags,
      seller: req.user.id,
      inStock: stock > 0
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all products with filters
router.get('/products', async (req, res) => {
  try {
    const { category, search, sortBy, page = 1, limit = 20, featured } = req.query;

    let query = {};
    if (category) query.category = category;
    if (featured) query.featured = true;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    let sortOptions = {};
    switch (sortBy) {
      case 'price-asc':
        sortOptions = { price: 1 };
        break;
      case 'price-desc':
        sortOptions = { price: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      default:
        sortOptions = { featured: -1, createdAt: -1 };
    }

    const products = await Product.find(query)
      .populate('seller', 'name avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
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

// ✅ Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller', 'name avatar email');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update product
router.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete product
router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category })
      .populate('seller', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get featured products
router.get('/featured/all', async (req, res) => {
  try {
    const products = await Product.find({ featured: true })
      .populate('seller', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
