# CircuitFlow Production Security

## Current controls

- Helmet security headers and a content-security policy are enabled.
- CORS is restricted to `BASE_URL` and the optional `CORS_ORIGINS` allowlist.
- API, authentication, and expensive design-run rate limits are enabled.
- Request bodies are limited to 2 MB by default.
- OAuth callback tokens are delivered in URL fragments rather than query parameters.
- Postgres is the expected cloud persistence backend. `/ready` reports failure when a configured database cannot be initialized.
- Production dependency auditing runs in GitHub Actions.
- SPICE output reports whether `ngspice` actually converged; when the binary is unavailable, the result is explicitly marked as an analytical fallback.

## Secrets

Store provider credentials only in Render Environment Variables or an equivalent secret manager. Never commit `.env` files, API keys, deploy hooks, OAuth secrets, database URLs, or copied browser tokens. If a secret is exposed, rotate it immediately in the provider dashboard and update Render.

## Authentication boundaries

API keys and bearer session tokens authorize project access. Anonymous design runs are rate-limited but are not a substitute for account authentication. Before opening CircuitFlow to sensitive private designs, require authentication for project listing and artifact downloads and add an explicit ownership migration for legacy anonymous projects.

## Hardware safety boundary

Generated architecture, BOM, schematics, PCB layouts, firmware, enclosure files, SPICE-like reports, and compliance checklists are engineering aids. They must not be represented as certified or manufacturing-ready until qualified human review and external validation pass.

## Release gate

A release should have:

1. Passing GitHub Actions tests.
2. A clean `npm audit --omit=dev --audit-level=high` result.
3. A successful `/health` and `/ready` check after deployment.
4. One authenticated end-to-end design smoke test.
5. A verified Postgres project reload.
6. Review of Render logs and deployment events.
7. A rollback commit or Render rollback target documented.
