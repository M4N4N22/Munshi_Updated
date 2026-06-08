# Railway Service Inventory

**Status:** Preparation only — no Railway resources created  
**Branch:** `Shantanu`  
**Date:** 2026-06-07  
**Target architecture:**

```
Vercel ── Web
Railway ─┬─ Backend (public)
         ├─ ML (private)
         └─ PostgreSQL
```

---

## 1. PostgreSQL

| Field | Value |
|-------|-------|
| **Service type** | Railway PostgreSQL (managed plugin) |
| **Root directory** | N/A (managed database) |
| **Build command** | N/A (provisioned by Railway) |
| **Start command** | N/A (managed) |
| **Health endpoint** | Railway dashboard status |
| **Port** | Internal (Railway injects `DATABASE_URL` / `PGHOST`, `PGPORT`, etc.) |
| **Required env vars (consumers)** | `POSTGRES_CONNECTION_STRING` on Backend — set to `${{Postgres.DATABASE_URL}}` |

**Notes:**

- 15 SQL migration files live in `backend/migrations/` (`000`–`013`).
- Schema is applied by the Backend service on startup (`AUTO_MIGRATE=1` default).
- No application code runs inside the Postgres service itself.

---

## 2. ML Service

| Field | Value |
|-------|-------|
| **Service type** | Railway application (Python / FastAPI) |
| **Root directory** | `ml` |
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Health endpoint** | `GET /health` → `{"status":"ok"}` |
| **Port** | Railway-injected `$PORT` (uvicorn binds `0.0.0.0`) |
| **Networking** | **Private** — disable public networking |

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Intent classification, chat fallback, `/convert`, extractors |
| `PORT` | Auto-injected by Railway |

### Optional environment variables

| Variable | Purpose |
|----------|---------|
| *(none read by code today)* | `ml/.env.example` documents ops-only values; uvicorn host/port are CLI args |

### Resource sizing

- **Memory:** ≥ 2 GB (`torch`, `sentence-transformers` model load)
- **Health check timeout:** 300s recommended (cold start loads ML models)

### Key files validated

| File | Status |
|------|--------|
| `ml/requirements.txt` | Present — FastAPI, torch, uvicorn, openai, etc. |
| `ml/main.py` | FastAPI app with `/health`, `/classify`, `/convert`, `/extract/task-inventory`, `/parse` |
| `ml/bot_engine.py` | Intent classifier + command parser (loaded at startup) |

**Caveat:** Legacy `ml/Dockerfile` copies only two files — **do not use Docker deploy**. Use Railway **source build** from repo root `ml/` so `parsers/`, `contracts/`, `extractors/` are included.

---

## 3. Backend Service

| Field | Value |
|-------|-------|
| **Service type** | Railway application (Node 20 / NestJS) |
| **Root directory** | `backend` |
| **Build command** | `yarn install --frozen-lockfile && yarn build` |
| **Start command** | `node scripts/docker-entrypoint.mjs` |
| **Health endpoint** | `GET /health` — Terminus check includes Postgres connectivity |
| **Secondary health** | `GET /health/migrations` — applied/pending migration status |
| **Port** | Railway-injected `PORT` (app default fallback: `4001` in `main.ts`) |
| **Networking** | **Public** — HTTPS endpoint for Vercel web + WhatsApp webhooks |

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Auto-injected by Railway |
| `POSTGRES_CONNECTION_STRING` | Sequelize connection — `${{Postgres.DATABASE_URL}}` |
| `ML_URL` | Private Railway ML URL — `http://${{ML.RAILWAY_PRIVATE_DOMAIN}}:${{ML.PORT}}` |
| `X_SECRET` | Internal API auth (`x-secret` header) |
| `OTP_PEPPER` | OTP hashing (production: dedicated secret) |
| `OLLI_KEY` | GetOlli WhatsApp API key |
| `OLLI_URL` | `https://api.getolliai.com/api/v1` |
| `WHATSAPP_VERIFY_TOKEN` | Meta/Olli webhook verification |
| `CORS_ORIGIN` | Vercel origins (comma-separated) |
| `MUNSHI_WEB_URL` | Vercel web URL (Zoho OAuth redirect, CSV links) |
| `ONBOARDING_MSG91_AUTH_KEY` | MSG91 SMS for web onboarding OTP |
| `ONBOARDING_MSG91_TEMPLATE_ID` | MSG91 OTP template |
| `NODE_ENV` | `production` |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | `false` in production |

### Optional environment variables

| Variable | Purpose |
|----------|---------|
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI` | Zoho Inventory OAuth |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | Encrypt stored OAuth tokens |
| `ZOHO_ACCOUNTS_URL`, `ZOHO_INVENTORY_API_DOMAIN` | Zoho region overrides |
| `ZOHO_SYNC_ENABLED`, `ZOHO_SYNC_INTERVAL_MINUTES` | Scheduled Zoho sync |
| `MUNSHI_TEAM_DASHBOARD_URL`, `MUNSHI_TEAM_CSV_TEMPLATE_URL` | Team CSV onboarding links |
| `MUNSHI_BOOK_DEMO_URL`, `MUNSHI_DEMO_YOUTUBE_URL` | Owner home demo links |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Direct Meta API (if not using Olli only) |
| `DOCUMENT_STORAGE_PATH` | Local document upload path |
| `WORKFLOW_SESSION_TTL_HOURS` | Workflow session TTL |
| `OLLI_MEDIA_BASE_URL` | Olli media CDN override |

### Development-only (must NOT be set in Railway prod)

| Variable | Purpose |
|----------|---------|
| `ENABLE_WEBHOOK_TEST_ROUTE=true` | Enables `POST /webhook/test` (disabled by default in prod) |

### Key files validated

| File | Status |
|------|--------|
| `backend/package.json` | `build` → `nest build`; `start:prod` → entrypoint script |
| `backend/yarn.lock` | Present — supports `--frozen-lockfile` |
| `backend/scripts/docker-entrypoint.mjs` | Migrates then starts `dist/main.js` |
| `backend/Dockerfile` | Node 20, same entrypoint — confirms production pattern |
| `backend/src/core/health-check/health.controller.ts` | `GET /health` with Postgres indicator |

### Recommended Railway build env

| Variable | Value | Why |
|----------|-------|-----|
| `NIXPACKS_NODE_VERSION` | `20` | Matches `Dockerfile` (`node:20-alpine`); no `engines` in `package.json` |

---

## 4. Web (Vercel — reference only)

Not a Railway service. Documented here for inventory completeness.

| Field | Value |
|-------|-------|
| **Host** | Vercel |
| **Root directory** | `web` |
| **Build command** | `npm run build` |
| **Start command** | Vercel-managed (`next start`) |
| **Required env** | `NEXT_PUBLIC_API_URL` → Railway Backend public URL |

See `05-env-matrix.md` for full Web variable list.

---

## Service dependency order

```
PostgreSQL → ML → Backend → Web (Vercel env update)
```

Backend cannot pass health checks without Postgres. Backend WhatsApp/classify flows require ML. Web requires Backend public URL.
