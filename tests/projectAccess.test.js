const assert = require('assert');
const { assertOwner } = require('../src/agents/projectAccess');

assert.doesNotThrow(() => assertOwner({}, { project_id: 'disposable' }));

assert.throws(
  () => assertOwner({}, { project_id: 'owned', owner_id: 'user-a' }),
  error => error.status === 401 && error.message === 'Authentication required for owned project'
);

assert.throws(
  () => assertOwner({ user: { user_id: 'user-b' } }, { project_id: 'owned', owner_id: 'user-a' }),
  error => error.status === 403 && error.message === 'Not your project'
);

assert.doesNotThrow(() => assertOwner({ user: { user_id: 'user-a' } }, { project_id: 'owned', owner_id: 'user-a' }));

console.log('Project access isolation checks passed.');
