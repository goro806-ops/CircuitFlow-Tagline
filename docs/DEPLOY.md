# Deploy CircuitFlow on Render

## Fix for the better-sqlite3 / Node 26 build error

We removed the native SQLite checkpointer dependency and pinned **Node 20**.
LangGraph uses in-memory checkpoints; projects still save as JSON.

## Deploy settings

| Field | Value |
|-------|--------|
| Runtime | Node |
| **Node version** | **20** (important — not 26) |
| Build | `npm install --omit=dev` |
| Start | `node server.js` |
| Health check | `/health` |

In Render: **Settings → Environment → Node Version → 20**

Or set env var:

```
NODE_VERSION=20
```

## Environment variables (recommended)

| Key | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | **Claude** LLM (your choice) |
| `ANTHROPIC_MODEL` | optional, default `claude-sonnet-4-20250514` |
| `OPENAI_API_KEY` | optional fallback |
| `GOOGLE_CLIENT_ID` | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `BASE_URL` | `https://YOUR-APP.onrender.com` |
| `HOST` | `0.0.0.0` |

Claude is preferred automatically when `ANTHROPIC_API_KEY` is set.

## After deploy

1. Open `https://YOUR-APP.onrender.com/health`
2. Open `https://YOUR-APP.onrender.com/agents.html`
3. Check `https://YOUR-APP.onrender.com/api/agents/status` — should show version and `llm` provider

## Redeploy

After pulling these fixes from GitHub, click **Manual Deploy → Deploy latest commit** on Render.
