const UserActivity = require('../models/UserActivity');
const MonitoringMetric = require('../models/MonitoringMetric');
const { isValidEventType } = require('../constants/eventTaxonomy');

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return {};
  const clone = { ...metadata };
  if (clone.password) clone.password = '***';
  if (clone.token) clone.token = '***';
  if (clone.authorization) clone.authorization = '***';
  return clone;
};

const trackUserEvent = async ({
  userId,
  eventType,
  productId = null,
  sellerId = null,
  searchQuery = null,
  category = null,
  price = null,
  metadata = {},
}) => {
  if (!userId || !eventType || !isValidEventType(eventType)) {
    return null;
  }

  try {
    return await UserActivity.create({
      userId,
      activityType: eventType,
      productId,
      sellerId,
      searchQuery,
      category,
      price,
      metadata: sanitizeMetadata(metadata),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('trackUserEvent error:', error.message);
    await MonitoringMetric.create({
      source: 'event_logger',
      metricType: 'event_write_failure',
      status: 'warning',
      value: 1,
      metadata: {
        userId: String(userId),
        eventType,
        error: error.message,
      },
    }).catch(() => {});
    return null;
  }
};

module.exports = {
  trackUserEvent,
};
