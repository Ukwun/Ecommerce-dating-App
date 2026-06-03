const UserActivity = require('../models/UserActivity');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const SecurityLog = require('../models/SecurityLog');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const MonitoringMetric = require('../models/MonitoringMetric');

const aggregateDailySnapshot = async () => {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setHours(0, 0, 0, 0);

  const [events, activeUsers, eventBreakdown, orders, revenueAgg, paymentAgg, suspiciousEvents] = await Promise.all([
    UserActivity.countDocuments({ timestamp: { $gte: periodStart, $lte: periodEnd } }),
    UserActivity.distinct('userId', { timestamp: { $gte: periodStart, $lte: periodEnd } }),
    UserActivity.aggregate([
      { $match: { timestamp: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: '$activityType', total: { $sum: 1 } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: periodStart, $lte: periodEnd } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: periodStart, $lte: periodEnd }, 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Payment.aggregate([
      { $match: { createdAt: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    SecurityLog.countDocuments({
      createdAt: { $gte: periodStart, $lte: periodEnd },
      riskLevel: { $in: ['high', 'critical'] },
    }),
  ]);

  const eventMap = {};
  eventBreakdown.forEach((row) => {
    eventMap[row._id] = row.total;
  });

  const views = eventMap.product_view || 0;
  const addsToCart = eventMap.add_to_cart || 0;
  const checkouts = eventMap.checkout_start || 0;
  const purchases = eventMap.purchase || 0;

  const viewToCart = views > 0 ? addsToCart / views : 0;
  const cartToCheckout = addsToCart > 0 ? checkouts / addsToCart : 0;
  const checkoutToPurchase = checkouts > 0 ? purchases / checkouts : 0;

  const driftStatus = checkoutToPurchase < 0.2 && checkouts >= 10 ? 'warning' : 'ok';

  const paymentsSuccess = paymentAgg.find((x) => x._id === 'success')?.count || 0;
  const paymentsFailed = paymentAgg.find((x) => x._id === 'failed')?.count || 0;

  await AnalyticsSnapshot.findOneAndUpdate(
    { periodType: 'daily', periodStart },
    {
      periodType: 'daily',
      periodStart,
      periodEnd,
      totals: {
        activeUsers: activeUsers.length,
        events,
        orders,
        revenue: revenueAgg[0]?.total || 0,
        paymentsSuccess,
        paymentsFailed,
        suspiciousEvents,
      },
      eventBreakdown: eventMap,
    },
    { upsert: true, new: true }
  );

  await MonitoringMetric.create({
    source: 'analytics_aggregator',
    metricType: 'daily_snapshot_refreshed',
    status: 'ok',
    value: events,
    metadata: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      activeUsers: activeUsers.length,
    },
  });

  await MonitoringMetric.create({
    source: 'recommendation_engine',
    metricType: 'funnel_drift_signal',
    status: driftStatus,
    value: checkoutToPurchase,
    metadata: {
      views,
      addsToCart,
      checkouts,
      purchases,
      ratios: {
        viewToCart,
        cartToCheckout,
        checkoutToPurchase,
      },
    },
  });
};

const startAnalyticsAggregationJob = () => {
  const intervalMs = Number(process.env.ANALYTICS_AGGREGATION_INTERVAL_MS || 6 * 60 * 60 * 1000);

  aggregateDailySnapshot().catch((error) => {
    console.error('Initial analytics aggregation failed:', error.message);
  });

  setInterval(() => {
    aggregateDailySnapshot().catch((error) => {
      console.error('Scheduled analytics aggregation failed:', error.message);
      MonitoringMetric.create({
        source: 'analytics_aggregator',
        metricType: 'aggregation_failure',
        status: 'critical',
        value: 1,
        metadata: { error: error.message },
      }).catch(() => {});
    });
  }, intervalMs);

  console.log(`📊 Analytics aggregation job started (interval: ${intervalMs}ms)`);
};

module.exports = {
  aggregateDailySnapshot,
  startAnalyticsAggregationJob,
};
