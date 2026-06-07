# Phase 4 Live Validation — Summary

**Run date:** 2026-06-07  
**Objective:** Close P4-UAT-010 (live WhatsApp E2E not completed)  
**Code modified:** None (environment + seed data only)

---

## Final Verdict

# PARTIAL PASS

Phase 4 **works end-to-end on a live stack** for **issue** and **inventory count** paths. **Delivery** with inventory/worker disambiguation **failed live**. WhatsApp **outbound notifications** attempted but **OLLI API rejected sends** (credentials/environment).

---

## P4-UAT-010 Status

# CLOSED (with caveats)

Live validation **was executed** on a running backend + ML + Postgres stack using `POST /webhook/test`. The original defect (“could not run live E2E”) is **resolved**. Remaining gaps are **functional** (disambiguation delivery, notifications), not “validation not attempted.”

---

## Stack Started

| Component | Status | Details |
|-----------|--------|---------|
| Postgres | **UP** | Remote staging `65.1.128.181:5431/munshi_data` |
| Migrations | **APPLIED** | 7 pending migrations applied (incl. `010_task_inventory_lines`) |
| ML service | **UP** | `http://127.0.0.1:8000/health` → `{"status":"ok"}` |
| Backend | **UP** | `http://127.0.0.1:4001` — Nest listening |
| Docker local | **N/A** | Docker Desktop not running; used remote DB |

### Startup steps (documented)

```powershell
# 1. ML (already running in this session)
cd ml
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 2. Apply migrations (once)
cd backend
$env:POSTGRES_CONNECTION_STRING='postgresql://munshi:***@65.1.128.181:5431/munshi_data'
npm run migrate

# 3. Point backend .env / .env.local POSTGRES to staging + SKIP_MIGRATION_BOOTSTRAP=1
# 4. Start backend
npm run dev

# 5. Seed ABC Manufacturing (one-time SQL seed script — see workflows report)
```

---

## ABC Manufacturing Seed IDs

| Entity | ID | Phone / SKU |
|--------|-----|-------------|
| Factory | **5** | ABC Manufacturing |
| Owner Priya | **37** | `919900000001` |
| Manager Rohit | **38** | `919900000002` |
| Worker Ram Kumar | **39** | `919900000003` |
| Worker Ram Singh | **40** | `919900000004` |
| Worker Shyam | **41** | `919900000005` |
| Cement 50kg | **18** | `CEMENT_50KG` |
| Cement Premium | **19** | `CEMENT_PREM` |
| White Cement | **20** | `WHITE_CEM` |
| PVC Pipe | **21** | `PVC_PIPE` |
| Paint | **22** | `PAINT_001` |
| Steel Rod | **23** | `STEEL_ROD` |

---

## Live Scenario Results

| Group | Scenario | Result |
|-------|----------|--------|
| 1 | Delivery happy path | **FAIL** — stuck/cancelled at disambiguation |
| 2 | Issue happy path | **PASS** — Task **#122** + inventory line |
| 3 | Inventory count | **PASS** — Task **#123** |
| 4 | Inventory disambiguation | **FAIL** — selection `1` → session **CANCELLED** |
| 5 | Worker disambiguation | **FAIL** — same as G4 |
| 6 | Double disambiguation | **FAIL** |
| 7 | Confirmation tokens | **PARTIAL** — `YES`/`haan`/`ok` at confirm step not fully isolated* |
| 8 | Cancellation tokens | **PASS** — `CANCEL`/`NO`/`2`/`nahi` cancel sessions |
| 9 | Invalid inputs | **PARTIAL** |
| 10 | Unknown inventory | **PASS** — blocking path (no task) |
| 11 | Unknown worker | **PASS** — blocking path |
| 12 | Duplicate confirm | **NOT PROVEN** — delivery never reached confirm |
| 13 | Expired session | **FAIL** — expiry SQL applied; reply still hit active session |
| 14 | Notifications | **FAIL** — OLLI send warnings in logs |
| 15 | Database | **PASS** — tasks + `task_inventory_lines` verified |
| 16 | Regression smoke | **PARTIAL** — `/help` returned HTTP 400 |

\*Many G7 runs hit `WAITING_INVENTORY_SELECTION` where `1` is selection not confirm.

---

## Evidence Artifact

Full machine-readable capture: `65-phase4-live-evidence.json`

---

## Report Index

| Report | Focus |
|--------|-------|
| `65-phase4-live-validation-webhooks.md` | Webhook payloads + API chain |
| `65-phase4-live-validation-workflows.md` | Session state transitions |
| `65-phase4-live-validation-database.md` | DB records |
| `65-phase4-live-validation-notifications.md` | OLLI outbound |
| `65-phase4-live-validation-defects.md` | Live-only defects |
| `65-phase4-live-validation-signoff.md` | Formal closure |

---

*End of live validation summary.*
