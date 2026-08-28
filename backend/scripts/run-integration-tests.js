const { spawnSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function deriveDedicatedTestUri(mongoUri) {
  const uri = new URL(mongoUri);
  const databaseName = process.env.TEST_MONGO_DATABASE || 'bizmingle_integration_test';
  if (!/test/i.test(databaseName)) throw new Error('TEST_MONGO_DATABASE must contain "test"');
  uri.pathname = `/${databaseName}`;
  return uri.toString();
}

const explicitTestUri = process.env.TEST_MONGO_URI;
const mongoUri = explicitTestUri || (process.env.MONGO_URI && deriveDedicatedTestUri(process.env.MONGO_URI));
if (!mongoUri || !/test/i.test(new URL(mongoUri).pathname)) {
  throw new Error('A dedicated TEST_MONGO_URI or MONGO_URI is required to run integration tests');
}

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'test/critical-flows.test.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, TEST_MONGO_URI: mongoUri },
});
process.exit(result.status ?? 1);
