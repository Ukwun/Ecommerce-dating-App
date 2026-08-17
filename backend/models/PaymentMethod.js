const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['paystack'], default: 'paystack' },
  authorizationCode: { type: String, required: true, select: false },
  signature: { type: String, required: true },
  email: { type: String, required: true },
  cardType: String,
  brand: String,
  last4: String,
  expMonth: String,
  expYear: String,
  bank: String,
  countryCode: String,
  reusable: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

paymentMethodSchema.index({ user: 1, signature: 1 }, { unique: true });
module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
