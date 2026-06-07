# Phase 4 — Web Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  
**Verdict:** **PASS WITH ISSUES**

---

## Build & test execution

| Command | Result | Notes |
|---------|--------|-------|
| `npm install` | PASS | 306 packages |
| `npm run build` | **PASS** | Next.js 16.1.6 (Turbopack), 8 routes |
| `npm test` (vitest) | **PASS** | 4 tests in `integrations-panel.test.tsx` |

### Production routes built

| Route | Type |
|-------|------|
| `/` | Static |
| `/onboarding` | Dynamic |
| `/integrations` | Static |
| `/admin` | Static |
| `/privacy` | Static |
| `/api/leads` | Dynamic |
| `/api/whatsapp` | Dynamic |
| `/api/whatsapp/status` | Dynamic |

---

## Vercel compatibility

| Check | Result |
|-------|--------|
| `vercel.json` | Not present — deploy via dashboard (`web/README.md`) |
| Root Directory = `web` | Documented |
| `next.config.mjs` | Minimal (`turbopack: {}` only) — compatible |
| Server routes | App Router API routes — Vercel-compatible |
| `@libsql/client` (Turso) | Used for leads — requires `TURSO_*` env on Vercel |

**Verdict:** Vercel-deployable with correct env configuration.

---

## Environment variable usage

**Documented in `web/.env.example`:**

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER`
- `WHATSAPP_BUSINESS_NUMBER`
- `NEXT_PUBLIC_BOOK_DEMO_URL`
- `NEXT_PUBLIC_YOUTUBE_URL`

**Used in code but NOT in `.env.example`:**

| Variable | Used in | Required for |
|----------|---------|--------------|
| `TURSO_DATABASE_URL` | `web/lib/db.ts` | Leads admin (`/admin`, `/api/leads`) |
| `TURSO_AUTH_TOKEN` | `web/lib/db.ts` | Leads admin |
| `ADMIN_SECRET_KEY` | `web/app/api/leads/route.ts` | Admin API auth |

---

## API references

| Client | Target | Fallback |
|--------|--------|----------|
| `web/lib/config.ts` | `NEXT_PUBLIC_API_URL` | `http://localhost:4001` |
| `web/lib/api/client.ts` | Same | Error message references localhost |
| Integrations panel | `buildZohoAuthorizeUrl()` → backend `/integrations/zoho/authorize` | OK |

No broken relative API paths detected. Production requires `NEXT_PUBLIC_API_URL` pointing to deployed backend (not localhost).

---

## Lockfile conflict

`web/` contains **three** lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`). README says `npm install`; user currently has `yarn.lock` open — risk of divergent dependency trees.

---

## Localhost references

| File | Context | Acceptable? |
|------|---------|-------------|
| `lib/config.ts:5` | Dev fallback for API URL | Yes (with env set in prod) |
| `app/onboarding/page.tsx:36` | Debug display of API URL | Yes |
| `__tests__/integrations-panel.test.tsx` | Test mock URL | Yes |

---

## Railway readiness

No `railway.toml` or Railway references. Web is designed for **Vercel**, not Railway.

---

## Summary

| Category | Result |
|----------|--------|
| Production build | PASS |
| Unit tests | PASS (minimal — 4 tests) |
| Vercel compatibility | PASS |
| Env documentation | **FAIL** (missing Turso + admin key) |
| Lockfile hygiene | **FAIL** |

**Overall:** **PASS WITH ISSUES**
