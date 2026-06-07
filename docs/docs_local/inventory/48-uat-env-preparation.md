# UAT Environment Preparation

**Run date:** 2026-06-06  
**Scope:** Phase 0–3 User Acceptance Testing — environment only (no feature changes)  
**Working directory:** `backend/`

---

## Executive Summary

| Gate | Result |
|------|--------|
| Environment variables | **PASS** |
| Dependencies (`npm install`) | **PASS** |
| PostgreSQL reachable | **PASS** |
| Migrations up to date | **PASS** |
| ML service reachable | **FAIL** (documented — not fixed) |
| Backend build | **PASS** |

**UAT environment status:** **READY** for backend testing with **ML-dependent WhatsApp flows deferred** until `ML_URL` service is started.

---

## Environment Variables

Verified presence (values **not** recorded):

| Variable | Status | Notes |
|----------|--------|-------|
| `OTP_PEPPER` | **PASS** | Set to UAT value `test-pepper-123` (was empty) |
| `PORT` | **PASS** | Set (4 chars) |
| `POSTGRES_CONNECTION_STRING` | **PASS** | Set — local PostgreSQL |
| `ML_URL` | **PASS** | Set — `http://localhost:8000` |
| `WHATSAPP_VERIFY_TOKEN` | **PASS** | Set |
| `OLLI_URL` | **PASS** | Set |
| `OLLI_KEY` | **PASS** | Set |
| `X_SECRET` | **PASS** | Set |

Additional vars present in `.env` (not required by this checklist): `CORS_ORIGIN`, onboarding/demo URLs, etc.

---

## Step 1 — Dependencies

```bash
cd backend
npm install
```

| Check | Result |
|-------|--------|
| Exit code 0 | **PASS** |
| Missing packages | **PASS** — 907 packages audited |
| Lockfile consistent | **PASS** |

**Note:** npm audit reports 49 vulnerabilities (pre-existing); not addressed per task scope.

---

## Step 2 — Database

| Check | Result | Evidence |
|-------|--------|----------|
| PostgreSQL reachable | **PASS** | `migrate:status` connected to `localhost:5432/munshi_data` |
| Migration bootstrap | **PASS** | 15/15 applied, `pending_count: 0` |
| Latest migration | **PASS** | `013_push_delivery_retry.sql` |
| Boot migration on start | **PASS** | Log: `[migrate] Database schema is up to date` |

```json
{
  "total_files": 15,
  "applied_count": 15,
  "pending_count": 0,
  "up_to_date": true
}
```

---

## Step 3 — ML Service

| Check | Result | Evidence |
|-------|--------|----------|
| `ML_URL` configured | **PASS** | Env var set |
| HTTP root reachable | **FAIL** | Connection refused on port 8000 |
| `/classify` endpoint | **FAIL** | Connection refused |

**Impact on UAT:**

- WhatsApp messages that route through ML intent classification will not work until ML is running.
- Slash commands, workflow commands, and direct API paths unaffected.
- **Not fixed** per task instructions — document only.

**Action for testers:** Start ML service on port 8000 before UAT scenarios involving free-text WhatsApp messages.

---

## Step 4 — Build

```bash
npm run build
```

| Check | Result |
|-------|--------|
| `nest build` | **PASS** |

---

## Step 5 — Cron Registration (static)

Crons registered via `@nestjs/schedule` when modules load:

| Cron class | Module provider | Schedule | Result |
|------------|-----------------|----------|--------|
| `DomainEventsProcessorCron` | `DomainEventsModule` | Every minute | **PASS** |
| `ZohoScheduledSyncCron` | `IntegrationModule` | Every 10 minutes | **PASS** |
| `ZohoPushRetryCron` | `IntegrationModule` | Every minute | **PASS** |
| `WorkflowExpiryCronService` | `WorkflowModule` | Every hour | **PASS** |

`ScheduleModule` initialized at startup (see runtime validation report).

---

## Step 6 — Pre-startup Blockers

| Blocker | Result |
|---------|--------|
| Missing required env | **PASS** — none |
| Pending migrations | **PASS** |
| Build failure | **PASS** |
| Postgres unreachable | **PASS** |

---

## Changes Made (environment only)

| File | Change |
|------|--------|
| `backend/.env` | Set `OTP_PEPPER=test-pepper-123` (was empty) |

No business logic, migrations, or feature code modified.

---

## UAT Readiness Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Backend builds | **PASS** |
| 2 | Database reachable | **PASS** |
| 3 | Migrations applied | **PASS** |
| 4 | Required env vars present | **PASS** |
| 5 | ML documented if down | **PASS** |
| 6 | Crons registered in code | **PASS** |
| 7 | Ready for acceptance testing | **PASS** (with ML caveat) |

---

## Recommended UAT Startup Order

1. Start PostgreSQL (already running for this validation).
2. Start ML service at `ML_URL` (port 8000) — **required for NLP WhatsApp flows**.
3. Start backend: `cd backend && npm run start` (port 4001).
4. Verify: `GET http://localhost:4001/health` → Postgres `up`.
5. Verify: `GET http://localhost:4001/health/migrations` → 200.

---

## Related Report

Runtime startup validation: `48-uat-runtime-validation.md`
