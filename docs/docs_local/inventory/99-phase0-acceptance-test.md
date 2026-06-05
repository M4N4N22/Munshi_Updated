# Phase 0 — Final Acceptance Test Report

**Run date:** 2026-06-06  
**Type:** End-to-end acceptance validation (no code changes)  
**Evidence file:** `_phase0-acceptance-output.json` (generated during run, gitignored)

---

## 1. Test Environment

| Component | Command / Check | Result | Evidence |
|-----------|-----------------|--------|----------|
| **Postgres** | Docker `munshi_updated-postgres-1` | **PASS** | `Up 2 hours` |
| **DB connectivity** | `SELECT 1` via `pg` client | **PASS** | `postgresql://munshi:munshi@localhost:5432/munshi_data` |
| **Migrations** | Applied (integration `beforeAll`) | **PASS** | Schema includes `task_inventory_lines` |
| **Backend running** | `GET http://127.0.0.1:4001/health` | **PASS** | `Postgres.status: up` |
| **Backend bootstrap** | `npx nest start` | **PASS** | `[NestApplication] Nest application successfully started +35ms` (port 4001 already bound by dev server → `EADDRINUSE` after bootstrap) |
| **Integration suite** | `yarn test:integration` | **PASS** | `Tests: 12 passed, 12 total` |

**Node:** v22.22.0 · **OS:** Windows 10

---

## 2. Test Data

| Entity | Value |
|--------|-------|
| Factory | `Munshi Demo Factory 1780685188614` (factory_id **127**) |
| Owner | Demo Owner · phone `91999001886141` |
| Manager | Demo Manager · phone `91999001886142` |
| Worker | Ramesh Worker · phone `91999001886143` |
| SKU | `CEMENT_50KG` |
| Item | Cement 50kg · unit `bag` · item_id **124** |
| Initial stock | **100** (via `recordStockIn`) |

Runtime executed via Nest test module + live services (same DI stack as production), plus separate integration suite and live server health check.

---

## 3. Scenario Results

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| **1** | Owner creates inventory item (qty 100) | **PASS** | `current_quantity = 100`, SKU `CEMENT_50KG` |
| **2** | `/assign_delivery @ramesh CEMENT_50KG 5` | **PASS** | Task **#87** created; 1 `task_inventory_lines` row; `STOCK_OUT`; assignee = worker |
| **3** | Worker views task + inventory linkage | **PASS** | Task visible in `getTasks()`; `adminFindOne` returns 1 inventory line |
| **4** | Worker completes task | **PASS** | `is_completed = true` |
| **5** | Inventory movement 100 → 95 | **PASS** | Qty **95**; 1 ledger row `reference_type=TASK` |
| **6** | Owner inventory-aware notification | **PASS** | Template includes item, movement, prev **100**, curr **95** (see §5) |
| **7** | Reopen inventory-linked task blocked | **PASS** | `cannot be reopened` |
| **8** | Insufficient stock (200 vs 95) | **PASS** | Completion blocked; qty remains **95** |
| **9** | Duplicate completion idempotent | **PASS** | Single movement; `already marked as completed` |
| **10** | `assignToAll` + inventory rejected | **PASS** | `assign-to-all` error |
| **11** | Non-inventory task unchanged | **PASS** | Generic task completes + reopens; stock unchanged at **95** |
| **12** | Integration regression | **PASS** | **12/12** |

---

## 4. Runtime Evidence

### Scenario 2 — assign_delivery response

```text
✅ Delivery task create ho gaya.

👤 Worker: Ramesh Worker
📦 Item: Cement 50kg
🔢 Qty: 5.0000

Task worker ko assign kar diya gaya hai.
```

Task description: `[DELIVERY] Cement 50kg bag (CEMENT_50KG) x5.0000`

### Scenario 4 — completion

```text
Task #87 marked as completed.

*Completed by:* Ramesh Worker (#381)
*Role:* Worker
```

### Scenario 5 — stock

| Metric | Before | After |
|--------|--------|-------|
| `CEMENT_50KG` qty | 100 | **95** |
| TASK ledger refs | 0 | **1** |

### Scenario 6 — notification preview (owner template)

```text
✅ Task #87 complete ho gaya.

📦 Cement 50kg bag
Stock: 100.0000 → 95.0000
Qty moved: 5.0000
Movement: Stock out (nikala)

✔️ Completed by: Ramesh Worker
🎭 Role: Worker
```

### Scenario 8 — insufficient stock

- Over-task `quantity_expected: 200` → completion rejected
- `current_quantity` unchanged at **95**

### Integration suite (Scenario 12)

```text
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Time:        ~10 s
Exit code:   0
```

### Live server health

```json
{"data":{"status":"ok","info":{"Postgres":{"status":"up"}}},"meta":{"success":true}}
```

---

## 5. Logs / Screenshots

No UI screenshots (WhatsApp-first backend). Key logs captured:

1. **Nest bootstrap:** `Nest application successfully started`
2. **Integration:** 12 green checks (STOCK_OUT, STOCK_IN, rollback, reopen, assignToAll, duplicate, persistence)
3. **Acceptance JSON:** `docs/docs_local/inventory/_phase0-acceptance-output.json`
4. **Live webhook note:** `POST /webhook/test` with assign_delivery returned **HTTP 401** when OLLI attempted outbound send (see `99-phase0-defects.md` DEF-ACC-001). Task creation still persisted in an earlier run (factory 115, task 74).

---

## 6. Pass / Fail Matrix

| Gate | Status |
|------|--------|
| Backend Startup | **PASS** |
| Database | **PASS** |
| Integration Suite | **PASS** |
| Scenario 1 | **PASS** |
| Scenario 2 | **PASS** |
| Scenario 3 | **PASS** |
| Scenario 4 | **PASS** |
| Scenario 5 | **PASS** |
| Scenario 6 | **PASS** |
| Scenario 7 | **PASS** |
| Scenario 8 | **PASS** |
| Scenario 9 | **PASS** |
| Scenario 10 | **PASS** |
| Scenario 11 | **PASS** |
| Scenario 12 | **PASS** |

**Live WhatsApp HTTP delivery (OLLI):** **NOT VERIFIED** — `OLLI_KEY` empty in `.env`; outbound send returns 401. Inventory/task logic unaffected.

---

## 7. Final Verdict

### **PHASE 0 ACCEPTED**

All Phase 0 inventory ↔ task acceptance scenarios passed with runtime evidence. Integration suite **12/12 PASS**. Backend bootstraps and connects to Postgres.

**Caveat:** Live WhatsApp outbound via OLLI is not configured in this environment (DEF-ACC-001). Core Phase 0 scope — task lines, stock movement, guards, notifications template — is validated.
