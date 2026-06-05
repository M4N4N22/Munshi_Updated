# Phase 0.5 — Runtime Validation — Results Report

**Latest run:** 2026-06-05 (Phase 0.5A harness fix + re-validation)  
**Prior run:** 2026-06-05 (infrastructure only — harness blocked)  
**Command:** `cd backend && yarn test:integration`  
**Postgres:** available (`localhost:5432`, Docker `postgres:16-alpine`)

Classifications: **PASS**, **FAIL**, **NOT VERIFIED**.

---

## Environment Evidence

```text
Node:     v22.22.0
Yarn:     1.22.22
Docker:   29.4.1
Compose:  v5.1.3

POSTGRES_CONNECTION_STRING=postgresql://munshi:***@localhost:5432/munshi_data
(from backend/.env.local via setup-env.ts)

docker compose -f docker-compose.example.yml up postgres -d
→ Container munshi_updated-postgres-1 Started

yarn migrate:status
→ applied_count: 12, pending_count: 0, up_to_date: true
```

---

## Scenario Results

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 0.1 | Migration / model / associations | **PASS** | Integration test 59 ms; columns + `TaskInventoryLine` + association |
| 1 | Single STOCK_OUT completion | **FAIL** | `findItemById` in `recordStockIn` — DEF-PROD-001 |
| 2 | Single STOCK_IN completion | **FAIL** | Same |
| 3 | Multi-line completion success | **FAIL** | Same (fixture seed) |
| 4 | Multi-line failure rollback | **FAIL** | Same |
| 5 | Insufficient stock blocks complete | **FAIL** | Same |
| 6 | Reopen inventory-linked rejected | **FAIL** | Same |
| 7 | Reopen non-inventory succeeds | **PASS** | 197 ms; reopen message matched |
| 8 | assignToAll + lines rejected | **FAIL** | Same (needs inventory item) |
| 9 | TRANSFER rejected | **FAIL** | Same |
| 10 | Duplicate completion idempotent | **FAIL** | Same |
| 0.2 | Persist / retrieve / delete | **FAIL** | Same |

---

## Test Harness Results

| Check | Result | Evidence |
|-------|--------|----------|
| Integration test file compiles | **PASS** | Jest executed 12 tests |
| Jest config valid | **PASS** | `jest-integration.json` loaded |
| `test:integration` script | **PASS** | Runs from `backend/package.json` |
| Postgres probe | **PASS** | `probePostgres()` true |
| `runMigrations()` path (DEF-RT-001) | **PASS** | Fixed — `db-env.ts` uses `../../..` |
| Env loading (DEF-RT-002) | **PASS** | `setup-env.ts` `../..` → `backend/` |
| All scenarios reach app logic | **PASS** | 12/12 execute (not blocked at setup) |

---

## Jest Output Summary

```text
Test Suites: 1 failed, 1 total
Tests:       10 failed, 2 passed, 12 total
Time:        ~13 s

Failure (10 tests):
inventory-transaction.service.ts:126 → repository.findItemById (DEF-PROD-001)
  at createInventoryItemWithStock (phase0-fixtures.ts:134)
```

Full output: `docs/docs_local/inventory/_harness-fix-test-output.txt`

---

## Migration Runtime Evidence

| Migration | Status |
|-----------|--------|
| 010_task_inventory_lines.sql | **PASS** — applied |
| All 12 migrations | **PASS** — up to date |

---

## Phase Coverage (runtime)

| Phase | Runtime status |
|-------|----------------|
| 0.1 Foundation | **PASS** |
| 0.2 Persistence | **FAIL** |
| 0.3 Movement | **FAIL** |
| 0.4 Atomicity + reopen | **FAIL** (Scenario 7 PASS only) |

---

## Defects Discovered

| Defect | Severity | Status |
|--------|----------|--------|
| DEF-RT-001: `db-env.ts` wrong root | High | **FIXED** (0.5A) |
| DEF-RT-002: `setup-env.ts` path | Low | **VERIFIED OK** — original path correct |
| DEF-PROD-001: `findItemById` FOR UPDATE + LEFT JOIN | High | **OPEN** — document only |

See `12-runtime-readiness-final.md` and `12-harness-fix-validation.md`.

---

## Final Summary

| Metric | Value |
|--------|-------|
| Tests written | 12 |
| Tests PASS (runtime) | 2 |
| Tests FAIL (runtime) | 10 |
| Tests NOT VERIFIED | 0 |
| Harness blockers | 0 |
| Production defects found | 1 (DEF-PROD-001) |

**Deployment readiness:** **NOT READY** until DEF-PROD-001 fixed and integration suite **12/12 PASS**.

---

## NEXT IMPLEMENTATION TARGETS

1. Fix DEF-PROD-001 in `InventoryRepository.findItemById` (production — next prompt).
2. Re-run `yarn test:integration`; update this document.
3. Add GitHub Actions job with Postgres service + `yarn test:integration`.
4. Proceed to Phase 0.6 after all scenarios PASS.
