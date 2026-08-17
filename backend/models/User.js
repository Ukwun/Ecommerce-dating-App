const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String },
  emailVerified: { type: Boolean, default: false },
  authProviders: {
    google: { id: String },
    facebook: { id: String },
    apple: { id: String },
  },
  lastLoginAt: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  authVersion: { type: Number, default: 0, select: false },
  boostExpiresAt: Date,
  isPremium: { type: Boolean, default: false },
  subscriptionExpiresAt: Date,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  },
  pushToken: { type: String },
  accountStatus: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
  deletedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
