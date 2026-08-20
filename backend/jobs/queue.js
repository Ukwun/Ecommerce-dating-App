const { Queue } = require('bullmq');
const { bullConnection } = require('../config/redis');

let backgroundQueue;
const getBackgroundQueue = () => {
  const connection = bullConnection();
  if (!connection) return null;
  if (!backgroundQueue) backgroundQueue = new Queue('marketplace-background', { connection });
  return backgroundQueue;
};

const enqueueEmail = async payload => {
  const queue = getBackgroundQueue();
  if (!queue) return false;
  await queue.add('send-email', payload, { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
  return true;
};

const enqueue = async (name, payload, options = {}) => {
  const queue = getBackgroundQueue();
  if (!queue) return false;
  await queue.add(name, payload, { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000, ...options });
  return true;
};

const enqueuePush = (payload, idempotencyKey) => enqueue('send-push', payload, idempotencyKey ? { jobId: idempotencyKey } : {});
const enqueueFraudReview = (payload, idempotencyKey) => enqueue('fraud-review', payload, idempotencyKey ? { jobId: idempotencyKey } : {});
const enqueueImageModeration = (payload, idempotencyKey) => enqueue('moderate-image', payload, idempotencyKey ? { jobId: idempotencyKey } : {});
const enqueueSettlement = (payload, idempotencyKey) => enqueue('create-settlement', payload, { delay: 1000, ...(idempotencyKey ? { jobId: idempotencyKey } : {}) });
const enqueuePayout = (payoutId) => enqueue('submit-payout', { payoutId }, { jobId: `payout-${payoutId}` });
const enqueueReservationRelease = (orderId, delay) => enqueue('release-inventory-reservation', { orderId }, { jobId: `reservation-${orderId}`, delay });

const scheduleAnalyticsAggregation = async () => {
  const queue = getBackgroundQueue();
  if (!queue) return false;
  const every = Number(process.env.ANALYTICS_AGGREGATION_INTERVAL_MS || 6 * 60 * 60 * 1000);
  await queue.upsertJobScheduler('analytics-snapshot-schedule', { every }, { name: 'aggregate-analytics', data: {}, opts: { attempts: 3, backoff: { type: 'exponential', delay: 10000 } } });
  return true;
};

module.exports = { enqueueEmail, enqueuePush, enqueueFraudReview, enqueueImageModeration, enqueueSettlement, enqueuePayout, enqueueReservationRelease, getBackgroundQueue, scheduleAnalyticsAggregation };
