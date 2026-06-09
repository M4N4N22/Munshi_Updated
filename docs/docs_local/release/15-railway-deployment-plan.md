# Railway Deployment Plan (Staging)

**Status:** Plan only — no resources created  
**Date:** 2026-06-07

---

## Architecture

```
                    ┌─────────────────┐
                    │  Vercel (Web)   │
                    │  www.munshidada.com     │
                    └────────┬────────┘
                             │ HTTPS
                             ▼
┌──────────────┐    private   ┌──────────────┐
│  Railway ML  │◄─────────────│Railway Backend│ ◄── public HTTPS
│  (private)   │   ML_URL     │   (public)    │
└──────────────┘              └───────┬───────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │Railway Postgres│
                              └──────────────┘
```

---

## Step 1 — PostgreSQL

| Setting | Value |
|---------|-------|
| Service | Railway PostgreSQL |
| Database name | `munshi_data` (or default) |
| Reference variable | `${{Postgres.DATABASE_URL}}` |

**Backend env:**

```
POSTGRES_CONNECTION_STRING=${{Postgres.DATABASE_URL}}
```

Migrations run automatically on backend start (`AUTO_MIGRATE=1`).

---

## Step 2 — ML (private)

| Setting | Value |
|---------|-------|
| Root directory | `ml` |
| Source | GitHub branch `Shantanu` (or `main` after merge) |
| Build command | `pip install -r requirements.txt` |
| Start command | `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |
| Health check timeout | 300s (allow torch model load) |
| Public networking | **Disabled** |

### Required env vars

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | From OpenAI dashboard (rotated key) |

### Resource sizing

- **Memory:** ≥ 2 GB recommended (`torch` + `sentence-transformers`)
- **Build time:** 3–8 minutes expected

---

## Step 3 — Backend (public)

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Source | GitHub branch |
| Build command | `yarn install --frozen-lockfile && yarn build` |
| Start command | `node scripts/docker-entrypoint.mjs` |
| Health check path | `/health` |
| Public networking | **Enabled** |

### Required env vars

| Variable | Source / value |
|----------|----------------|
| `PORT` | Railway auto-injects |
| `POSTGRES_CONNECTION_STRING` | `${{Postgres.DATABASE_URL}}` |
| `ML_URL` | `http://${{ml.RAILWAY_PRIVATE_DOMAIN}}:${{ml.PORT}}` |
| `CORS_ORIGIN` | `https://www.munshidada.com,https://www.munshidada.com` |
| `X_SECRET` | Generate strong random |
| `OTP_PEPPER` | Generate strong random |
| `OLLI_KEY` | From GetOlli dashboard |
| `OLLI_URL` | `https://api.getolliai.com/api/v1` |
| `WHATSAPP_VERIFY_TOKEN` | Meta/Olli webhook token |
| `MUNSHI_WEB_URL` | `https://www.munshidada.com` |
| `ONBOARDING_MSG91_AUTH_KEY` | MSG91 dashboard |
| `ONBOARDING_MSG91_TEMPLATE_ID` | MSG91 template |
| `NODE_ENV` | `production` |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | `false` |

### Optional (feature-specific)

| Variable | When needed |
|----------|-------------|
| `ZOHO_CLIENT_ID/SECRET` | Zoho integration |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | Zoho token encryption |
| `ENABLE_WEBHOOK_TEST_ROUTE` | **Never in staging/prod** |

### Inter-service networking

```
Backend → ML:  ML_URL (private Railway DNS)
Backend → PG:  POSTGRES_CONNECTION_STRING
Web → Backend: NEXT_PUBLIC_API_URL (public Railway URL)
```

---

## Step 4 — Web (Vercel)

| Setting | Value |
|---------|-------|
| Root directory | `web` |
| Build | `npm run build` |
| Domain | `www.munshidada.com` |

### Required env vars

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Railway backend public URL |
| `TURSO_DATABASE_URL` | Turso dashboard |
| `TURSO_AUTH_TOKEN` | Turso dashboard |
| `ADMIN_SECRET_KEY` | Generate strong random |
| `WHATSAPP_BUSINESS_NUMBER` | Production WA number |
| `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER` | Same |

---

## Deploy order

1. **PostgreSQL** — provision, wait for healthy
2. **ML** — deploy, verify `GET /health` via Railway internal
3. **Backend** — deploy, verify `GET /health`, migrations applied
4. **Web** — update `NEXT_PUBLIC_API_URL`, redeploy Vercel
5. **Smoke** — onboarding OTP flow, WhatsApp webhook, classify intent

---

## Post-deploy verification checklist

- [ ] `GET https://<backend>/health` → Postgres up
- [ ] `GET https://<ml-internal>/health` → ok (from backend logs)
- [ ] `POST /classify` via backend WhatsApp message → intent returned
- [ ] Web onboarding OTP → SMS or dev log (MSG91 configured)
- [ ] `POST /webhook/test` → **404** (no `ENABLE_WEBHOOK_TEST_ROUTE`)
- [ ] `POST /resolve/task-inventory` without `x-secret` → **401**
- [ ] Zoho OAuth redirect uses `MUNSHI_WEB_URL/integrations`

---

## Rollback plan

| Service | Rollback |
|---------|----------|
| Backend | Railway redeploy previous deployment |
| ML | Railway redeploy previous deployment |
| Postgres | Point-in-time restore (Railway backup) |
| Web | Vercel instant rollback |

No migration rollback scripts exist — forward-only schema.
