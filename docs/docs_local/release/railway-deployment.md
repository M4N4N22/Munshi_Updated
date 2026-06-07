# Railway + Vercel Deployment Guide

**Target architecture:**

```
Vercel ── Web (munshi.app)
Railway ─┬─ Backend (public)
         ├─ ML (private)
         └─ PostgreSQL
```

**Deployment model:** GitHub → Railway source build → deploy. No Docker Hub or VM pull.

---

## Backend (Railway)

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `yarn install --frozen-lockfile && yarn build` |
| Start command | `node scripts/docker-entrypoint.mjs` |
| Health check | `GET /health` |
| Port | Railway sets `PORT` (default app bind: `4001`) |

**Required env vars:** `POSTGRES_CONNECTION_STRING`, `ML_URL`, `OLLI_KEY`, `X_SECRET`, `OTP_PEPPER`, `CORS_ORIGIN`, `WHATSAPP_VERIFY_TOKEN`

**Railway Postgres:** Use `${{Postgres.DATABASE_URL}}` or Railway reference variable for `POSTGRES_CONNECTION_STRING`.

**ML_URL:** Use Railway private networking URL for ML service, e.g. `http://${{ml.RAILWAY_PRIVATE_DOMAIN}}:${{ml.PORT}}`

---

## ML (Railway)

| Setting | Value |
|---------|-------|
| Root directory | `ml` |
| Build command | `pip install -r requirements.txt` |
| Start command | `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health check | `GET /health` |
| Networking | **Private** (not public) |

**Required env vars:** `OPENAI_API_KEY`

**Note:** Railway source build includes `parsers/`, `contracts/`, `extractors/` automatically (unlike legacy Dockerfile which only copied two files).

---

## Web (Vercel)

| Setting | Value |
|---------|-------|
| Root directory | `web` |
| Build command | `npm run build` |
| Framework | Next.js |

**Required env vars:** `NEXT_PUBLIC_API_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_SECRET_KEY`, `WHATSAPP_BUSINESS_NUMBER`

---

## Security defaults (production)

| Route | Production behavior |
|-------|---------------------|
| `POST /webhook/test` | **404** unless `ENABLE_WEBHOOK_TEST_ROUTE=true` |
| `POST /resolve/task-inventory` | Requires `x-secret` header matching `X_SECRET` |

---

## Key rotation (MB-01)

If `ml/.env.example` previously contained a live OpenAI key, **rotate the key** in the OpenAI dashboard before staging deploy. The example file now uses a placeholder only.
