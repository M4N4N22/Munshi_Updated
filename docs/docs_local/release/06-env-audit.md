# Phase 6 — Environment Variable Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  

---

## Backend (`backend/.env.example`)

| Variable | Classification | Documented | Used in code |
|----------|----------------|------------|--------------|
| `PORT` | Required (prod) | Yes | Yes — default mismatch (`3000` in code) |
| `CORS_ORIGIN` | Required (prod) | Yes | Yes |
| `POSTGRES_CONNECTION_STRING` | **Required** | Yes | Yes |
| `ML_URL` | **Required** | Yes | Yes |
| `ONBOARD_WORKER_GOOGLE_FORM_URL` | Optional | Yes | Yes |
| `MUNSHI_TEAM_DASHBOARD_URL` | Optional | Yes | Yes |
| `MUNSHI_WEB_URL` | Required (Zoho redirect) | Yes (duplicate keys) | Yes |
| `MUNSHI_TEAM_CSV_TEMPLATE_URL` | Optional | Commented | Yes |
| `MUNSHI_INVENTORY_CSV_TEMPLATE_URL` | Optional | Commented | Yes |
| `MUNSHI_PUBLIC_API_HOST` | Optional | Commented | Spec only |
| `MUNSHI_BOOK_DEMO_URL` | Optional | Yes | Yes |
| `MUNSHI_DEMO_YOUTUBE_URL` | Optional | Yes | Yes |
| `WHATSAPP_VERIFY_TOKEN` | **Required** | Yes | Yes |
| `OLLI_URL` | Required | Yes | Yes |
| `OLLI_KEY` | **Required** | Yes | Yes |
| `OLLI_MEDIA_BASE_URL` | Optional | Commented | Yes |
| `X_SECRET` | Required | Yes | Yes (guard + OTP fallback) |
| `OTP_PEPPER` | **Required (prod)** | Yes | Yes |
| `ZOHO_CLIENT_ID` | Required (Zoho) | Yes | Yes |
| `ZOHO_CLIENT_SECRET` | Required (Zoho) | Yes | Yes |
| `ZOHO_REDIRECT_URI` | Required (Zoho) | Yes | Yes |
| `ZOHO_ACCOUNTS_URL` | Required (Zoho) | Yes | Yes |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | **Required (Zoho)** | Yes | Yes |
| `ZOHO_INVENTORY_API_DOMAIN` | Optional | Commented | Yes |
| `ZOHO_SYNC_ENABLED` | Optional | Yes | Yes |
| `ZOHO_SYNC_INTERVAL_MINUTES` | Optional | Yes | Yes |

### Backend — used but NOT in `.env.example`

| Variable | Classification | Used in |
|----------|----------------|---------|
| `SKIP_MIGRATION_BOOTSTRAP` | Dev/ops | `main.ts`, `docker-entrypoint.mjs` |
| `AUTO_MIGRATE` | Production | `Dockerfile`, migration runner |
| `ONBOARDING_MSG91_AUTH_KEY` | **Required (OTP SMS)** | `onboarding-sms.service.ts` |
| `ONBOARDING_MSG91_TEMPLATE_ID` | **Required (OTP SMS)** | `onboarding-sms.service.ts` |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | Dev-only danger | `onboarding-sms.service.ts` |
| `WHATSAPP_TOKEN` | Optional/legacy | `whatsapp.service.ts` |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional/legacy | `whatsapp.service.ts` |
| `WHATSAPP_ONBOARDING_TEMPLATE` | Optional | `factories.service.ts` |
| `DOCUMENT_STORAGE_PATH` | Dev-only default | `local-storage.provider.ts` |
| `WORKFLOW_SESSION_TTL_HOURS` | Optional | `workflow.constants.ts` |
| `ZOHO_PUSH_RETRY_ENABLED` | Optional | `zoho-push-retry.constants.ts` |
| `MUNSHI_DASHBOARD_URL` | Optional fallback | `team-setup-outbound.ts` |
| `NODE_ENV` | Production | `onboarding-sms.service.ts` |

### Backend documentation defects

- `MUNSHI_WEB_URL` defined **twice** in `.env.example` (lines 16 and 47) with conflicting values
- Root `.env.example` is a subset — missing Zoho, integration, and demo vars

---

## ML (`ml/.env.example`)

| Variable | Classification | Documented | Used in code |
|----------|----------------|------------|--------------|
| `OPENAI_API_KEY` | **Required** | Yes | Yes (`bot_engine.py`) |

All other vars in `.env.example` are commented as hardcoded (host, port, model).

### ML documentation defects

- **`OPENAI_API_KEY` contains a real-looking `sk-proj-…` key** — see security audit (CRITICAL)

---

## Web (`web/.env.example`)

| Variable | Classification | Documented | Used in code |
|----------|----------------|------------|--------------|
| `NEXT_PUBLIC_API_URL` | **Required** | Yes | Yes |
| `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER` | Optional display | Yes | Yes |
| `WHATSAPP_BUSINESS_NUMBER` | Required (wa.me) | Yes | Yes |
| `NEXT_PUBLIC_BOOK_DEMO_URL` | Optional | Yes | Yes |
| `NEXT_PUBLIC_YOUTUBE_URL` | Optional | Yes | Yes |

### Web — used but NOT in `.env.example`

| Variable | Classification | Used in |
|----------|----------------|---------|
| `TURSO_DATABASE_URL` | **Required (leads)** | `web/lib/db.ts` |
| `TURSO_AUTH_TOKEN` | **Required (leads)** | `web/lib/db.ts` |
| `ADMIN_SECRET_KEY` | **Required (admin API)** | `web/app/api/leads/route.ts` |

---

## Classification summary

| Tier | Backend | ML | Web |
|------|---------|-----|-----|
| Required (prod) | 8+ (DB, Olli, ML, OTP pepper, CORS) | 1 (OpenAI) | 2+ (API URL, Turso, admin key) |
| Optional | Zoho, demo URLs, sync tuning | — | Marketing links |
| Dev-only | `DOCUMENT_STORAGE_PATH`, OTP expose, localhost fallbacks | — | localhost fallbacks |
| Production-only | `AUTO_MIGRATE`, Supabase connection | — | Vercel env |

---

## Gaps

| Gap | Severity |
|-----|----------|
| MSG91 OTP vars missing from `backend/.env.example` | HIGH |
| Turso + admin key missing from `web/.env.example` | HIGH |
| Duplicate `MUNSHI_WEB_URL` in backend example | MEDIUM |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` undocumented | MEDIUM |
| Live API key in `ml/.env.example` | **CRITICAL** |
