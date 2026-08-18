const mongoose = require('mongoose');

const sellerLedgerEntrySchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  payout: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerPayout', index: true },
  kind: { type: String, enum: ['sale', 'commission', 'reserve', 'reserve_release', 'refund', 'payout'], required: true },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  status: { type: String, enum: ['pending', 'available', 'held', 'paid', 'reversed'], required: true },
  availableAt: Date,
  idempotencyKey: { type: String, required: true, unique: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

sellerLedgerEntrySchema.index({ seller: 1, status: 1, availableAt: 1 });
sellerLedgerEntrySchema.index({ order: 1, seller: 1 });

module.exports = mongoose.model('SellerLedgerEntry', sellerLedgerEntrySchema);
