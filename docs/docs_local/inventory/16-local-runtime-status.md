# Local Runtime Status

**Run date:** 2026-06-05  
**Evidence:** `16-local-runtime-execution.md`, `16-local-runtime-defects.md`

---

## Status Matrix

| Component | Status | Evidence |
|-----------|--------|----------|
| **Backend Startup** | **FAIL** | `yarn dev` → `UnknownDependenciesException`: `OwnerHomeService` not injectable into `WhatsAppService` (DEF-LOCAL-001). Compilation and DB auth succeed; HTTP server never listens. |
| **Database** | **PASS** | Postgres 16.14 container running; `pg_isready` accepting connections on `:5432`. |
| **Migrations** | **PASS** | `yarn migrate:status` → 12 applied, 0 pending, `up_to_date: true`. `yarn migrate` → all `already_applied`, 0 errors. |
| **Integration Tests** | **FAIL** | 2 passed / 10 failed / 12 total in 19.155 s. Exit code 1. |
| **Inventory Runtime** | **FAIL** | Only Phase 0.1 foundation + scenario 7 (non-inventory reopen) PASS. All inventory-movement scenarios fail at DEF-PROD-001. |

---

## Backend Startup — FAIL

```text
Command: cd backend && yarn dev
Compile: PASS (0 errors)
Migrate on boot: PASS ("Database schema is up to date")
Models: PASS ("All models initialized and associated")
Listen: FAIL (UnknownDependenciesException — WhatsAppService → OwnerHomeService)
```

---

## Database — PASS

```text
Container: munshi_updated-postgres-1 (postgres:16-alpine)
Version: PostgreSQL 16.14
Port: localhost:5432 → munshi_data
```

---

## Migrations — PASS

```json
{
  "applied_count": 12,
  "pending_count": 0,
  "latest_applied": "010_task_inventory_lines.sql",
  "up_to_date": true
}
```

---

## Integration Tests — FAIL

```text
Test Suites: 1 failed, 1 total
Tests:       10 failed, 2 passed, 12 total
Time:        19.155 s
```

| PASS (2) | FAIL (10) |
|----------|-----------|
| Phase 0.1 — foundation | Scenarios 1–6, 8–10, Phase 0.2 |

Output: `docs/docs_local/inventory/_local-runtime-test-output.txt`

---

## Inventory Runtime — FAIL

| Scenario | Runtime result |
|----------|----------------|
| Task creation with inventory lines | **NOT VERIFIED** (fixture blocked) |
| Task retrieval with inventory lines | **NOT VERIFIED** |
| STOCK_OUT completion | **FAIL** |
| STOCK_IN completion | **FAIL** |
| Multi-line completion | **FAIL** |
| Rollback behavior | **FAIL** |
| Insufficient stock protection | **FAIL** |
| TRANSFER rejection | **FAIL** |
| assignToAll protection | **FAIL** |
| Duplicate completion protection | **FAIL** |
| Reopen protection (inventory-linked) | **FAIL** |
| Reopen non-inventory task | **PASS** |
| Schema / model / associations | **PASS** |

**Blocking defect:** DEF-PROD-001 (`FOR UPDATE` + LEFT OUTER JOIN in `findItemById`)

---

## Overall Verdict

The current codebase **does not pass** local runtime validation for inventory or full application startup. Database layer is healthy. Integration tests execute but predominantly fail. No code changes were made during this validation run.
