const express = require('express');
const ShippingAddress = require('../models/ShippingAddress');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Constants for delivery pricing
const WAREHOUSE_LAT = 6.5244;  // Lagos, Nigeria
const WAREHOUSE_LNG = 3.3792;
const BASE_DELIVERY_PRICE = 1000; // ₦1000
const PRICE_PER_KM = 50; // ₦50 per kilometer

// Calculate distance using Haversine formula (in kilometers)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate delivery price based on distance
const calculateDeliveryPrice = (distance) => {
  if (distance <= 1) return BASE_DELIVERY_PRICE;
  return BASE_DELIVERY_PRICE + Math.ceil(distance - 1) * PRICE_PER_KM;
};

// ✅ Create/Update shipping address with location pin
router.post('/shipping-address', authMiddleware, async (req, res) => {
  try {
    const { name, addressLine1, city, state, postalCode, country, latitude, longitude, isDefault, _id } = req.body;
    const userId = req.user.id;

    // Validate coordinates
    if (!latitude || !longitude || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    // Calculate distance and delivery price
    const distance = calculateDistance(WAREHOUSE_LAT, WAREHOUSE_LNG, latitude, longitude);
    const estimatedDeliveryPrice = calculateDeliveryPrice(distance);

    let shippingAddress;

    if (_id) {
      // Update existing address
      shippingAddress = await ShippingAddress.findByIdAndUpdate(
        _id,
        {
          name,
          addressLine1,
          city,
          state,
          postalCode,
          country,
          latitude,
          longitude,
          isDefault,
          distanceFromWarehouse: distance,
          estimatedDeliveryPrice,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!shippingAddress) {
        return res.status(404).json({ error: 'Shipping address not found' });
      }
    } else {
      // Create new address
      shippingAddress = new ShippingAddress({
        userId,
        name,
        addressLine1,
        city,
        state,
        postalCode,
        country,
        latitude,
        longitude,
        isDefault,
        distanceFromWarehouse: distance,
        estimatedDeliveryPrice
      });

      await shippingAddress.save();
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await ShippingAddress.updateMany(
        { userId, _id: { $ne: shippingAddress._id } },
        { isDefault: false }
      );
    }

    res.status(isDefault && !_id ? 201 : 200).json({
      success: true,
      message: _id ? 'Address updated successfully' : 'Address created successfully',
      data: shippingAddress
    });
  } catch (error) {
    console.error('Error saving shipping address:', error);
    res.status(500).json({ error: error.message || 'Failed to save shipping address' });
  }
});

// ✅ Get all shipping addresses for user
router.get('/shipping-addresses', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await ShippingAddress.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch shipping addresses' });
  }
});

// ✅ Get default shipping address
router.get('/shipping-addresses/default', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const defaultAddress = await ShippingAddress.findOne({ userId, isDefault: true });
    
    res.json({
      success: true,
      data: defaultAddress || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch default address' });
  }
});

// ✅ Get single shipping address
router.get('/shipping-addresses/:id', authMiddleware, async (req, res) => {
  try {
    const address = await ShippingAddress.findById(req.params.id);
    
    if (!address || address.userId.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch address' });
  }
});

// ✅ Delete shipping address
router.delete('/shipping-addresses/:id', authMiddleware, async (req, res) => {
  try {
    const address = await ShippingAddress.findById(req.params.id);
    
    if (!address || address.userId.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const wasDefault = address.isDefault;
    await ShippingAddress.findByIdAndDelete(req.params.id);

    // If deleted address was default, set another as default
    if (wasDefault) {
      const nextAddress = await ShippingAddress.findOne({ userId: req.user.id });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete address' });
  }
});

// ✅ Calculate delivery price for coordinates
router.post('/calculate-delivery-price', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const distance = calculateDistance(WAREHOUSE_LAT, WAREHOUSE_LNG, latitude, longitude);
    const price = calculateDeliveryPrice(distance);

    res.json({
      success: true,
      data: {
        distanceFromWarehouse: distance,
        estimatedDeliveryPrice: price
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to calculate delivery price' });
  }
});

module.exports = router;
