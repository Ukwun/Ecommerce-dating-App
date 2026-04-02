const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityType: {
    type: String,
    enum: ['product_view', 'product_search', 'add_to_cart', 'purchase', 'add_favorite', 'remove_favorite', 'product_click', 'seller_view', 'category_browse'],
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  searchQuery: String,
  category: String,
  price: Number,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    duration: Number, // How long user viewed product (in seconds)
    ipAddress: String,
    deviceInfo: String,
    referrer: String
  }
}, { timestamps: false });

// Index for quick lookups
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ userId: 1, activityType: 1, timestamp: -1 });
userActivitySchema.index({ productId: 1, userId: 1 });

// TTL index - keep activity data for 90 days
userActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('UserActivity', userActivitySchema);
