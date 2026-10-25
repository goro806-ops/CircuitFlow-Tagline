# Deploy CircuitFlow (phone-friendly)

You cannot use `localhost` on your phone. Deploy once → open a public URL.

## Recommendation: **Render.com** (what you already used)

Good fit for this Node app:
- Free web service tier
- Connects directly to GitHub
- HTTPS URL that works on phone
- Simple env vars for API keys

**Alternatives (also fine):**
| Host | Notes |
|------|--------|
| **Render** | Best default if you already know it |
| **Railway** | Easy, good free trial |
| **Fly.io** | More control, slightly more setup |
| **Vercel** | Less ideal (this is a long-running Node server, not only serverless) |

Stay on **Render** unless you hit limits.

---

## Deploy on Render (from phone or desktop)

### 1. Open Render
https://dashboard.render.com

### 2. New → Web Service
- Connect GitHub account if needed
- Select repo: **goro806-ops/CircuitFlow-Tagline**
- Branch: **main**

### 3. Settings
| Field | Value |
|-------|--------|
| Runtime | Node |
| Build command | `npm install` |
| Start command | `node server.js` |
| Instance | Free |

### 4. Environment (optional)
In Render → Environment:

```
HOST=0.0.0.0
OPENAI_API_KEY=sk-...          # optional, smarter agents
MOUSER_API_KEY=...             # optional live pricing
DIGIKEY_CLIENT_ID=...
DIGIKEY_CLIENT_SECRET=...
NEXAR_TOKEN=...                # Octopart
```

`PORT` is set automatically by Render — do not hardcode it.

### 5. Create Web Service
Wait for deploy (a few minutes). You get a URL like:

`https://circuitflow-xxxx.onrender.com`

### 6. On your phone open

| Page | URL |
|------|-----|
| **Agents UI** | `https://YOUR-APP.onrender.com/agents.html` |
| Health | `https://YOUR-APP.onrender.com/health` |
| Status API | `https://YOUR-APP.onrender.com/api/agents/status` |

---

## Important (free tier)

1. **Cold start** – free services sleep after ~15 min idle. First open can take 30–60 seconds.
2. **Disk is ephemeral** – projects saved under `data/` may be lost on restart. Fine for demos; later use a database.
3. **Secrets** – put API keys only in Render Environment, never in the repo.

---

## After deploy

1. Open `/agents.html` on your phone  
2. Run a prompt (e.g. BLE wearable with IMU under $15)  
3. Check `/api/agents/status` for version **1.8**

If deploy fails, check Render **Logs** for the error and share it.
