const { createClient } = require('redis');

let client;
let ready;
if (process.env.REDIS_URL) {
  client = createClient({ url: process.env.REDIS_URL });
  client.on('error', error => console.error('Cache Redis error:', error.message));
  ready = client.connect();
}

const withClient = async operation => {
  if (!client) return null;
  try {
    await ready;
    return await operation(client);
  } catch (error) {
    console.error('Cache operation failed:', error.message);
    return null;
  }
};

const getJson = key => withClient(async redis => {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
});

const setJson = (key, value, ttlSeconds = 20) => withClient(redis =>
  redis.set(key, JSON.stringify(value), { EX: ttlSeconds })
);

const getProductCacheVersion = async () => Number(await withClient(redis => redis.get('cache:products:version')) || 1);
const invalidateProductCache = () => withClient(redis => redis.incr('cache:products:version'));

module.exports = { getJson, setJson, getProductCacheVersion, invalidateProductCache };
