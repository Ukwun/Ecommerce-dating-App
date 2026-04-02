const mongoose = require('mongoose');

const pushNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  notificationType: {
    type: String,
    enum: [
      'new_product',
      'price_drop',
      'back_in_stock',
      'order_status',
      'message',
      'rating_received',
      'seller_promo',
      'personalized_recommendation',
      'loyalty_reward',
      'system'
    ],
    required: true,
    index: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    description: 'ID of related resource (product, order, user, etc.)'
  },
  relatedType: {
    type: String,
    enum: ['product', 'order', 'user', 'message', 'promotion', 'none']
  },
  data: {
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    discount: Number,
    orderId: mongoose.Schema.Types.ObjectId,
    sellerId: mongoose.Schema.Types.ObjectId,
    category: String,
    imageUrl: String
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  readAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, { timestamps: true });

// TTL Index - auto-delete after 30 days
pushNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
pushNotificationSchema.index({ userId: 1, createdAt: -1 });
pushNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('PushNotification', pushNotificationSchema);
