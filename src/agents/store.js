/**
 * Persistence layer (v1.10)
 * - Postgres when DATABASE_URL is set (survives Render free-tier sleep)
 * - JSON files under data/ otherwise
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");

let pool = null;
let pgReady = null;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!hasDatabaseUrl()) return null;
  if (pool) return pool;
  try {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false }
    });
    return pool;
  } catch (err) {
    console.warn("[store] pg package missing or failed:", err.message);
    return null;
  }
}

async function initPostgres() {
  const p = getPool();
  if (!p) return false;
  if (pgReady) return pgReady;
  pgReady = (async () => {
    await p.query(`
      CREATE TABLE IF NOT EXISTS cf_users (
        user_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cf_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cf_projects (
        project_id TEXT PRIMARY KEY,
        owner_id TEXT,
        status TEXT,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cf_projects_owner ON cf_projects(owner_id);
      CREATE INDEX IF NOT EXISTS cf_sessions_exp ON cf_sessions(expires_at);
    `);
    console.log("[store] Postgres ready");
    return true;
  })().catch(err => {
    console.warn("[store] Postgres init failed, using JSON files:", err.message);
    pgReady = null;
    return false;
  });
  return pgReady;
}

function ensureJsonFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [], sessions: [] }, null, 2));
  }
}

function loadJsonStore() {
  ensureJsonFiles();
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    if (!data.users) data.users = [];
    if (!data.sessions) data.sessions = [];
    return data;
  } catch {
    return { users: [], sessions: [] };
  }
}

function saveJsonStore(data) {
  ensureJsonFiles();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

async function listUsers() {
  if (await initPostgres()) {
    const r = await pool.query("SELECT data FROM cf_users");
    return r.rows.map(row => row.data);
  }
  return loadJsonStore().users;
}

async function getUserById(userId) {
  if (!userId) return null;
  if (await initPostgres()) {
    const r = await pool.query("SELECT data FROM cf_users WHERE user_id = $1", [userId]);
    return r.rows[0]?.data || null;
  }
  return loadJsonStore().users.find(u => u.user_id === userId) || null;
}

async function getUserByEmail(email) {
  if (!email) return null;
  const e = String(email).toLowerCase().trim();
  if (await initPostgres()) {
    const r = await pool.query(
      "SELECT data FROM cf_users WHERE lower(data->>'email') = $1 LIMIT 1",
      [e]
    );
    return r.rows[0]?.data || null;
  }
  return loadJsonStore().users.find(u => u.email === e) || null;
}

async function getUserByGoogleId(googleId) {
  if (!googleId) return null;
  if (await initPostgres()) {
    const r = await pool.query(
      "SELECT data FROM cf_users WHERE data->>'google_id' = $1 LIMIT 1",
      [String(googleId)]
    );
    return r.rows[0]?.data || null;
  }
  return loadJsonStore().users.find(u => u.google_id === googleId) || null;
}

async function getUserByApiKey(apiKey) {
  if (!apiKey) return null;
  const hash = require("crypto").createHash("sha256").update(String(apiKey)).digest("hex");
  if (await initPostgres()) {
    const r = await pool.query(
      "SELECT data FROM cf_users WHERE data->>'api_key_hash' = $1 OR data->>'api_key' = $2 LIMIT 1",
      [hash, apiKey]
    );
    return r.rows[0]?.data || null;
  }
  return loadJsonStore().users.find(u => u.api_key_hash === hash || u.api_key === apiKey) || null;
}

async function upsertUser(user) {
  if (await initPostgres()) {
    await pool.query(
      `INSERT INTO cf_users (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [user.user_id, JSON.stringify(user)]
    );
    return user;
  }
  const data = loadJsonStore();
  const idx = data.users.findIndex(u => u.user_id === user.user_id);
  if (idx >= 0) data.users[idx] = user;
  else data.users.push(user);
  saveJsonStore(data);
  return user;
}

async function createSession(userId, token, createdAt, expiresAt) {
  if (await initPostgres()) {
    await pool.query("DELETE FROM cf_sessions WHERE expires_at < $1", [Date.now()]);
    await pool.query(
      `INSERT INTO cf_sessions (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET user_id = $2, expires_at = $3`,
      [token, userId, expiresAt, createdAt]
    );
    return;
  }
  const data = loadJsonStore();
  const now = Date.now();
  data.sessions = (data.sessions || []).filter(s => s.expires_at > now);
  data.sessions.push({ token, user_id: userId, created_at: createdAt, expires_at: expiresAt });
  saveJsonStore(data);
}

async function getUserByToken(token) {
  if (!token) return null;
  const now = Date.now();
  if (await initPostgres()) {
    const r = await pool.query(
      "SELECT user_id FROM cf_sessions WHERE token = $1 AND expires_at > $2",
      [token, now]
    );
    if (!r.rows[0]) return null;
    return getUserById(r.rows[0].user_id);
  }
  const data = loadJsonStore();
  const session = (data.sessions || []).find(s => s.token === token && s.expires_at > now);
  if (!session) return null;
  return data.users.find(u => u.user_id === session.user_id) || null;
}

async function saveProject(project) {
  if (!project?.project_id) throw new Error("project_id required");
  project.updated_at = new Date().toISOString();
  if (await initPostgres()) {
    await pool.query(
      `INSERT INTO cf_projects (project_id, owner_id, status, data, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (project_id) DO UPDATE
         SET owner_id = $2, status = $3, data = $4::jsonb, updated_at = NOW()`,
      [
        project.project_id,
        project.owner_id || null,
        project.status || null,
        JSON.stringify(project)
      ]
    );
    return project;
  }
  ensureJsonFiles();
  const filePath = path.join(PROJECTS_DIR, `${project.project_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), "utf8");
  return project;
}

async function loadProject(projectId) {
  if (await initPostgres()) {
    const r = await pool.query("SELECT data FROM cf_projects WHERE project_id = $1", [projectId]);
    return r.rows[0]?.data || null;
  }
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function listProjects(ownerId = null) {
  if (await initPostgres()) {
    let r;
    if (ownerId) {
      r = await pool.query(
        `SELECT data FROM cf_projects
         WHERE owner_id = $1 OR owner_id IS NULL
         ORDER BY updated_at DESC LIMIT 100`,
        [ownerId]
      );
    } else {
      r = await pool.query(
        "SELECT data FROM cf_projects ORDER BY updated_at DESC LIMIT 100"
      );
    }
    return r.rows.map(row => summarizeProject(row.data));
  }
  ensureJsonFiles();
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter(p => !ownerId || !p.owner_id || p.owner_id === ownerId)
    .map(summarizeProject)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

function summarizeProject(data) {
  return {
    project_id: data.project_id,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
    prompt: data.user_intent?.raw_text?.slice(0, 120),
    needs_human: data.status === "needs_human" || !!data.escalation,
    bom_total: data.bom?.estimated_total || null,
    owner_id: data.owner_id || null
  };
}

function getStoreInfo() {
  return {
    backend: hasDatabaseUrl() && pool ? "postgres" : hasDatabaseUrl() ? "postgres_pending" : "json_files",
    database_url_set: hasDatabaseUrl()
  };
}

module.exports = {
  initPostgres,
  hasDatabaseUrl,
  getStoreInfo,
  listUsers,
  getUserById,
  getUserByEmail,
  getUserByGoogleId,
  getUserByApiKey,
  getUserByToken,
  upsertUser,
  createSession,
  saveProject,
  loadProject,
  listProjects
};
