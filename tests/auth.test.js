const assert = require('assert');
const auth = require('../src/agents/auth');
const store = require('../src/agents/store');

async function runTests() {
  if (store.hasDatabaseUrl()) {
    console.log('Auth hash test skipped when DATABASE_URL is configured.');
    return;
  }

  const registered = await auth.registerUser({ name: 'Auth Test', password: 'correct horse battery staple' });
  const stored = await store.getUserByApiKey(registered.api_key);

  assert.ok(registered.api_key.startsWith('cf_'));
  assert.ok(stored);
  assert.strictEqual(stored.api_key, undefined);
  assert.strictEqual(typeof stored.api_key_hash, 'string');
  assert.strictEqual(stored.api_key_hash.length, 64);

  console.log('API-key hashing and lookup checks passed.');
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error('Auth test failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
