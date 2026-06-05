# Phase 0.6 — Runtime Validation Report

**Run date:** 2026-06-05  
**Command:** `cd backend && yarn migrate:status && yarn test:integration`  
**Postgres:** Docker `postgres:16-alpine` on `localhost:5432`  
**Note:** Prompt 13 reports not found; DEF-PROD-001 remains open in production code.

---

## 1. Test Results

```text
Test Suites: 1 failed, 1 total
Tests:       10 failed, 2 passed, 12 total
Time:        10.217 s
Exit code:   1
```

| # | Scenario | Phase | Result | Time |
|---|----------|-------|--------|------|
| 0.1 | Foundation (schema + model) | 0.1 | **PASS** | 91 ms |
| 1 | Single STOCK_OUT completion | 0.3 | **FAIL** | 237 ms |
| 2 | Single STOCK_IN completion | 0.3 | **FAIL** | 77 ms |
| 3 | Multi-line completion success | 0.4 | **FAIL** | 78 ms |
| 4 | Multi-line failure rollback | 0.4 | **FAIL** | 71 ms |
| 5 | Insufficient stock | 0.3 | **FAIL** | 72 ms |
| 6 | Reopen inventory-linked task | 0.4 | **FAIL** | 74 ms |
| 7 | Reopen non-inventory task | 0.4 | **PASS** | 226 ms |
| 8 | assignToAll + inventory_lines | 0.3 | **FAIL** | 79 ms |
| 9 | TRANSFER rejection | 0.3 | **FAIL** | 70 ms |
| 10 | Duplicate completion | 0.3 | **FAIL** | 78 ms |
| 0.2 | Persist / retrieve / delete | 0.2 | **FAIL** | 69 ms |

### Pass count / fail count

| Metric | Value |
|--------|-------|
| PASS | 2 |
| FAIL | 10 |
| NOT VERIFIED | 0 |

---

## 2. Runtime Evidence

### Migration status

```json
{
  "applied_count": 12,
  "pending_count": 0,
  "latest_applied": "010_task_inventory_lines.sql",
  "up_to_date": true
}
```

### Harness

| Check | Result |
|-------|--------|
| Postgres probe | PASS |
| `runMigrations()` in beforeAll | PASS |
| NestJS app boot | PASS |
| Application logic reached | PASS (all 12 tests execute) |

### Failure pattern (10 tests)

```text
inventory-transaction.service.ts:126
  → repository.findItemById(..., transaction)
  → createInventoryItemWithStock (phase0-fixtures.ts:134)
```

SQL before ROLLBACK:

```sql
SELECT ... FROM inventory_items
LEFT OUTER JOIN inventory_categories ...
LEFT OUTER JOIN inventory_locations ...
WHERE ... FOR UPDATE;
```

Full output: `docs/docs_local/inventory/_phase06-test-output.txt`

---

## 3. Warnings

| Warning | Detail |
|---------|--------|
| Jest open handles | `Jest did not exit one second after the test run has completed` |
| DRY_RUN env | Cleared before run; CI sets no DRY_RUN |
| Prompt 13 docs missing | `13-def-prod-001-*.md` not in repo; defect still present in code |
| CI will fail | New workflow correctly blocks until DEF-PROD-001 fixed |

---

## 4. Outstanding Issues

| ID | Severity | Status | Blocks |
|----|----------|--------|--------|
| DEF-PROD-001 | Critical | **OPEN** | Scenarios 1–6, 8–10, 0.2 |
| Jest open handles | Low | OPEN | CI log noise only |

---

## 5. Final Runtime Verdict

| Criterion | Verdict |
|-----------|---------|
| Integration suite executes | **PASS** |
| All scenarios PASS | **FAIL** (2/12) |
| Phase 0.1 runtime verified | **PASS** |
| Phases 0.2–0.4 runtime verified | **FAIL** |
| Production sign-off | **BLOCKED** |

**Final runtime verdict: FAIL** — implementation complete in code, but runtime validation does not pass. DEF-PROD-001 must be resolved before production deployment.
