# Phase 0.4 Preparation — Inventory Safety Hardening Validation

Documentation-only validation of analysis claims. Classifications: **PASS**, **FAIL**, **NOT VERIFIED**.

---

## Verified Transaction Behavior

| Claim | Result | Evidence |
|-------|--------|----------|
| Each `recordStockOut/In` uses own Sequelize transaction | **PASS** | `applyMovement` → `repository.sequelize.transaction(...)` |
| `applyMovement` is private | **PASS** | `inventory-transaction.service.ts` |
| Public methods do not accept parent transaction | **PASS** | `RecordStockMovementInput` only |
| Repository supports `transaction` param on item/ledger ops | **PASS** | `inventory.repository.ts` `findItemById`, `createTransaction`, `updateItemQuantity` |
| Tasks module uses no Sequelize transaction | **PASS** | Grep `sequelize.transaction` in `tasks/` → no matches |
| Multi-line loop is sequential | **PASS** | `for (const line of lines)` in helper |
| Task update after all lines | **PASS** | `runInventoryMovementsForCompletion` before `task.update` in all completion paths |

---

## Verified Reopen Paths

| Path | Result | Evidence |
|------|--------|----------|
| `PATCH /tasks/:id/reopen` | **PASS** | `TasksController.reopen` → `adminComplete(id, false)` |
| `PATCH /tasks/:id` `{ is_completed: false }` | **PASS** | `adminUpdate` patch |
| Reopen skips inventory helper | **PASS** | Movement only when completing (`is_completed true` / `becomesComplete`) |
| Reopen sends no notification | **PASS** | `notifyTaskCompleted` only on complete branches |
| WhatsApp reopen | **NOT VERIFIED IN CODEBASE** | No `/reopen` in `intent-types.json` |

---

## Verified Rollback Behavior

| Scope | Rollback on failure? | Result | Evidence |
|-------|---------------------|--------|----------|
| Single line movement | Yes — full movement rolled back | **PASS** | Sequelize transaction in `applyMovement` |
| Prior lines in multi-line loop | No — already committed | **PASS** | Separate transactions per iteration |
| Task row on movement failure | Stays incomplete | **PASS** | Update after helper |
| Automatic compensating STOCK_IN on partial failure | No | **PASS** | No such code |

---

## Unresolved Areas

| Area | Classification |
|------|----------------|
| Live multi-line partial failure test | **NOT VERIFIED** |
| Nested transaction / savepoint pattern in repo | **NOT VERIFIED IN CODEBASE** |
| Best reopen policy (A/B/C) | **NOT VERIFIED** — product decision |
| Phase 0.4 allowed to modify inventory service | **NOT VERIFIED** |
| REST auth on task endpoints | **NOT VERIFIED IN CODEBASE** |
| Runtime Phase 0.1–0.3 checklist | **NOT VERIFIED** — Postgres unavailable |

---

## Summary

| Category | PASS | FAIL | NOT VERIFIED |
|----------|------|------|--------------|
| Transaction ownership / boundaries | 7 | 0 | 1 |
| Reopen paths | 4 | 0 | 1 |
| Rollback scope | 4 | 0 | 0 |
| Live / product gaps | 0 | 0 | 5 |

**Analysis validation:** **PASS** — documented behavior matches codebase.

---

## NEXT IMPLEMENTATION TARGETS

1. Close NOT VERIFIED items with Postgres integration tests in Phase 0.4.
2. Confirm whether inventory service changes are in scope for atomicity.
