# Phase 0.6 — Inventory Regression Audit

**Run date:** 2026-06-05  
**Method:** Static code review + runtime integration test evidence  
**Note:** Prompt 13 reports (`13-def-prod-001-*.md`) were not present in the repository; DEF-PROD-001 status inferred from code and test output.

---

## 1. Database Audit

| Item | Classification | Evidence |
|------|----------------|----------|
| `task_inventory_lines` table (010) | **PASS** | Migration `010_task_inventory_lines.sql`; integration test 0.1 verifies columns |
| Columns: id, factory_id, task_id, inventory_item_id, qty fields, movement_type | **PASS** | Schema matches `TaskInventoryLine` model |
| Indexes on task_id, inventory_item_id, factory_id | **PASS** | Migration lines 19–26 |
| FK constraints on task_inventory_lines | **WARNING** | Intentionally omitted per migration README (app-level factory scoping) |
| `inventory_items` table | **PASS** | `001_traderos_foundation.sql`; unique (factory_id, sku) |
| `inventory_transactions` table | **PASS** | Append-only ledger; reference_type/reference_id indexed |
| `inventory_transactions.reference` index | **PASS** | Supports TASK linkage queries |
| Migration 010 applied at runtime | **PASS** | `migrate:status` → 12/12, latest `010_task_inventory_lines.sql` |

---

## 2. ORM Audit

| Item | Classification | Evidence |
|------|----------------|----------|
| `TaskInventoryLine` model | **PASS** | `tasks.schema.ts` lines 177–245 |
| Table name mapping | **PASS** | `tableName: 'task_inventory_lines'` |
| `Task.hasMany(inventory_lines)` | **PASS** | Association defined; integration test 0.1 PASS |
| `TaskInventoryLine.belongsTo(Task)` | **PASS** | `tasks.schema.ts` associate block |
| `TaskInventoryLine.belongsTo(InventoryItem)` | **PASS** | Used in `adminFindOne` include |
| Model registration in `models.ts` | **PASS** | `TaskInventoryLine: TaskInventoryLine.setup` |
| `findItemById` with transaction + lock | **FAIL** | `FOR UPDATE` + `LEFT OUTER JOIN` — DEF-PROD-001; blocks stock movements |
| `findItemById` without transaction | **PASS** | Used in read paths; includes work without lock |

---

## 3. Service Audit

### TasksService

| Item | Classification | Evidence |
|------|----------------|----------|
| `persistInventoryLines` on create | **PASS** | `bulkCreate` in `tasks.service.ts:71–87` |
| `adminFindOne` includes inventory_lines | **PASS** | Lines 1149–1160 |
| `adminRemove` destroys inventory lines | **PASS** | Line 1335 |
| `assignToAll` rejects inventory_lines | **WARNING** | Code present (`tasks.service.ts:444–447`); runtime blocked by DEF-PROD-001 fixture |
| `completeTaskWithAtomicInventory` | **PASS** | Single Sequelize transaction wraps movements + task update |
| `assertInventoryLinkedTaskCanReopen` | **PASS** | Blocks reopen when lines exist |
| `adminComplete` idempotency | **PASS** | Early return when already completed (line 1344–1345) |
| `executeTaskInventoryMovements` helper | **PASS** | STOCK_IN/OUT, TRANSFER rejection, TASK reference type |

### InventoryTransactionService

| Item | Classification | Evidence |
|------|----------------|----------|
| `recordStockIn` / `recordStockOut` | **FAIL** | Runtime fails at `findItemById` inside transaction (DEF-PROD-001) |
| Transaction propagation (`parentTransaction`) | **PASS** | `applyMovement` accepts optional transaction; used by atomic completion |
| Insufficient stock guard | **WARNING** | Code at lines 142–145; not runtime-verified due to DEF-PROD-001 |
| TASK reference_type on movements | **WARNING** | Helper sets `TASK_INVENTORY_REFERENCE_TYPE`; not runtime-verified |

### InventoryRepository

| Item | Classification | Evidence |
|------|----------------|----------|
| `updateItemQuantity` with transaction | **PASS** | Requires transaction parameter |
| `createTransaction` with transaction | **PASS** | Ledger writes inside caller transaction |
| `findItemById` locking strategy | **FAIL** | DEF-PROD-001 — incompatible query for PostgreSQL |

---

## 4. DTO Audit

| Item | Classification | Evidence |
|------|----------------|----------|
| `TaskInventoryLineDto` | **PASS** | `inventory_item_id`, `quantity_expected`, `movement_type` with validators |
| `CreateTaskDto.inventory_lines` | **PASS** | Optional array with `@Type(() => TaskInventoryLineDto)` |
| Swagger annotations | **PASS** | `@ApiPropertyOptional` on nested lines |
| No quantity_completed in create DTO | **PASS** | Correctly deferred (future phase) |
| No TRANSFER in DTO validation | **WARNING** | Rejected at completion time, not at create — acceptable for Phase 0 |

---

## 5. Risk Register

| ID | Area | Severity | Classification | Description |
|----|------|----------|----------------|-------------|
| DEF-PROD-001 | Repository | **Critical** | **FAIL** | `findItemById` FOR UPDATE + LEFT JOIN breaks all transactional movements |
| R-001 | Database | Low | **WARNING** | No FK on task_inventory_lines — orphan rows possible if tasks deleted outside service |
| R-002 | Idempotency | Low | **WARNING** | Duplicate completion guarded at task level; no DB unique on (reference_type, reference_id, task) |
| R-003 | quantity_completed | Info | **WARNING** | Column exists but always 0 — future phase |
| R-004 | CI | Medium | **WARNING** | Workflow will fail until DEF-PROD-001 fixed |
| R-005 | Test harness | Low | **WARNING** | Jest open-handles warning after suite |

---

## 6. Recommendations

1. **Block deploy** until DEF-PROD-001 fixed and integration suite 12/12 PASS.
2. After fix: confirm CI workflow turns green on next push to `main`.
3. Consider adding FK `task_inventory_lines.task_id → tasks.id ON DELETE CASCADE` in a future migration (optional hardening).
4. Do not proceed to Phase 1 features (notifications, low stock, WhatsApp assignment) until runtime sign-off complete.

---

## Phase Regression Summary

| Phase | Static audit | Runtime audit |
|-------|--------------|---------------|
| 0.1 Foundation | **PASS** | **PASS** (test 0.1) |
| 0.2 Persistence | **PASS** | **FAIL** (DEF-PROD-001 blocks fixture) |
| 0.3 Movement | **PASS** | **FAIL** |
| 0.4 Safety | **PASS** | **PARTIAL** (scenario 7 PASS only) |
| 0.5 Integration | **PASS** | **FAIL** (2/12) |
