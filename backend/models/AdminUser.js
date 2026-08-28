const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Role-based access
  role: {
    type: String,
    enum: [
      'super_admin',      // Full access to everything
      'seller_reviewer',  // Can review and approve sellers
      'support_agent',    // Can handle support tickets
      'analytics_viewer', // Can view analytics but not modify
      'content_moderator' // Can moderate product listings
    ],
    required: true
  },
  
  // Permissions (more granular control)
  permissions: [{
    type: String,
    enum: [
      'approve_sellers',
      'reject_sellers',
      'suspend_sellers',
      'view_seller_details',
      'process_returns',
      'approve_refunds',
      'handle_disputes',
      'respond_support_tickets',
      'view_analytics',
      'view_reports',
      'manage_users',
      'manage_admins',
      'manage_products',
      'manage_orders',
      'manage_payments',
      'manage_security',
      'view_audit_logs',
      'manage_promotions'
    ]
  }],
  
  // Admin Details
  department: String,
  phoneNumber: String,
  adminLevel: {
    type: Number,
    default: 1 // 1 = junior, 2 = senior, 3 = manager
  },
  
  // Activity Tracking
  totalTicketsResolved: { type: Number, default: 0 },
  totalSellersReviewed: { type: Number, default: 0 },
  averageResponseTime: { type: Number, default: 0 }, // in minutes
  
  // Status
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: String,
  
  // Login Tracking
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  
  // Security
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  
  // Dates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster queries
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ isActive: 1 });

module.exports = mongoose.model('AdminUser', adminUserSchema);
