const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// Create new product
router.post('/products', protect, async (req, res) => {
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
    const product = await Product.findById(req.params.id).populate('seller', 'name avatar');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
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

module.exports = router;