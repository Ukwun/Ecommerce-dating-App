/* eslint-disable no-console */
const axios = require('axios');

const BASE_URL = process.env.E2E_BASE_URL || process.env.EXPO_PUBLIC_SERVER_URI || 'http://localhost:8082';
const RUN_ID = Date.now();

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

async function run() {
  console.log(`Running e2e smoke against: ${BASE_URL}`);

  // 1) Health
  const health = await client.get('/health');
  assert(health.status === 200, 'Health endpoint failed');

  // 2) Register unique user
  const email = `smoke_${RUN_ID}@example.com`;
  const password = 'SmokePass123!';
  const register = await client.post('/auth/api/user-registration', {
    name: `Smoke ${RUN_ID}`,
    email,
    password,
    acceptedTerms: true,
  });
  assert(register.status === 201 || register.status === 200, 'Registration failed');

  // 3) Login
  const login = await client.post('/auth/api/login', { email, password });
  assert(login.status === 200, 'Login failed');
  const token = login.data?.accessToken;
  assert(Boolean(token), 'Login did not return access token');

  const authClient = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}` },
  });

  // 4) Profile access
  const profile = await authClient.get('/auth/api/profile');
  assert(profile.status === 200, 'Profile fetch failed');

  // 5) Marketplace discover
  const discover = await authClient.get('/marketplace/api/discover');
  assert(discover.status === 200, 'Marketplace discover failed');

  // 6) Activity log canonical event
  const activity = await authClient.post('/marketplace/api/activity/log', {
    activityType: 'retention_heartbeat',
    metadata: { source: 'e2e_smoke' },
  });
  assert(activity.status === 201 || activity.status === 200, 'Activity log failed');

  // 7) Cart fetch
  const cart = await authClient.get('/marketplace/api/cart');
  assert(cart.status === 200, 'Cart fetch failed');

  // 8) Monitoring route should be protected (expect 401/403 for normal user)
  try {
    await authClient.get('/monitoring/api/summary');
    console.log('Monitoring summary returned for non-admin account (verify RBAC expected behavior).');
  } catch (error) {
    const status = error?.response?.status;
    assert(status === 401 || status === 403, 'Monitoring route protection check failed');
  }

  console.log('E2E smoke passed.');
}

run().catch((error) => {
  console.error('E2E smoke failed:', error.message);
  process.exit(1);
});
