const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');
const { EVENT_TYPES } = require('../constants/eventTaxonomy');
const { trackUserEvent } = require('../utils/eventLogger');

const router = express.Router();

// ✅ Get user cart
router.get('/cart', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: []
      });
      await cart.save();
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Add item to cart
router.post('/cart/items', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(item => item.product.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.price
      });
    }

    // Recalculate totals
    cart.calculateTotals();
    await cart.save();

    await cart.populate('items.product');

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });

    await trackUserEvent({
      userId: req.user.id,
      eventType: EVENT_TYPES.ADD_TO_CART,
      productId,
      category: product.category,
      price: product.price,
      metadata: { quantity },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update cart item quantity
router.put('/cart/items/:productId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const item = cart.items.find(item => item.product.toString() === productId);

    if (!item) {
      return res.status(404).json({ error: 'Item not in cart' });
    }

    if (quantity === 0) {
      cart.items = cart.items.filter(item => item.product.toString() !== productId);
      await trackUserEvent({
        userId: req.user.id,
        eventType: EVENT_TYPES.REMOVE_FROM_CART,
        productId,
        metadata: { reason: 'quantity_set_to_zero' },
      });
    } else {
      item.quantity = quantity;
      await trackUserEvent({
        userId: req.user.id,
        eventType: EVENT_TYPES.ADD_TO_CART,
        productId,
        price: item.price,
        metadata: { quantity, source: 'cart_update' },
      });
    }

    cart.calculateTotals();
    await cart.save();
    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Cart updated',
      data: cart
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Remove item from cart
router.delete('/cart/items/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    await trackUserEvent({
      userId: req.user.id,
      eventType: EVENT_TYPES.REMOVE_FROM_CART,
      productId,
      metadata: { reason: 'manual_remove' },
    });

    cart.calculateTotals();
    await cart.save();
    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Clear entire cart
router.delete('/cart', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = [];
    cart.calculateTotals();
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Apply coupon code
router.post('/cart/coupon', protect, async (req, res) => {
  try {
    const { couponCode } = req.body;
    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code required' });
    }
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon' });
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    const cartTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
      return res.status(400).json({ error: `Minimum order value for this coupon is ₦${coupon.minOrderValue}` });
    }
    let discount = 0;
    if (coupon.discountType === 'percent') {
      discount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }
    // Prevent over-discount
    if (discount > cartTotal) discount = cartTotal;
    // Mark coupon as used (increment usedCount)
    coupon.usedCount += 1;
    await coupon.save();
    // Attach coupon info to cart (optional: save to cart)
    cart.coupon = {
      code: coupon.code,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    };
    cart.totalAfterDiscount = cartTotal - discount;
    await cart.save();
    res.json({
      success: true,
      message: 'Coupon applied',
      discount,
      totalAfterDiscount: cart.totalAfterDiscount,
      coupon: cart.coupon
    });

    await trackUserEvent({
      userId: req.user.id,
      eventType: EVENT_TYPES.CHECKOUT_START,
      metadata: {
        couponCode: coupon.code,
        discount,
        totalAfterDiscount: cart.totalAfterDiscount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
