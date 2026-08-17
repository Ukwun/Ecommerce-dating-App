const autocannon = require('autocannon');

const baseUrl = String(process.env.LOAD_TEST_URL || '').replace(/\/$/, '');
if (!baseUrl || (baseUrl.includes('onrender.com') && process.env.ALLOW_PRODUCTION_LOAD_TEST !== 'true')) {
  throw new Error('Set LOAD_TEST_URL and explicitly set ALLOW_PRODUCTION_LOAD_TEST=true for production targets');
}

const connections = Number(process.env.LOAD_TEST_CONNECTIONS || 25);
const duration = Number(process.env.LOAD_TEST_DURATION_SECONDS || 30);
const maxP99 = Number(process.env.LOAD_TEST_MAX_P99_MS || 2000);

const run = path => new Promise((resolve, reject) => {
  autocannon({ url: `${baseUrl}${path}`, connections, duration }, (error, result) => {
    if (error) return reject(error);
    const total = result.requests.total || 0;
    const failures = (result.non2xx || 0) + (result.errors || 0) + (result.timeouts || 0);
    const failureRate = total ? failures / total : 1;
    console.log(JSON.stringify({
      path,
      connections,
      duration,
      requests: total,
      requestsPerSecond: result.requests.average,
      latencyP50: result.latency.p50,
      latencyP99: result.latency.p99,
      failureRate,
    }));
    if (failureRate > 0.01 || result.latency.p99 > maxP99) {
      return reject(new Error(`${path} breached its production load-test threshold`));
    }
    resolve(result);
  });
});

(async () => {
  await run('/health');
  await run('/marketplace/api/products?limit=20');
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
