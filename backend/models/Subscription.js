const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['paystack'], default: 'paystack' },
  planId: { type: String, required: true },
  planCode: { type: String, required: true },
  subscriptionCode: String,
  customerCode: String,
  emailToken: { type: String, select: false },
  status: { type: String, enum: ['pending', 'active', 'attention', 'non-renewing', 'cancelled', 'completed'], default: 'pending' },
  nextPaymentDate: Date,
  currentPeriodEnd: Date,
}, { timestamps: true });

subscriptionSchema.index({ user: 1, status: 1 });
module.exports = mongoose.model('Subscription', subscriptionSchema);
