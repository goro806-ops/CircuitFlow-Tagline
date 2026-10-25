/**
 * Multi-user auth (v1.9)
 * - API key
 * - Email/password (scrypt)
 * - Session tokens
 * - Google OAuth 2.0
 *
 * Env for Google:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   BASE_URL  (e.g. https://your-app.onrender.com) – used for redirect URI
 *   or GOOGLE_REDIRECT_URI  (full callback URL override)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function createSession(userId) {
  const data = loadStore();
  const now = Date.now();
  data.sessions = (data.sessions || []).filter(s => s.expires_at > now);
  const token = generateToken();
  data.sessions.push({
    token,
    user_id: userId,
    created_at: now,
    expires_at: now + TOKEN_TTL_MS
  });
  saveStore(data);
  return { token, expires_in_seconds: TOKEN_TTL_MS / 1000 };
}

function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getGoogleRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  if (process.env.BASE_URL) {
    return `${process.env.BASE_URL.replace(/\/$/, "")}/api/agents/auth/google/callback`;
  }
  // Derive from request (works on Render once deployed)
  if (req) {
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}/api/agents/auth/google/callback`;
  }
  return "http://localhost:3000/api/agents/auth/google/callback";
}

function getGoogleAuthUrl(req, state) {
  if (!isGoogleOAuthConfigured()) {
    const err = new Error("Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    err.status = 503;
    throw err;
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: state || crypto.randomBytes(16).toString("hex")
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange code for tokens, fetch profile, create/find user, return session.
 */
async function loginWithGoogleCode(code, req) {
  if (!isGoogleOAuthConfigured()) {
    const err = new Error("Google OAuth not configured");
    err.status = 503;
    throw err;
  }
  if (!code) {
    const err = new Error("Missing authorization code");
    err.status = 400;
    throw err;
  }

  const redirectUri = getGoogleRedirectUri(req);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.warn("[auth] Google token error:", text.slice(0, 300));
    const err = new Error("Google token exchange failed");
    err.status = 401;
    throw err;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    const err = new Error("No access_token from Google");
    err.status = 401;
    throw err;
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!profileRes.ok) {
    const err = new Error("Failed to fetch Google profile");
    err.status = 401;
    throw err;
  }
  const profile = await profileRes.json();
  // profile: { id, email, name, picture, verified_email }

  const data = loadStore();
  const email = (profile.email || "").toLowerCase().trim();
  let user = null;

  if (profile.id) {
    user = data.users.find(u => u.google_id === profile.id);
  }
  if (!user && email) {
    user = data.users.find(u => u.email === email);
  }

  if (!user) {
    user = {
      user_id: "usr_" + crypto.randomBytes(8).toString("hex"),
      name: (profile.name || email || "Google user").slice(0, 64),
      email: email || null,
      google_id: profile.id || null,
      picture: profile.picture || null,
      api_key: generateApiKey(),
      created_at: new Date().toISOString(),
      auth_provider: "google"
    };
    data.users.push(user);
  } else {
    // Link Google id / refresh profile
    user.google_id = profile.id || user.google_id;
    user.picture = profile.picture || user.picture;
    if (profile.name) user.name = profile.name.slice(0, 64);
    if (email) user.email = email;
    user.auth_provider = user.auth_provider || "google";
  }

  saveStore(data);

  const session = createSession(user.user_id);
  return {
    ...session,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      picture: user.picture || null,
      api_key: user.api_key
    }
  };
}

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
    created_at: new Date().toISOString(),
    auth_provider: password ? "password" : "api_key"
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

  const session = createSession(user.user_id);
  return {
    ...session,
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
    req.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email || null,
      picture: user.picture || null
    };
  } else {
    req.user = null;
  }
  next();
}

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
  loginWithGoogleCode,
  getGoogleAuthUrl,
  isGoogleOAuthConfigured,
  getGoogleRedirectUri,
  findUserByApiKey,
  findUserByToken,
  findUserById,
  optionalAuth,
  requireAuth,
  generateApiKey
};
