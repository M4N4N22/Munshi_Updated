# Phase 0.5A — Harness Fix — Validation Report

**Run date:** 2026-06-05  
**Command:** `cd backend && yarn test:integration`

---

## 1. Environment Validation

| Check | Result | Evidence |
|-------|--------|----------|
| Node | **PASS** | v22.22.0 |
| Yarn | **PASS** | 1.22.22 |
| Docker | **PASS** | 29.4.1 |
| `POSTGRES_CONNECTION_STRING` loaded | **PASS** | `probePostgres()` true; migrate:status connects |

---

## 2. Docker Validation

**Command:**

```powershell
docker compose -f docker-compose.example.yml ps postgres
```

**Result:** **PASS** — `munshi_updated-postgres-1` Up, port 5432 mapped.

---

## 3. Postgres Validation

**Command:**

```powershell
docker compose -f docker-compose.example.yml exec -T postgres pg_isready -U munshi -d munshi_data
```

**Result:** **PASS** — accepting connections.

---

## 4. Migration Validation

**Command:** `yarn migrate:status`

```json
{
  "applied_count": 12,
  "pending_count": 0,
  "latest_applied": "010_task_inventory_lines.sql",
  "up_to_date": true
}
```

**Result:** **PASS**

---

## 5. Integration Test Validation

**Command:** `yarn test:integration`

```text
Test Suites: 1 failed, 1 total
Tests:       10 failed, 2 passed, 12 total
Time:        ~13 s
```

| Harness check | Result | Evidence |
|---------------|--------|----------|
| `beforeAll` completes | **PASS** | No migration path error |
| NestJS app boots | **PASS** | Sequelize SQL logged |
| Postgres probe | **PASS** | Tests run (not skipped) |
| All 12 reach test body | **PASS** | Each scenario executes (pass or fail) |

**Result:** **PASS** (harness unblocked)

---

## 6. Scenario Validation Results

| # | Scenario | Phase | Result | Evidence |
|---|----------|-------|--------|----------|
| 0.1 | Migration / model / associations | 0.1 | **PASS** | 59 ms; columns + model + association verified |
| 1 | Single STOCK_OUT completion | 0.3 | **FAIL** | `findItemById` at `recordStockIn` — DEF-PROD-001 |
| 2 | Single STOCK_IN completion | 0.3 | **FAIL** | Same |
| 3 | Multi-line completion success | 0.4 | **FAIL** | Same (fixture seed) |
| 4 | Multi-line failure rollback | 0.4 | **FAIL** | Same |
| 5 | Insufficient stock | 0.3 | **FAIL** | Same |
| 6 | Reopen inventory-linked rejected | 0.4 | **FAIL** | Same |
| 7 | Reopen non-inventory succeeds | 0.4 | **PASS** | 197 ms; reopen message matched |
| 8 | assignToAll + lines rejected | 0.3 | **FAIL** | Same (needs inventory item) |
| 9 | TRANSFER rejected | 0.3 | **FAIL** | Same |
| 10 | Duplicate completion idempotent | 0.3 | **FAIL** | Same |
| 0.2 | Persist / retrieve / delete | 0.2 | **FAIL** | Same |

### Phase summary

| Phase | Result |
|-------|--------|
| 0.1 Foundation | **PASS** |
| 0.2 Persistence | **FAIL** |
| 0.3 Movement | **FAIL** |
| 0.4 Safety | **PARTIAL** (scenario 7 PASS only) |

---

## 7. Evidence

### Harness fix confirmation

Before fix — all tests failed at:

```text
Cannot find module '...\backend\test\scripts\apply-migrations.mjs'
```

After fix — sample SQL from Phase 0.1:

```text
SELECT column_name FROM information_schema.columns
WHERE table_name = 'task_inventory_lines'
```

### Production defect (DEF-PROD-001)

Failure stack (10 scenarios):

```text
inventory-transaction.service.ts:126
  → repository.findItemById(..., transaction)
  → phase0-fixtures.ts:134 createInventoryItemWithStock
```

SQL pattern before ROLLBACK:

```sql
SELECT ... FROM "inventory_items" AS "InventoryItem"
LEFT OUTER JOIN "inventory_categories" AS "category" ...
LEFT OUTER JOIN "inventory_locations" AS "location" ...
WHERE ... FOR UPDATE;
```

**Root cause hypothesis:** PostgreSQL rejects `FOR UPDATE` on queries with `LEFT OUTER JOIN` on nullable sides.

Full output: `docs/docs_local/inventory/_harness-fix-test-output.txt`

---

## 8. Final Validation Summary

| Area | Verdict |
|------|---------|
| DEF-RT-001 resolved | **PASS** |
| DEF-RT-002 verified | **PASS** |
| Harness executes application logic | **PASS** |
| All Phase 0 scenarios PASS | **FAIL** (2/12) |
| Production code unchanged this task | **PASS** |

**Overall harness fix task:** **SUCCESS** — blockers removed; new production defect documented for follow-up.
