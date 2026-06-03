const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema({
  periodType: {
    type: String,
    enum: ['hourly', 'daily'],
    required: true,
    index: true,
  },
  periodStart: {
    type: Date,
    required: true,
    index: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  totals: {
    activeUsers: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    paymentsSuccess: { type: Number, default: 0 },
    paymentsFailed: { type: Number, default: 0 },
    suspiciousEvents: { type: Number, default: 0 },
  },
  eventBreakdown: {
    type: Map,
    of: Number,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

analyticsSnapshotSchema.index({ periodType: 1, periodStart: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
