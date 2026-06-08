# Environment Variable Matrix

**Status:** Preparation only  
**Date:** 2026-06-07

Variables sourced from `backend/.env.example`, `ml/.env.example`, `web/.env.example`, and codebase `process.env` usage.

---

## Backend (Railway)

### Required (production)

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| `PORT` | HTTP listen port | `4001` (Railway may assign another) | Railway auto-inject |
| `POSTGRES_CONNECTION_STRING` | Sequelize / Postgres | `postgresql://user:pass@host:5432/railway` | `${{Postgres.DATABASE_URL}}` |
| `ML_URL` | ML service base URL (private) | `http://ml.railway.internal:8000` | `http://${{ML.RAILWAY_PRIVATE_DOMAIN}}:${{ML.PORT}}` |
| `NODE_ENV` | Runtime mode | `production` | Manual |
| `X_SECRET` | `x-secret` header for internal routes | `openssl rand -hex 32` | Generate — store in Railway secrets |
| `OTP_PEPPER` | OTP hash pepper | `openssl rand -hex 32` | Generate — store in Railway secrets |
| `OLLI_KEY` | GetOlli API key | `oll_...` | GetOlli dashboard |
| `OLLI_URL` | GetOlli API base | `https://api.getolliai.com/api/v1` | Static / docs |
| `WHATSAPP_VERIFY_TOKEN` | Webhook subscription verify | `my-verify-token` | You define — register in Meta/Olli |
| `CORS_ORIGIN` | Allowed browser origins | `https://munshi.app,https://munshi-dada.vercel.app` | Manual — match Vercel domains |
| `MUNSHI_WEB_URL` | Web app URL (OAuth, links) | `https://munshi.app` | Vercel production URL |
| `ONBOARDING_MSG91_AUTH_KEY` | MSG91 auth for SMS OTP | `39xxxxxxxx...` | MSG91 dashboard |
| `ONBOARDING_MSG91_TEMPLATE_ID` | MSG91 OTP template | `6789xxxxxxxx...` | MSG91 dashboard |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | Return OTP in API JSON | `false` | Manual — **must be false in prod** |

### Optional (feature / ops)

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| `MUNSHI_TEAM_DASHBOARD_URL` | Team dashboard link in WA messages | `https://munshi-dada.vercel.app` | Manual |
| `MUNSHI_TEAM_CSV_TEMPLATE_URL` | CSV template override | `https://munshi.app/templates/team.csv` | Manual |
| `MUNSHI_INVENTORY_CSV_TEMPLATE_URL` | Inventory CSV template | `https://munshi.app/templates/inventory.csv` | Manual |
| `ONBOARD_WORKER_GOOGLE_FORM_URL` | Legacy Google Form link | `https://forms.google.com/...` | Manual |
| `MUNSHI_BOOK_DEMO_URL` | Demo booking link (owner home) | `https://cal.com/...` | Manual |
| `MUNSHI_DEMO_YOUTUBE_URL` | Demo video link | `https://youtube.com/watch?v=...` | Manual |
| `ZOHO_CLIENT_ID` | Zoho OAuth client | `1000.xxx` | Zoho API console |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth secret | `xxx` | Zoho API console |
| `ZOHO_REDIRECT_URI` | OAuth callback | `https://<backend>/integrations/zoho/callback` | Manual — must match Zoho app |
| `ZOHO_ACCOUNTS_URL` | Zoho accounts region | `https://accounts.zoho.in` | Zoho region |
| `ZOHO_INVENTORY_API_DOMAIN` | Zoho Inventory API host | `https://www.zohoapis.in` | Zoho region |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | AES key for stored tokens | `openssl rand -hex 32` | Generate |
| `ZOHO_SYNC_ENABLED` | Enable scheduled Zoho sync | `true` | Manual (default true in example) |
| `ZOHO_SYNC_INTERVAL_MINUTES` | Sync interval | `360` | Manual |
| `ZOHO_PUSH_RETRY_ENABLED` | Push retry cron | `true` | Manual |
| `WHATSAPP_TOKEN` | Meta Graph API token | `EAAx...` | Meta developer (if direct API) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID | `123456789` | Meta developer |
| `WHATSAPP_ONBOARDING_TEMPLATE` | WA template name | `team_onboarding` | Meta/Olli |
| `OLLI_MEDIA_BASE_URL` | Olli media CDN | `https://api.getolliai.com` | Optional override |
| `DOCUMENT_STORAGE_PATH` | Local file storage path | `/app/uploads` | Manual — ephemeral on Railway unless volume |
| `WORKFLOW_SESSION_TTL_HOURS` | Workflow session TTL | `24` | Manual |
| `AUTO_MIGRATE` | Run migrations on start | `1` | Manual (default on) |
| `NIXPACKS_NODE_VERSION` | Node version for build | `20` | Manual — recommended |

### Development-only (do not set on Railway prod)

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| `ENABLE_WEBHOOK_TEST_ROUTE` | Enable `POST /webhook/test` | `true` | Local `.env` only |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | Expose OTP in JSON when `true` | `true` | Local dev convenience |
| `.env` file | Local overrides | N/A | `backend/.env` (gitignored) |

### Production-only behavior (no extra env required)

| Behavior | Condition |
|----------|-----------|
| `POST /webhook/test` returns 404 | `ENABLE_WEBHOOK_TEST_ROUTE !== 'true'` |
| OTP not returned in API response | `ONBOARDING_OTP_EXPOSE_IN_RESPONSE=false` AND `NODE_ENV=production` |
| CORS restricted | `CORS_ORIGIN` set (not wildcard) |

---

## ML (Railway — private)

### Required

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| `OPENAI_API_KEY` | Classification, convert, extractors | `sk-proj-...` | OpenAI dashboard |
| `PORT` | Uvicorn bind port | Railway-assigned | Railway auto-inject |

### Optional

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| *(none consumed by code)* | `ml/.env.example` lists ops notes only | — | — |

**Note:** Uvicorn host/port are CLI args in Railway start command, not env vars.

---

## Web (Vercel)

### Required

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| `NEXT_PUBLIC_API_URL` | Browser → Backend API | `https://munshi-backend.up.railway.app` | Railway Backend public URL |
| `TURSO_DATABASE_URL` | Leads admin libSQL | `libsql://...` | Turso dashboard |
| `TURSO_AUTH_TOKEN` | Turso auth | `eyJ...` | Turso dashboard |
| `ADMIN_SECRET_KEY` | `x-admin-key` for `/api/leads` | `openssl rand -hex 32` | Generate |
| `WHATSAPP_BUSINESS_NUMBER` | Server-side WA number | `919876543210` | Business config |
| `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER` | Client-side wa.me link | `919876543210` | Same as above |

### Optional

| Variable | Purpose | Example value | Where it comes from |
|----------|---------|---------------|---------------------|
| `NEXT_PUBLIC_BOOK_DEMO_URL` | Marketing demo CTA | `https://cal.com/...` | Manual |
| `NEXT_PUBLIC_YOUTUBE_URL` | Marketing video | `https://youtube.com/...` | Manual |

---

## Cross-service reference map

```
Railway Postgres.DATABASE_URL  →  Backend POSTGRES_CONNECTION_STRING
Railway ML private domain      →  Backend ML_URL
Railway Backend public URL     →  Web NEXT_PUBLIC_API_URL
Backend MUNSHI_WEB_URL         →  Zoho redirect / CSV links (must match Vercel)
Backend CORS_ORIGIN            →  Must include Vercel domain(s)
Backend WHATSAPP_VERIFY_TOKEN  →  Must match Meta/Olli webhook config
```

---

## Secret generation checklist (before deploy)

- [ ] `X_SECRET` (Backend)
- [ ] `OTP_PEPPER` (Backend)
- [ ] `ADMIN_SECRET_KEY` (Vercel)
- [ ] `OPENAI_API_KEY` (ML — rotate if previously exposed)
- [ ] `OLLI_KEY` (Backend)
- [ ] `ONBOARDING_MSG91_AUTH_KEY` (Backend)
- [ ] `INTEGRATION_TOKEN_ENCRYPTION_KEY` (Backend — if Zoho enabled)
- [ ] `WHATSAPP_VERIFY_TOKEN` (Backend — coordinate with webhook setup)
