/**
 * Multi-user auth (v1.8)
 * - API key (still supported)
 * - Email/password register + login with scrypt hashing
 * - Session tokens (Bearer)
 * - Multi-tenant project ownership
 *
 * Storage: data/users.json (simple; swap for Postgres later)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function ensureUsersFile() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [], sessions: [] }, null, 2));
  }
}

function loadStore() {
  ensureUsersFile();
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    if (!data.sessions) data.sessions = [];
    if (!data.users) data.users = [];
    return data;
  } catch {
    return { users: [], sessions: [] };
  }
}

function saveStore(data) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function generateApiKey() {
  return "cf_" + crypto.randomBytes(24).toString("hex");
}

function generateToken() {
  return "tok_" + crypto.randomBytes(32).toString("hex");
}

function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const h = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(hash, "hex"));
}

/**
 * Register with optional email/password. Always gets an API key.
 */
function registerUser({ name = "anonymous", email = null, password = null } = {}) {
  const data = loadStore();

  if (email) {
    email = String(email).toLowerCase().trim();
    if (data.users.some(u => u.email === email)) {
      const err = new Error("Email already registered");
      err.status = 409;
      throw err;
    }
  }

  const user = {
    user_id: "usr_" + crypto.randomBytes(8).toString("hex"),
    name: String(name).slice(0, 64) || "anonymous",
    email: email || null,
    api_key: generateApiKey(),
    created_at: new Date().toISOString()
  };

  if (password && String(password).length >= 6) {
    const { salt, hash } = hashPassword(password);
    user.password_salt = salt;
    user.password_hash = hash;
  }

  data.users.push(user);
  saveStore(data);

  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    api_key: user.api_key,
    has_password: !!user.password_hash
  };
}

/**
 * Login with email + password → session token
 */
function loginUser(email, password) {
  const data = loadStore();
  email = String(email || "").toLowerCase().trim();
  const user = data.users.find(u => u.email === email);
  if (!user || !user.password_hash || !user.password_salt) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  if (!verifyPassword(password, user.password_salt, user.password_hash)) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  // prune expired sessions
  const now = Date.now();
  data.sessions = (data.sessions || []).filter(s => s.expires_at > now);

  const token = generateToken();
  data.sessions.push({
    token,
    user_id: user.user_id,
    created_at: now,
    expires_at: now + TOKEN_TTL_MS
  });
  saveStore(data);

  return {
    token,
    expires_in_seconds: TOKEN_TTL_MS / 1000,
    user: { user_id: user.user_id, name: user.name, email: user.email }
  };
}

function findUserByApiKey(apiKey) {
  if (!apiKey) return null;
  const data = loadStore();
  return data.users.find(u => u.api_key === apiKey) || null;
}

function findUserByToken(token) {
  if (!token) return null;
  const data = loadStore();
  const now = Date.now();
  const session = (data.sessions || []).find(s => s.token === token && s.expires_at > now);
  if (!session) return null;
  return data.users.find(u => u.user_id === session.user_id) || null;
}

function findUserById(userId) {
  const data = loadStore();
  return data.users.find(u => u.user_id === userId) || null;
}

/**
 * Optional auth middleware.
 * Accepts: Authorization: Bearer <api_key|token>  or  X-API-Key
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const keyOrToken = bearer || req.headers["x-api-key"] || req.query.api_key;

  let user = null;
  if (keyOrToken) {
    if (keyOrToken.startsWith("tok_")) {
      user = findUserByToken(keyOrToken);
    } else {
      user = findUserByApiKey(keyOrToken);
    }
  }

  if (user) {
    req.user = { user_id: user.user_id, name: user.name, email: user.email || null };
  } else {
    req.user = null;
  }
  next();
}

/** Require auth – 401 if missing */
function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    next();
  });
}

module.exports = {
  registerUser,
  loginUser,
  findUserByApiKey,
  findUserByToken,
  findUserById,
  optionalAuth,
  requireAuth,
  generateApiKey
};
