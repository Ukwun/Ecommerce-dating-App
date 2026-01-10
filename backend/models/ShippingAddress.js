const mongoose = require('mongoose');

const shippingAddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  addressLine1: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  postalCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'Nigeria'
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  distanceFromWarehouse: {
    type: Number,
    description: 'Distance in kilometers from warehouse'
  },
  estimatedDeliveryPrice: {
    type: Number,
    description: 'Calculated delivery price based on distance'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
shippingAddressSchema.index({ userId: 1 });
shippingAddressSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model('ShippingAddress', shippingAddressSchema);
