const mongoose = require('mongoose');

const sellerAnalyticsSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SellerProfile',
    required: true,
    unique: true
  },
  
  // Overview Stats
  totalOrders: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 }, // In currency
  totalProducts: { type: Number, default: 0 },
  activeProducts: { type: Number, default: 0 },
  
  // Revenue Stats
  grossRevenue: { type: Number, default: 0 }, // Total sales
  netRevenue: { type: Number, default: 0 }, // After commission
  commissionPaid: { type: Number, default: 0 },
  refundsProcessed: { type: Number, default: 0 },
  
  // Performance Metrics
  conversionRate: { type: Number, default: 0 }, // percentage
  averageOrderValue: { type: Number, default: 0 },
  averageProductRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  
  // Operational Metrics
  returnRate: { type: Number, default: 0 }, // percentage
  refundRate: { type: Number, default: 0 }, // percentage
  disputeRate: { type: Number, default: 0 }, // percentage
  cancellationRate: { type: Number, default: 0 }, // percentage
  
  // Customer Service Metrics
  averageResponseTime: { type: Number, default: 0 }, // in hours
  supportTicketsResolved: { type: Number, default: 0 },
  customerSatisfactionScore: { type: Number, default: 0, min: 0, max: 100 },
  
  // Traffic & Engagement
  profileViews: { type: Number, default: 0 },
  productSearchImpressions: { type: Number, default: 0 },
  productClicks: { type: Number, default: 0 },
  addToCartCount: { type: Number, default: 0 },
  
  // Top Products
  topProducts: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    sales: Number,
    revenue: Number,
    rating: Number
  }],
  
  // Daily Revenue Trend
  dailyRevenue: [
    {
      date: Date,
      orders: Number,
      revenue: Number,
      units: Number
    }
  ],
  
  // Monthly Breakdown
  monthlyRevenue: [
    {
      month: String, // "2026-02"
      orders: Number,
      revenue: Number,
      refunds: Number,
      netRevenue: Number
    }
  ],
  
  // Category Performance
  categoryPerformance: [
    {
      category: String,
      orders: Number,
      revenue: Number,
      rating: Number
    }
  ],
  
  // Geographic Data (if applicable)
  topCities: [
    {
      city: String,
      orders: Number,
      revenue: Number
    }
  ],
  
  // Customer Retention
  repeatCustomers: { type: Number, default: 0 },
  repeatPurchaseRate: { type: Number, default: 0 }, // percentage
  
  // Dates
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
sellerAnalyticsSchema.index({ sellerId: 1 });
sellerAnalyticsSchema.index({ lastUpdated: 1 });

module.exports = mongoose.model('SellerAnalytics', sellerAnalyticsSchema);
