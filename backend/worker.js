require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const { bullConnection } = require('./config/redis');
const { aggregateDailySnapshot } = require('./jobs/analyticsAggregationJob');
const sendResendEmail = require('./utils/resendEmail');
const { Expo } = require('expo-server-sdk');
const { evaluateAbuseRisk } = require('./utils/fraudMonitor');
const { createSettlementEntries, submitPayout } = require('./services/sellerSettlement');
const { RekognitionClient, DetectModerationLabelsCommand } = require('@aws-sdk/client-rekognition');
const UploadedAsset = require('./models/UploadedAsset');
const Order = require('./models/Order');
const Product = require('./models/Product');

const releaseInventoryReservation = async ({ orderId }) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, inventoryReservationStatus: 'reserved', 'payment.status': { $ne: 'completed' }, inventoryReservationExpiresAt: { $lte: new Date() } },
    { $set: { inventoryReservationStatus: 'released' } },
    { new: false }
  );
  if (!order) return { released: false };
  await Promise.all(order.products.map(item => Product.updateOne(
    { _id: item.product },
    { $inc: { reservedStock: -item.quantity } }
  )));
  return { released: true, orderId };
};

const expo = new Expo();
const processPush = async ({ message }) => {
  if (!message?.to || !Expo.isExpoPushToken(message.to)) return { skipped: true };
  const tickets = await expo.sendPushNotificationsAsync([message]);
  if (tickets[0]?.status === 'error') throw new Error(tickets[0].message || 'Expo push rejected');
  return tickets[0];
};
const moderateImage = async ({ imageUrl, assetId }) => {
  if (!process.env.AWS_REGION) throw new Error('Image moderation is not configured');
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Unable to download image for moderation');
  const client = new RekognitionClient({ region: process.env.AWS_REGION });
  const result = await client.send(new DetectModerationLabelsCommand({ Image: { Bytes: Buffer.from(await response.arrayBuffer()) }, MinConfidence: Number(process.env.IMAGE_MODERATION_MIN_CONFIDENCE || 80) }));
  const labels = result.ModerationLabels || [];
  const approved = !labels.some(label => Number(label.Confidence) >= Number(process.env.IMAGE_MODERATION_MIN_CONFIDENCE || 80));
  await UploadedAsset.findByIdAndUpdate(assetId, { moderationStatus: approved ? 'approved' : 'rejected', moderationLabels: labels.map(label => ({ name: label.Name, confidence: label.Confidence })) });
  return { approved, labels };
};

const startWorker = async () => {
  if (!process.env.MONGO_URI || !process.env.REDIS_URL) throw new Error('MONGO_URI and REDIS_URL are required');
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: Number(process.env.WORKER_MONGO_POOL_SIZE || 10) });
  const worker = new Worker('marketplace-background', async job => {
    if (job.name === 'send-email') return sendResendEmail(job.data);
    if (job.name === 'aggregate-analytics') return aggregateDailySnapshot();
    if (job.name === 'send-push') return processPush(job.data);
    if (job.name === 'fraud-review') return evaluateAbuseRisk(job.data);
    if (job.name === 'moderate-image') return moderateImage(job.data);
    if (job.name === 'create-settlement') return createSettlementEntries(job.data);
    if (job.name === 'submit-payout') return submitPayout(job.data.payoutId);
    if (job.name === 'release-inventory-reservation') return releaseInventoryReservation(job.data);
    throw new Error(`Unknown background job: ${job.name}`);
  }, { connection: bullConnection(), concurrency: Number(process.env.WORKER_CONCURRENCY || 10) });
  worker.on('failed', (job, error) => console.error(`Job ${job?.id || 'unknown'} failed:`, error.message));
  worker.on('error', error => console.error('Worker error:', error.message));
  const shutdown = async () => { await worker.close(); await mongoose.disconnect(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  console.log('Background worker started');
};

startWorker().catch(error => { console.error('Worker startup failed:', error.message); process.exit(1); });
