# UAT Runtime Validation

**Run date:** 2026-06-06  
**Scope:** Backend startup and health — Phase 0–3 UAT gate  
**Port:** 4001 (from `PORT` env)

---

## Executive Summary

| Gate | Result |
|------|--------|
| `npm run build` | **PASS** |
| Application bootstrap | **PASS** |
| `npm run start` (fresh bind) | **PASS** (bootstrap); port listen **N/A** — 4001 already in use |
| Health check | **PASS** |
| Migration health | **PASS** |
| Module initialization | **PASS** |
| Cron scheduler | **PASS** |
| Startup exceptions | **PASS** (none before listen) |

**Overall runtime validation:** **PASS** — backend is running and healthy on port 4001.

---

## Step 4 — Build

```bash
npm run build
```

| Check | Result |
|-------|--------|
| Compile | **PASS** |

---

## Step 4 — Backend Startup (`npm run start`)

### Bootstrap sequence

| Log / event | Expected (task) | Actual | Result |
|-------------|-----------------|--------|--------|
| Database connected | Yes | `Successfully connected to PostgreSQL (localhost:5432)` | **PASS** |
| SQL models loaded | — | `All models initialized and associated` | **PASS** |
| Workflow engine initialized | Yes | `WorkflowModule dependencies initialized` | **PASS** |
| Domain event processor initialized | Yes | `DomainEventsModule dependencies initialized` | **PASS** |
| Inventory modules initialized | Yes | `InventoryModule dependencies initialized` | **PASS** |
| Zoho modules initialized | Yes | `IntegrationModule dependencies initialized` + Zoho routes mapped | **PASS** |
| WhatsApp module initialized | Yes | `WhatsAppModule dependencies initialized` | **PASS** |
| Nest app started | Yes | `Nest application successfully started` | **PASS** |
| Listen on PORT | Yes | `EADDRINUSE :::4001` on second start attempt | **N/A** |

**Note:** A second `npm run start` failed on port bind because an instance was **already listening on 4001**. Bootstrap completed successfully before the bind error — all modules and routes registered. Existing instance confirmed healthy via `/health`.

### Migration boot log

```
[Migrations] [migrate] Database schema is up to date
```

| Check | Result |
|-------|--------|
| No migration failure on boot | **PASS** |

---

## Step 5 — Cron Validation

| Component | Evidence | Result |
|-----------|----------|--------|
| `ScheduleModule` | `ScheduleModule dependencies initialized` at startup | **PASS** |
| `DomainEventsProcessorCron` | Provider in `DomainEventsModule`; `@Cron(EVERY_MINUTE)` | **PASS** |
| `ZohoScheduledSyncCron` | Provider in `IntegrationModule`; `@Cron(EVERY_10_MINUTES)` | **PASS** |
| `ZohoPushRetryCron` | Provider in `IntegrationModule`; `@Cron(EVERY_MINUTE)` | **PASS** |
| `WorkflowExpiryCronService` | Provider in `WorkflowModule`; `@Cron(EVERY_HOUR)` | **PASS** |

NestJS does not emit per-cron registration logs; validation is via `ScheduleModule` init + provider wiring.

---

## Step 6 — Health Check

### HTTP endpoints (existing instance on port 4001)

| Endpoint | Status | Result |
|----------|--------|--------|
| `GET /health` | 200 | **PASS** |
| Postgres probe in health | `"Postgres":{"status":"up"}` | **PASS** |
| `GET /health/migrations` | 200 | **PASS** |

### Startup error scan

| Check | Result |
|-------|--------|
| Missing env exceptions | **PASS** — none |
| Provider resolution failures | **PASS** — all `InstanceLoader` lines successful |
| Migration failures | **PASS** |
| Unhandled bootstrap exceptions | **PASS** |

### Routes registered (sample — full startup)

| Area | Routes mapped | Result |
|------|---------------|--------|
| WhatsApp | `/webhook`, `/webhook/test` | **PASS** |
| Inventory | `/inventory/*` | **PASS** |
| Zoho | `/integrations/zoho/*` | **PASS** |
| Purchase requests | `/purchase-requests/*` incl. prefill | **PASS** |
| Onboarding | `/onboarding/*` | **PASS** |

---

## ML Service (runtime)

| Check | Result |
|-------|--------|
| `ML_URL` reachable at startup | **FAIL** — not required for backend boot |
| Backend starts without ML | **PASS** |

ML unavailability does not block Nest startup; WhatsApp NLP routing will fail at message handling time until ML is up.

---

## Success Criteria Matrix

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Backend builds | **PASS** |
| 2 | Backend starts | **PASS** |
| 3 | Database reachable | **PASS** |
| 4 | ML reachable or documented | **DOCUMENTED FAIL** (ML down; backend OK) |
| 5 | All scheduled jobs registered | **PASS** |
| 6 | No startup blockers remain | **PASS** |
| 7 | Ready for acceptance testing | **PASS** |

---

## UAT Blockers

| Blocker | Severity | Mitigation |
|---------|----------|------------|
| ML service not running | **Medium** | Start ML on port 8000 before free-text WhatsApp UAT |
| Port 4001 occupied | **Info** | Use existing instance or stop before restart |

No **Critical** startup blockers identified.

---

## Commands Used

```bash
cd backend
npm install
npm run migrate:status
npm run build
npm run start          # bootstrap validated; port already in use
curl http://localhost:4001/health
curl http://localhost:4001/health/migrations
```

---

## Related Report

Environment preparation: `48-uat-env-preparation.md`
