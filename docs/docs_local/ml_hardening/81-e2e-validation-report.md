# Phase 10 — E2E Validation Report

**Branch:** `feature/shantanu-ml-hardening-v1`  
**Validated:** 2026-06-11T16:47Z (approx)  
**Factory tested:** **3 — Munshi Dada**  
**Artifacts:** `e2e-validation-results.json`, `79-e2e-factory-discovery.md`, `80-e2e-workflow-matrix.md`

---

## Executive summary

Live end-to-end validation was executed against running **ML** (`:8000`) and **backend** (`:4001`) services with **Postgres** on the shared dev host. Webhook injection used `POST /webhook/test` with `ENABLE_WEBHOOK_TEST_ROUTE=true`.

| Metric | Value |
|--------|-------|
| Automated E2E cases | 33 |
| **Pass** | **28** |
| **Fail** | **5** |
| Intent success (29 classified cases) | **86.2%** (25/29) |
| Full workflow success (automated script) | **84.8%** (28/33) |
| DB consistency audit | **PASS** |
| Workflow capability coverage | **77%** live (23/30); **91%** pass on exercised flows |

### Verdict

**ML hardening succeeds beyond intent-only on the majority of production paths**, but **does not yet succeed end-to-end on all hardened clusters**.

- **Intent-only success:** 86.2% on live phrases
- **Full-path success:** ~85% automated; ~91% on capability matrix when adjusted for non-session flows
- **Remaining gaps:** `depart_assign` ↔ `task_inventory_nl` boundary, `task_inventory_nl` ↔ `/assign` bleed, `update` ↔ `/complete` collision on short phrases

---

## 1. Factories tested

| Factory ID | Name | Role in validation |
|------------|------|--------------------|
| **3** | Munshi Dada | Primary — all webhook E2E, DB audit |
| 1, 2, 4, 5 | Production/demo tenants | Discovery only (listed, not exercised) |
| 6–125 | Phase0 test factories | Discovery only |

---

## 2. Workflows tested

### Owner journey (7/7 pass)

| Step | Intent | Webhook | DB / session |
|------|--------|---------|--------------|
| Attendance report | `/report` ✓ | ✓ | N/A |
| Task assign | `/assign` ✓ | ✓ | Task id 112 |
| Inventory status | `/inventory_status` ✓ | ✓ | N/A |
| Inventory create start | `/inventory_create` ✓ | ✓ | INVENTORY_CREATE ACTIVE |
| Purchase request start | `/purchase_request_create` ✓ | ✓ | PURCHASE_REQUEST_CREATE ACTIVE |
| Vendor onboard start | `/onboard_vendor` ✓ | ✓ | ONBOARD_VENDOR ACTIVE |
| Members | `/members` ✓ | ✓ | N/A |

### Manager journey (5/6 pass)

| Step | Intent | Webhook | Notes |
|------|--------|---------|-------|
| mgrassign | ✓ | ✓ | Task 67 routed |
| mgrtransfer | ✓ | ✓ | |
| mgrself | ✓ | ✓ | |
| mgrreject | ✓ | ✓ | |
| inventory_status | ✓ | ✓ | |
| depart_assign | **✗** `/assign_clarify` | ✓ | Task 73 still created — **routing mismatch** |

### Worker journey (5/5 pass)

| Step | Intent | Webhook | DB |
|------|--------|---------|-----|
| present | ✓ | ✓ | `attendance.is_present=true` |
| tasks | ✓ | ✓ | |
| update | ✓ | ✓ | |
| issue | ✓ | ✓ | Issue id 13 |
| issues list | ✓ | ✓ | |

### ML hardening clusters (8/11 intent, 9/11 path)

| Cluster | Result | Failure mode |
|---------|--------|--------------|
| assign | PASS | |
| depart_assign | **FAIL** | → `/task_inventory_nl` |
| assign_clarify | PASS | |
| assign_delivery | PASS | |
| task_inventory_nl | **FAIL** | → `/assign` |
| inventory_status | PASS | |
| inventory_create | PASS | |
| inventory_import_csv | PASS* | *Intent + handler OK; no `workflow_sessions` row (by design) |
| cancel | PASS | |
| mgrself | PASS | |
| update | **FAIL** | `update: half done` → `/complete` |

### Failure testing (4/4 pass)

- Worker vendor onboard → graceful
- Invalid task id → graceful
- Cancel abandons workflow → verified
- Unknown worker assign → graceful

---

## 3. Pass / fail counts

| Suite | Pass | Fail | Rate |
|-------|------|------|------|
| Owner journey | 7 | 0 | 100% |
| Manager journey | 5 | 1 | 83% |
| Worker journey | 5 | 0 | 100% |
| ML hardening clusters | 8 | 3 | 73% |
| Failure tests | 4 | 0 | 100% |
| **Total automated** | **28** | **5** | **84.8%** |

---

## 4. Intent vs workflow success

| Layer | Rate | Evidence |
|-------|------|----------|
| **Intent only** | 86.2% | ML `/classify` on live phrases |
| **Webhook accepted** | 100% | All cases returned HTTP 201 + `data: ok` after env fix |
| **Handler + DB outcome** | ~91% on exercised capabilities | Tasks, attendance, issues, sessions verified |
| **Intent + route + outcome** | 84.8% strict automated | 5 failures above |

---

## 5. DB consistency findings

Post-run audit on factory 3:

| Check | Result |
|-------|--------|
| Orphan task assignees | 0 |
| Duplicate attendance rows | 0 |
| Stuck ACTIVE sessions (test phones) | 0 |
| Broken routing tasks (`assigned_to` null + AWAITING_MANAGER) | 0 |

**No duplicate, orphan, or broken workflow states detected** from this validation run.

---

## 6. Routing failures

| Phrase | Expected route | Actual ML intent | Backend behavior |
|--------|----------------|------------------|------------------|
| `sales department ko audit ka kaam do` | `/depart_assign` | `/assign_clarify` | Webhook OK; task created (wrong classifier path) |
| `loading department ko stock count do` | `/depart_assign` | `/task_inventory_nl` | Webhook OK |
| `prateek se 20 glue bottles count karwao` | `/task_inventory_nl` | `/assign` | Webhook OK; wrong task shape |
| `update: half done` | `/update` | `/complete` | Webhook OK; wrong lifecycle action |

Manager routing commands (`/mgrassign`, `/mgrtransfer`, `/mgrself`, `/mgrreject`) — **0 routing failures**.

---

## 7. ML failures (live)

| Cluster | Root cause (observed) |
|---------|----------------------|
| depart_assign | Stock/count NL patterns steal department-assign phrases |
| task_inventory_nl | Person-first phrasing (`prateek se …`) routes to `/assign` |
| update | Short `update: half done` collides with `/complete` heuristics |

Prior benchmark suites (smoke 200/200, workflow 429/429) remain green — failures appear on **live phrase variants** not in eval fixtures.

---

## 8. Critical blockers

| # | Blocker | Severity | Ship impact |
|---|---------|----------|-------------|
| 1 | `depart_assign` / `task_inventory_nl` boundary regressions on live phrases | **High** | Wrong task type in production WhatsApp |
| 2 | `task_inventory_nl` → `/assign` on `X se Y count` pattern | **High** | Inventory-linked tasks miss stock semantics |
| 3 | `update:` prefix → `/complete` | **Medium** | Progress updates may close tasks |
| 4 | Local dev requires remote PG + `ENABLE_WEBHOOK_TEST_ROUTE` for E2E | **Low** | CI/dev ergonomics only |
| 5 | `main.ts` dotenv `override: true` prevents shell PG override | **Low** | Local backend boot friction |

**No data corruption or DB integrity blockers found.**

---

## 9. Ship readiness assessment

| Dimension | Score | Notes |
|-----------|-------|-------|
| Core owner ops | 9/10 | Assign, inventory, PR, vendor, members solid |
| Manager routing | 9/10 | All four mgr commands E2E green |
| Worker ops | 9/10 | Present, tasks, update, issues solid |
| ML hardened boundaries | 6/10 | 3/11 cluster phrases fail live |
| DB integrity | 10/10 | Clean audit |
| **Overall** | **7.5/10** | Aligns with doc 77 real-world audit |

### Recommendation

**Conditional ship** for hardened **inventory_status**, **inventory_create**, **onboard_vendor**, **mgr***, **assign**, **assign_clarify**, **assign_delivery**, **cancel**.

**Hold or fast-follow** for:
- `depart_assign` / `task_inventory_nl` disambiguation
- `update` vs `/complete` on abbreviated progress phrases

---

## 10. ML hardening: end-to-end or intent-only?

| Question | Answer |
|----------|--------|
| Did hardening work only at intent classification? | **No** — 28/33 cases proved intent → webhook → handler → DB/session |
| Did hardening work end-to-end on all clusters? | **No** — 3 hardened clusters still misroute on live phrases |
| Benchmark vs live gap? | Benchmarks 100% workflow; live E2E 86% intent / 85% strict full-path |

**Conclusion:** ML Hardening V2 **succeeded end-to-end for the operational sink, manager routing, and inventory/vendor create/status paths**. It **succeeded only at intent level** (or wrong handler) for **department vs inventory NL boundaries** and **short update phrases**.

---

## Appendix — environment & execution notes

1. Backend boot: `SKIP_MIGRATION_BOOTSTRAP=1` (local migration bootstrap unavailable)
2. Postgres: remote dev host `65.1.128.181:5431` (local `localhost:5432` not running)
3. Webhook: JSON wrapper `{"data":"ok"}` — validation script updated to parse
4. Scripts: `backend/scripts/run-e2e-validation.mjs`, `e2e-factory-discovery.mjs`
5. `.env` restored to `localhost:5432` after validation
