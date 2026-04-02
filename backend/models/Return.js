const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    unique: true,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SellerProfile',
    required: true
  },
  
  // Return Product Details
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: Number,
    reason: String,
    condition: {
      type: String,
      enum: ['unopened', 'opened_unused', 'used', 'damaged'],
      required: true
    }
  }],
  
  // Return Reason
  reason: {
    type: String,
    enum: [
      'defective',
      'damaged_in_shipping',
      'not_as_described',
      'wrong_item',
      'missing_parts',
      'quality_issue',
      'changed_mind',
      'too_small',
      'too_large',
      'color_mismatch',
      'other'
    ],
    required: true
  },
  detailedReason: String,
  
  // Proof
  images: [String], // URLs to uploaded images
  video: String, // URL to uploaded video (optional)
  
  // Status Flow
  status: {
    type: String,
    enum: [
      'requested',
      'approved_by_seller',
      'rejected',
      'label_generated',
      'item_shipped_back',
      'item_received',
      'verified',
      'refund_approved',
      'refund_initiated',
      'refund_completed',
      'closed'
    ],
    default: 'requested'
  },
  
  // Timeline
  requestedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  rejectedAt: Date,
  refundInitiatedAt: Date,
  refundCompletedAt: Date,
  
  // Refund Details
  refundAmount: Number,
  originalPrice: Number,
  deduction: { type: Number, default: 0 }, // for wear and tear, if any
  finalRefundAmount: Number,
  refundMethod: {
    type: String,
    enum: ['original_payment', 'wallet', 'bank_transfer'],
    default: 'original_payment'
  },
  refundTransactionId: String,
  
  // Shipping
  returnShippingLabel: String, // URL to downloadable label
  returnShippingCarrier: String, // e.g., Maashi, Agiletrans
  returnTrackingNumber: String,
  itemReceivedDate: Date,
  
  // Admin Notes
  adminNotes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },
  
  // Seller Notes
  sellerNotes: String,
  
  // Quality Check
  qualityVerified: { type: Boolean, default: false },
  qualityNotes: String,
  
  // Dates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster queries
returnSchema.index({ orderId: 1 });
returnSchema.index({ buyerId: 1 });
returnSchema.index({ sellerId: 1 });
returnSchema.index({ status: 1 });
returnSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Return', returnSchema);
