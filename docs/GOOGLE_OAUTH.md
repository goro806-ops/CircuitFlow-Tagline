# Google OAuth setup (phone + Render)

## 1. Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Create **OAuth 2.0 Client ID** → Application type **Web application**
3. Authorized redirect URIs — add **exactly**:

```
https://YOUR-APP.onrender.com/api/agents/auth/google/callback
```

(Also optional for local test: `http://localhost:3000/api/agents/auth/google/callback`)

4. Copy **Client ID** and **Client Secret**

## 2. Render environment variables

| Key | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | from Google Console |
| `GOOGLE_CLIENT_SECRET` | from Google Console |
| `BASE_URL` | `https://YOUR-APP.onrender.com` (no trailing slash) |

Redeploy after saving env vars.

## 3. Use on phone

1. Open `https://YOUR-APP.onrender.com/agents.html`
2. Tap **Sign in with Google**
3. After Google login you return signed in; runs are tied to your account

## Endpoints

- Start: `GET /api/agents/auth/google`
- Callback: `GET /api/agents/auth/google/callback`
- Status: `GET /api/agents/auth/google/status`

If the button is hidden, Google env vars are not set yet.
