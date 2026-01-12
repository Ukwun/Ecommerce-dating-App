const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  boostExpiresAt: Date,
  isPremium: { type: Boolean, default: false },
  subscriptionExpiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);