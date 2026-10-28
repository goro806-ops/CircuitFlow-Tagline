# Deploy CircuitFlow on Render

## Fix for the better-sqlite3 / Node 26 build error

CircuitFlow runs on Node 20 with Postgres project persistence and a Postgres-backed
LangGraph checkpointer when `DATABASE_URL` is configured. The completed project and
full history are also persisted in Postgres. Local development without Postgres
uses the in-memory fallback.

## Deploy settings

| Field | Value |
|-------|--------|
| Runtime | Node |
| **Node version** | **20** (important — not 26) |
| Build | `npm install --omit=dev` |
| Start | `node server.js` |
| Liveness check | `/health` |
| Readiness check | `/ready` |

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
| `CORS_ORIGINS` | Optional comma-separated browser origins |
| `DATABASE_URL` | Postgres connection string; required for durable cloud data |
| `LANGGRAPH_CHECKPOINT_SCHEMA` | Optional schema name; defaults to `langgraph` |
| `HOST` | `0.0.0.0` |

Claude is preferred automatically when `ANTHROPIC_API_KEY` is set.

## After deploy

1. Open `https://YOUR-APP.onrender.com/health` and confirm HTTP 200.
2. Open `https://YOUR-APP.onrender.com/ready` and confirm `ready: true` and `store.backend: postgres`.
3. Open `https://YOUR-APP.onrender.com/agents.html`.
4. Check `https://YOUR-APP.onrender.com/api/agents/status` — confirm the expected version, LLM provider, and live pricing mode.
5. Run one small design smoke test and confirm the returned project can be fetched again by its project ID.

## Redeploy

After pulling these fixes from GitHub, click **Manual Deploy → Deploy latest commit** on Render.

## Production checklist

- Keep `DATABASE_URL` on a managed Postgres instance and verify `/ready` after every deploy.
- Keep API keys only in Render Environment Variables; never place them in prompts, commits, or screenshots.
- Set `BASE_URL` to the canonical HTTPS origin. Add any additional browser origin to `CORS_ORIGINS` explicitly.
- Keep Render auto-deploy enabled only for the protected `main` branch after GitHub Actions is passing.
- Review `npm audit --omit=dev --audit-level=high` and the GitHub Actions result before each release.
- The free Render plan sleeps and is not suitable for latency-sensitive production workloads.
- Hardware outputs remain engineer-review artifacts until KiCad DRC, electrical simulation, DFM, and regulatory review pass.
