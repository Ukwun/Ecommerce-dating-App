const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  username: String,
  
  // Action Details
  action: {
    type: String,
    enum: [
      'login',
      'logout',
      'login_failed',
      'password_changed',
      'password_reset_requested',
      'profile_updated',
      'product_created',
      'product_deleted',
      'order_created',
      'order_cancelled',
      'payment_initiated',
      'payment_verified',
      'return_requested',
      'support_ticket_created',
      'admin_action',
      'seller_verification_requested',
      'seller_approved',
      'seller_rejected',
      'unauthorized_access_attempt',
      'api_request',
      'api_key_generated',
      'api_key_deleted',
      'two_factor_enabled',
      'suspicious_activity_detected'
    ],
    required: true
  },
  
  // Action Details
  description: String,
  resourceType: {
    type: String,
    enum: ['user', 'product', 'order', 'payment', 'seller', 'admin', 'support']
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  
  // Request Details
  ipAddress: String,
  userAgent: String,
  method: String, // GET, POST, PUT, DELETE
  endpoint: String,
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'blocked'],
    default: 'success'
  },
  errorMessage: String,
  
  // Risk Level
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Geolocation (optional)
  country: String,
  city: String,
  latitude: Number,
  longitude: Number,
  
  // Device Info
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'api']
  },
  browser: String,
  
  // Session Info
  sessionId: String,
  deviceId: String,
  
  // Additional Data
  metadata: mongoose.Schema.Types.Mixed,
  
  // Alerting
  alertSent: { type: Boolean, default: false },
  alertedAt: Date,
  
  // Dates
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries and cleanup
securityLogSchema.index({ userId: 1 });
securityLogSchema.index({ action: 1 });
securityLogSchema.index({ timestamp: -1 });
securityLogSchema.index({ ipAddress: 1 });
securityLogSchema.index({ riskLevel: 1 });
securityLogSchema.index({ status: 1 });

// Auto-delete old logs after 90 days
securityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('SecurityLog', securityLogSchema);
