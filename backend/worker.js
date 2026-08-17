require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const { bullConnection } = require('./config/redis');
const { aggregateDailySnapshot } = require('./jobs/analyticsAggregationJob');
const sendResendEmail = require('./utils/resendEmail');

const startWorker = async () => {
  if (!process.env.MONGO_URI || !process.env.REDIS_URL) throw new Error('MONGO_URI and REDIS_URL are required');
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: Number(process.env.WORKER_MONGO_POOL_SIZE || 10) });
  const worker = new Worker('marketplace-background', async job => {
    if (job.name === 'send-email') return sendResendEmail(job.data);
    if (job.name === 'aggregate-analytics') return aggregateDailySnapshot();
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
