# CircuitFlow v1.10 — Postgres, Google OAuth, live pricing

## 1. Postgres on Render (recommended)

JSON files on free Render **vanish** when the service sleeps. Postgres keeps users + projects.

1. Render Dashboard → **New +** → **PostgreSQL** (free tier is fine)
2. After create, copy **Internal Database URL**
3. On your **web service** → Environment → add:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | paste Internal Database URL |

4. Redeploy

Check `/api/agents/status` → `"store": { "backend": "postgres" }`

Without `DATABASE_URL`, the app still works with **JSON files** (ephemeral on free tier).

---

## 2. Google OAuth (phone sign-in)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. Authorized redirect URI:

```text
https://circuitflow-tagline-1.onrender.com/api/agents/auth/google/callback
```

4. Render env:

| Key | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | from Google |
| `GOOGLE_CLIENT_SECRET` | from Google |
| `BASE_URL` | `https://circuitflow-tagline-1.onrender.com` |

5. Redeploy → open `/agents.html` → **Sign in with Google**

---

## 3. Live distributor pricing (optional)

Adapters already exist. Set any of:

| Key | Provider |
|-----|----------|
| `DIGIKEY_CLIENT_ID` + `DIGIKEY_CLIENT_SECRET` | DigiKey |
| `MOUSER_API_KEY` | Mouser |
| `NEXAR_TOKEN` or `OCTOPART_API_KEY` | Nexar/Octopart |

Without keys, mock catalogue prices are used (your current BOM path).

Status shows `pricing.mode`: `live` or `mock`.

---

## 4. Harder test prompts (manual)

Try on `/agents.html`:

- `GPS fitness band, BLE, heart rate, under $25 BOM`
- `WiFi environmental sensor, battery, SHT40 + pressure, under $12`
- `LoRa soil moisture module, solar optional, under $20`

---

## Env checklist (full)

```text
NODE_VERSION=20
HOST=0.0.0.0
GROQ_API_KEY=...
GROQ_MODEL=qwen/qwen3.8-27b
LLM_PROVIDER=groq
DATABASE_URL=...          # optional but recommended
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BASE_URL=https://circuitflow-tagline-1.onrender.com
MOUSER_API_KEY=...        # optional
```
