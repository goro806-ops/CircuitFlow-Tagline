'use strict';

const { Client } = require('pg');

function sslConfig() {
  return process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false };
}

async function verify(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL must be set');
  const client = new Client({ connectionString, ssl: sslConfig() });
  await client.connect();
  try {
    const requiredTables = ['cf_users', 'cf_sessions', 'cf_projects'];
    const tableResult = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [requiredTables]
    );
    const tables = new Set(tableResult.rows.map(row => row.table_name));
    const missing = requiredTables.filter(table => !tables.has(table));
    if (missing.length) throw new Error(`required application tables are missing: ${missing.join(', ')}`);

    const counts = {};
    for (const table of requiredTables) {
      const result = await client.query(`SELECT count(*)::int AS count FROM ${table}`);
      counts[table] = result.rows[0].count;
    }

    const authResult = await client.query(`
      SELECT count(*)::int AS users,
             count(*) FILTER (WHERE data ? 'api_key_hash')::int AS hashed_api_keys,
             count(*) FILTER (WHERE data ? 'api_key')::int AS plaintext_api_keys
      FROM cf_users
    `);
    const auth = authResult.rows[0];
    if (auth.plaintext_api_keys > 0) throw new Error('restore contains plaintext API-key fields');
    if (auth.users > 0 && auth.hashed_api_keys !== auth.users) {
      throw new Error('not every restored user has an API-key hash field');
    }

    const projectResult = await client.query(`SELECT data FROM cf_projects ORDER BY updated_at DESC LIMIT 1`);
    if (projectResult.rows[0]) {
      const data = projectResult.rows[0].data;
      if (!data || typeof data !== 'object' || !data.project_id) throw new Error('latest restored project JSON is invalid');
    }

    const checkpointTablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name ILIKE '%checkpoint%' OR table_name ILIKE '%writes%')
      ORDER BY table_name
    `);
    const checkpointTables = checkpointTablesResult.rows.map(row => row.table_name);
    if (!checkpointTables.length) throw new Error('LangGraph checkpoint tables are missing');
    const checkpointCounts = {};
    for (const table of checkpointTables) {
      const result = await client.query(`SELECT count(*)::int AS count FROM "${table.replace(/"/g, '""')}"`);
      checkpointCounts[table] = result.rows[0].count;
    }

    return {
      restore_check: 'passed',
      tables: requiredTables,
      counts,
      authentication: { users: auth.users, hashed_api_keys: auth.hashed_api_keys, plaintext_api_keys: auth.plaintext_api_keys },
      project_reload: projectResult.rows.length > 0 ? 'passed' : 'no_projects_to_reload',
      checkpoint_recovery: { tables: checkpointTables, counts: checkpointCounts }
    };
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  verify().then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(`Postgres restore verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { verify };
