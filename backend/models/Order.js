const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    default: () => `ORD-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-8)}`
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    }
  }],
  fulfillments: [{
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      totalPrice: { type: Number, required: true }
    }],
    subtotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending'
    },
    trackingNumber: String,
    carrier: String,
    shippedAt: Date,
    deliveredAt: Date
  }],
  shippingAddress: {
    name: String,
    addressLine1: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  subtotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'paystack'],
      default: 'paystack'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paystackRef: String,
    paidAt: Date
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  notes: String,
  inventoryReservationStatus: {
    type: String,
    enum: ['reserved', 'committed', 'released'],
    default: 'reserved'
  },
  inventoryReservationExpiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000)
  },
  driverRating: {
    type: Number,
    min: 1,
    max: 5
  },
  driverFeedback: String,
  driverTip: {
    type: Number,
    default: 0
  },
  issueReported: {
    type: Boolean,
    default: false
  },
  issueDescription: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
module.exports = mongoose.model('Order', orderSchema);
