const assert = require('assert');
const app = require('../server');

async function runTests() {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = await healthResponse.json();
    const apiHealth = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
    const status = await fetch(`${baseUrl}/api/agents/status`).then((response) => response.json());
    const missingResponse = await fetch(`${baseUrl}/api/not-a-route`);
    const missing = await missingResponse.json();
    const blockedResponse = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://not-allowed.example' }
    });

    assert.strictEqual(health.ok, true);
    assert.strictEqual(apiHealth.ok, true);
    assert.strictEqual(health.version, apiHealth.version);
    assert.strictEqual(status.version, health.version);
    assert.strictEqual(typeof health.version, 'string');
    assert.strictEqual(healthResponse.headers.get('x-powered-by'), null);
    assert.strictEqual(healthResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.match(healthResponse.headers.get('content-security-policy') || '', /cdnjs\.cloudflare\.com/);
    assert.strictEqual(missingResponse.status, 404);
    assert.strictEqual(missing.success, false);
    assert.strictEqual(blockedResponse.status, 403);

    console.log('Health and status version checks passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error('Health test failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
