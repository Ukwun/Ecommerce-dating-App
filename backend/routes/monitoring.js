const express = require('express');
const MonitoringMetric = require('../models/MonitoringMetric');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { protect, adminWithPermission } = require('../middleware/admin');

const router = express.Router();

router.get('/summary', protect, adminWithPermission('view_analytics'), async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [latestSnapshot, latestMetrics, criticalCount24h, bySource] = await Promise.all([
      AnalyticsSnapshot.findOne({ periodType: 'daily' }).sort({ periodStart: -1 }),
      MonitoringMetric.find().sort({ createdAt: -1 }).limit(50),
      MonitoringMetric.countDocuments({
        status: 'critical',
        createdAt: { $gte: last24h },
      }),
      MonitoringMetric.aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        { $group: { _id: '$source', total: { $sum: 1 }, critical: { $sum: { $cond: [{ $eq: ['$status', 'critical'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        latestSnapshot,
        latestMetrics,
        criticalCount24h,
        bySource,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
