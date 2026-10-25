/**
 * Basic multi-user auth (v1.7)
 *
 * Simple API-key style auth for project ownership.
 * Not production-grade (no password hashing, no OAuth yet),
 * but provides clear ownership boundaries and is easy to replace later.
 *
 * Usage:
 *   Authorization: Bearer cf_xxxx
 * or header: X-API-Key: cf_xxxx
 *
 * Users are stored in data/users.json (auto-created).
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

function ensureUsersFile() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function loadUsers() {
  ensureUsersFile();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return { users: [] };
  }
}

function saveUsers(data) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function generateApiKey() {
  return "cf_" + crypto.randomBytes(24).toString("hex");
}

/**
 * Register a simple user. Returns { user_id, name, api_key }
 */
function registerUser(name = "anonymous") {
  const data = loadUsers();
  const user = {
    user_id: "usr_" + crypto.randomBytes(8).toString("hex"),
    name: String(name).slice(0, 64) || "anonymous",
    api_key: generateApiKey(),
    created_at: new Date().toISOString()
  };
  data.users.push(user);
  saveUsers(data);
  return { user_id: user.user_id, name: user.name, api_key: user.api_key };
}

function findUserByApiKey(apiKey) {
  if (!apiKey) return null;
  const data = loadUsers();
  return data.users.find(u => u.api_key === apiKey) || null;
}

/**
 * Express middleware – attaches req.user if a valid key is present.
 * Does NOT reject anonymous requests (auth is optional for now).
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const apiKey = bearer || req.headers["x-api-key"] || req.query.api_key;
  const user = findUserByApiKey(apiKey);
  if (user) {
    req.user = { user_id: user.user_id, name: user.name };
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  registerUser,
  findUserByApiKey,
  optionalAuth,
  generateApiKey
};
