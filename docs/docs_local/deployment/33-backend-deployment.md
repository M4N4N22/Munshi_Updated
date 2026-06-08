# Backend Deployment

**Project:** munshi-staging  
**Date:** 2026-06-08

---

## Service configuration

| Setting | Value |
|---------|-------|
| **Service Name** | `backend` |
| **Service ID** | `5adcc79f-a9fb-41bf-a0d4-d635293063e9` |
| **Deploy source** | Local CLI upload (`backend/`) |
| **Build** | Dockerfile multi-stage (`yarn build`) |
| **Start** | `node scripts/docker-entrypoint.mjs` |
| **Health check** | `/health` |

---

## Active deployment

| Field | Value |
|-------|-------|
| **Deployment ID** | `8f5cb7de-c980-4643-bcc9-65c24b38a95d` |
| **Status** | **SUCCESS** |
| **Public URL** | https://backend-production-41504.up.railway.app |

---

## Health validation

| Endpoint | Result |
|----------|--------|
| `GET /health` | **HTTP 200** — Postgres `up` |
| `GET /health/migrations` | **HTTP 200** — `up_to_date: true`, 15/15 |

---

## Environment configured

| Variable | Value |
|----------|-------|
| `POSTGRES_CONNECTION_STRING` | `${{Postgres.DATABASE_URL}}` (resolved) |
| `ML_URL` | `http://ml.railway.internal:8080` |
| `NODE_ENV` | `production` |
| `NIXPACKS_NODE_VERSION` | `20` |
| `CORS_ORIGIN` | `https://munshi-dada.vercel.app` |
| `MUNSHI_WEB_URL` | `https://munshi-dada.vercel.app` |
| `X_SECRET` | `secret` (staging) |
| `OTP_PEPPER` | `test-pepper-123` (staging) |
| `ENABLE_WEBHOOK_TEST_ROUTE` | `true` (staging smoke only — **disable before prod**) |

---

## Not yet configured

| Variable | Required for |
|----------|--------------|
| `OLLI_KEY` | WhatsApp outbound |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| `ONBOARDING_MSG91_*` | SMS OTP onboarding |

---

## Failed attempts (resolved)

| Issue | Fix |
|-------|-----|
| `dist/main.js` not found | Entrypoint → `dist/src/main.js` |
| Build context / root_directory mismatch | Deploy from `backend/` with `root_directory=/` |
| GitHub autodeploy failure | Use local `railway up --no-gitignore` |
