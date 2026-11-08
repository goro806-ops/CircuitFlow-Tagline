const assert = require('assert');
const { redactSecrets } = require('../src/agents/redact');

const input = 'Authorization: Bearer tok_abcdefghijklmnopqrstuvwxyz DATABASE_URL=postgresql://user:pass@example.test/db api_key=cf_sensitive_value password=hunter2';
const output = redactSecrets(input);
assert.ok(!output.includes('tok_abcdefghijklmnopqrstuvwxyz'));
assert.ok(!output.includes('postgresql://user:pass@example.test/db'));
assert.ok(!output.includes('cf_sensitive_value'));
assert.ok(!output.includes('hunter2'));
assert.ok(output.includes('Bearer [redacted]'));
assert.ok(output.includes('api_key=[redacted]'));
assert.ok(output.includes('password=[redacted]'));

console.log('Operational log redaction checks passed.');
