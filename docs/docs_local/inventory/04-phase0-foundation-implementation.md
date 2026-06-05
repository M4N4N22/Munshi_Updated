# Phase 0.1 — Task Inventory Lines Foundation — Implementation Report

## 1. Executive Summary

Phase 0.1 adds the **persistence foundation** for `task_inventory_lines`: one SQL migration, one Sequelize model (`TaskInventoryLine`), structural associations on `Task`, and registration in the shared SQL model registry. No service-layer, DTO, WhatsApp, or inventory-transaction logic was introduced.

All changes are **additive**. Existing task, inventory, and related modules compile unchanged.

---

## 2. Files Changed

| File | Action |
|------|--------|
| `backend/migrations/010_task_inventory_lines.sql` | **Created** — table + indexes |
| `backend/migrations/README.md` | **Updated** — migration index entry |
| `backend/src/services/tasks/tasks.schema.ts` | **Updated** — `TaskInventoryLine` model + associations |
| `backend/src/core/services/db-service/models.ts` | **Updated** — model registration |

No other application files were modified for this phase.

---

## 3. Exact Changes Made

### Migration (`010_task_inventory_lines.sql`)

- Wrapped in `BEGIN` / `COMMIT` (matches `006_procurement_foundation.sql`).
- `CREATE TABLE IF NOT EXISTS task_inventory_lines` with columns:
  - `id SERIAL PRIMARY KEY`
  - `factory_id INTEGER NOT NULL`
  - `task_id INTEGER NOT NULL`
  - `inventory_item_id INTEGER NOT NULL`
  - `quantity_expected NUMERIC(18, 4) NOT NULL`
  - `quantity_completed NUMERIC(18, 4) NOT NULL DEFAULT 0`
  - `movement_type VARCHAR(64) NOT NULL`
  - `created_at` / `updated_at` `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Indexes:
  - `idx_task_inventory_lines_task_id`
  - `idx_task_inventory_lines_inventory_item_id`
  - `idx_task_inventory_lines_factory_id`
- **No foreign key constraints** (consistent with `backend/migrations/README.md` notes).

### Sequelize model (`tasks.schema.ts`)

- Added `TaskInventoryLine` class after `TaskUpdate` in the Tasks domain schema file.
- Field types mirror migration: `DECIMAL(18, 4)` for quantities, `STRING(64)` for `movement_type`.
- `quantity_completed` defaults to `0` at DB and model level.
- Sequelize `indexes` array mirrors migration indexes (same pattern as `inventory.schema.ts`).

### Associations (`tasks.schema.ts`)

- `Task.hasMany(TaskInventoryLine, { foreignKey: 'task_id', as: 'inventory_lines' })`
- `TaskInventoryLine.belongsTo(Task, { foreignKey: 'task_id', as: 'task', onDelete: 'CASCADE' })`
- `TaskInventoryLine.belongsTo(InventoryItem, { foreignKey: 'inventory_item_id', as: 'inventory_item' })`

`onDelete: 'CASCADE'` on the line→task association matches `TaskUpdate.belongsTo(Task)`.

### Model registration (`models.ts`)

- Import `TaskInventoryLine` from `tasks.schema.ts`.
- Register `TaskInventoryLine: TaskInventoryLine.setup` in `SQL_MODELS` immediately after `TaskUpdate`.

### Migration README

- Added row for `010_task_inventory_lines.sql` in the migration index table.

---

## 4. Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Location: `backend/src/services/tasks/tasks.schema.ts`** | Matches Option A from `02-task-inventory-architecture-mapping.md`. Precedent: `Task` + `TaskUpdate` colocated; `PurchaseRequest` + `PurchaseRequestItem` in purchase-requests schema. Parent domain owns line/junction tables. |
| **Quantity precision `NUMERIC(18, 4)` / `DECIMAL(18, 4)`** | Aligns with `inventory_items.current_quantity`, `purchase_request_items.requested_quantity`, and `INVENTORY_QUANTITY_SCALE = 4`. |
| **No FK constraints in SQL** | Repository convention documented in `backend/migrations/README.md`; app enforces `factory_id` scoping. |
| **`movement_type` as `VARCHAR(64)`** | Phase 0.1 is structural only; values (`STOCK_IN`, `STOCK_OUT`, `TRANSFER`, etc.) enforced in future service layer. No DB enum/check constraint (matches string status columns elsewhere). |
| **`factory_id` on line table** | Required by spec; supports factory-scoped queries without joining `tasks` (index on `factory_id`). |
| **Association alias `inventory_lines`** | Distinguishes from `updates` (`TaskUpdate`) and follows plural `as` naming on `Task.hasMany`. |
| **No `InventoryItem.hasMany(TaskInventoryLine)`** | Inverse association not required for Phase 0.1; `PurchaseRequestItem` similarly only declares `belongsTo` from the child side. `inventory.schema.ts` was not modified (forbidden). |

---

## 5. Migration Summary

| Property | Value |
|----------|-------|
| File | `010_task_inventory_lines.sql` |
| Sort order | Last among 12 `.sql` files (after `009_owner_multi_department_head.sql`) |
| Idempotent | Yes (`IF NOT EXISTS` on table and indexes) |
| Transaction | `BEGIN` / `COMMIT` |

---

## 6. Model Summary

| Property | Value |
|----------|-------|
| Class | `TaskInventoryLine` |
| Table | `task_inventory_lines` |
| Timestamps | `created_at`, `updated_at` (`underscored: true`) |
| Quantity fields | `string` TypeScript declare (Sequelize `DECIMAL` pattern, same as `PurchaseRequestItem.requested_quantity`) |

---

## 7. Association Summary

```
Task
  └── hasMany TaskInventoryLine (as: inventory_lines)

TaskInventoryLine
  ├── belongsTo Task (as: task, onDelete: CASCADE)
  └── belongsTo InventoryItem (as: inventory_item)
```

Association pass runs after all models init in `sql.provider.ts` (unchanged bootstrap path).

---

## 8. Deviations From Plan

| Item | Deviation | Notes |
|------|-----------|-------|
| `migrations/README.md` update | None — within allowed `backend/migrations/` path | Documents migration for tooling/operators |
| `onDelete: CASCADE` on line→task | Not explicitly in Phase 0.1 spec | Matches existing `TaskUpdate` child pattern |
| Sequelize model `indexes` | Spec listed SQL indexes only | Also declared in model init per `inventory.schema.ts` precedent |

No forbidden files were modified. No service/DTO/integration work was added.

---

## 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration not applied in environments without Postgres at validation time | Low | Migration is idempotent; apply via `yarn migrate` on deploy |
| `movement_type` unconstrained at DB | Low | Future phase adds validation against inventory transaction types |
| `onDelete: CASCADE` deletes lines when task row deleted | Low | Consistent with `task_updates`; acceptable for orphan prevention |
| No FK on `inventory_item_id` | Low | Existing repo pattern; app-layer validation in future phases |
| `TRANSFER` vs `ADJUSTMENT` naming (future) | Medium | Documented for Phase 0.2+; not resolved in 0.1 |

---

## 10. Remaining Work

- Apply migration in each environment (`yarn migrate`).
- Phase 0.2+: repository or direct model access in `TasksService`.
- DTO changes for task create/complete with inventory lines.
- Hook `completeTask()` / admin complete paths to `InventoryTransactionService.applyMovement()`.
- WhatsApp commands and notifications.
- Optional `task_kind` column on `tasks`.
- Decide `adminComplete` / `adminUpdate` stock behavior vs WhatsApp-only completion.
- `assignToAll` + per-task line duplication strategy.
- Atomic `sequelize.transaction()` for task completion + stock movement.

---

## NEXT IMPLEMENTATION TARGETS

1. **Repository or service accessors** for `TaskInventoryLine` CRUD (without touching forbidden files until allowed).
2. **DTO extensions** on task create/update payloads for inventory line input.
3. **`completeTask()` integration** — read lines, call `InventoryTransactionService.applyMovement()`, set `quantity_completed`, `reference_type: 'TASK'`.
4. **REST admin paths** — align `adminComplete` / `adminUpdate` with stock policy.
5. **`TasksModule` import of `InventoryModule`** for transaction service injection.
6. **Movement type enum alignment** — map `TRANSFER` to inventory `ADJUSTMENT` or extend constants.
7. **Partial completion** — business rules for `quantity_completed` < `quantity_expected`.
8. **Factory scoping validation** on line create (task `factory_id` + item `factory_id` match).
