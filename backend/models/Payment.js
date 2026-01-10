const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['paystack', 'card', 'bank_transfer', 'wallet'],
    required: true
  },
  paystack: {
    accessCode: String,
    authorizationUrl: String,
    reference: String,
    authorizationCode: String,
    cardType: String,
    last4: String
  },
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  errorMessage: String,
  failureReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
  verifiedAt: Date
}, { timestamps: true });

// Indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ 'paystack.reference': 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
