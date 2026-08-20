const mongoose = require('mongoose');

const sellerBankAccountSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bankName: { type: String, required: true, trim: true },
  bankCode: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  accountName: { type: String, required: true, trim: true },
  verified: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  recipientCode: String,
  recipientFingerprint: String,
}, { timestamps: true });

sellerBankAccountSchema.index({ seller: 1, bankCode: 1, accountNumber: 1 }, { unique: true });
module.exports = mongoose.model('SellerBankAccount', sellerBankAccountSchema);
