# Demo Startup Report — Prompt 13.8

## Executive Summary

**Objective:** Start all services, run setup scripts, verify demo mode, validate certified flow.

**Implementation:** Executed `demo-setup-users-data.mjs`, `migration-status.mjs`, `run-demo-mode-validation.mjs`, and `run-demo-startup-verification.mjs`.

**Result:** All services healthy. 14/14 certified flow steps passed. WhatsApp outbound confirmed to both demo phones.

**PASS / FAIL:** **PASS**

**Validated:** 2026-06-02T15:38:27.870Z

---

## Part A — Services Started / Verified

| Service | Process | Port | Status | Health |
|---------|---------|------|--------|--------|
| PostgreSQL | Remote DB | 5431 | UP | Postgres status: up |
| Backend | NestJS `yarn dev` | 4001 | UP | GET /health → ok |
| ML | Intent classifier | 8000 | UP | GET /health → ok |
| WhatsApp | Olli WABA API | HTTPS | CONFIGURED | Outbound 200 to both phones |
| Migrations | Embedded in backend | — | UP | 8/8 applied, 0 pending |
| Schedulers | AttendanceCronService | — | RUNNING | Embedded in backend |
| Queues | — | — | N/A | None required for demo |

No additional workers or queues needed for recording.

---

## Part B — Configuration Verified

| Check | Evidence | Result |
|-------|----------|--------|
| DEMO_MODE=true | `.env.local` + API | ✅ enabled: true, 13 phrases |
| Factory 3 | id 3 | ✅ |
| Owner 7452897444 | Shantanu Garg, role OWNER | ✅ |
| Manager 9456157007 | Rahul Verma, role MANAGER | ✅ |
| Steel Sheets | SKU DEMO-STEEL-001, qty 120.0000 | ✅ |
| Gupta Metals | id 12, phone 9999999999 | ✅ |
| Departments | Inventory, Operations, Sales | ✅ |
| Worker Rahul Kumar | id 35 | ✅ |
| Active stale sessions | 0 before flow | ✅ cleared |

---

## Part C — Scripts Executed

1. `node scripts/demo-setup-users-data.mjs` — owner/manager/vendor/inventory verified
2. `node scripts/migration-status.mjs` — migrations up to date
3. `node scripts/run-demo-mode-validation.mjs` — 15/15 pass
4. `node scripts/run-demo-startup-verification.mjs` — full startup audit

---

## Part D — Demo Mode

```json
GET /demo-mode/status
{
  "enabled": true,
  "phrase_count": 13
}
```

DemoModeService loaded (API responds). Demo intercept active when `enabled: true`.

---

## Scripts / Evidence Files

- `docs/reports/demo-startup-results.json`
- `docs/reports/demo-mode-test-results.json`
