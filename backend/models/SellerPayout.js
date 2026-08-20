const mongoose = require('mongoose');

const sellerPayoutSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  status: { type: String, enum: ['requested', 'queued', 'processing', 'success', 'failed', 'rejected', 'reversed'], default: 'requested', index: true },
  bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerBankAccount', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  reviewedAt: Date,
  rejectionReason: String,
  reference: { type: String, required: true, unique: true },
  recipientCode: String,
  transferCode: String,
  failureReason: String,
  processedAt: Date,
  reconciledAt: Date,
  activeKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });

sellerPayoutSchema.index({ seller: 1, createdAt: -1 });
module.exports = mongoose.model('SellerPayout', sellerPayoutSchema);
