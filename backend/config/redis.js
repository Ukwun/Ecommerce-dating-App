const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const attachRedisAdapter = async (io) => {
  if (!process.env.REDIS_URL) {
    if (process.env.REQUIRE_REDIS === 'true') throw new Error('REDIS_URL is required');
    console.warn('Redis is not configured; Socket.IO is limited to one server instance');
    return null;
  }
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  pubClient.on('error', error => console.error('Redis publisher error:', error.message));
  subClient.on('error', error => console.error('Redis subscriber error:', error.message));
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.IO Redis adapter connected');
  return { pubClient, subClient };
};

const bullConnection = () => {
  if (!process.env.REDIS_URL) return null;
  const url = new URL(process.env.REDIS_URL);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined, password: url.password || undefined, tls: url.protocol === 'rediss:' ? {} : undefined, maxRetriesPerRequest: null };
};

module.exports = { attachRedisAdapter, bullConnection };
