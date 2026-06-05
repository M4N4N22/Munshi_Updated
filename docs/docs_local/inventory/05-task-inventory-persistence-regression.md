# Phase 0.2 — Task Inventory Persistence — Regression Report

Classifications: **PASS**, **FAIL**, **NOT VERIFIED**.

---

## Phase 0.1

| Check | Result | Evidence |
|-------|--------|----------|
| Migration still valid | **PASS** | `010_task_inventory_lines.sql` unchanged in Phase 0.2 |
| `TaskInventoryLine` model still valid | **PASS** | `tasks.schema.ts` unchanged; build exit 0 |
| Associations still valid | **PASS** | Build exit 0; associate pass unchanged |
| Model registration still valid | **PASS** | `models.ts` unchanged; `TaskInventoryLine` in `SQL_MODELS` |

---

## Existing Functionality

### Task creation

| Check | Result | Evidence |
|-------|--------|----------|
| `adminCreate` without `inventory_lines` | **PASS** | `persistInventoryLines` returns early when `!lines?.length` |
| `assignToUser` signature backward compatible | **PASS** | `inventory_lines` optional in `options` |
| `assignToAll` signature backward compatible | **PASS** | Same |
| Routing / notifications unchanged | **PASS** | Notification blocks untouched |
| WhatsApp `handleAssign` unchanged | **PASS** | Forbidden `whatsapp/*` not modified |

### Task updates

| Check | Result | Evidence |
|-------|--------|----------|
| `addUpdate` / `adminAddUpdate` | **PASS** | No edits |
| `adminGetUpdates` | **PASS** | No edits |

### Task completion

| Check | Result | Evidence |
|-------|--------|----------|
| `completeTask` | **PASS** | Method body unchanged |
| `adminComplete` | **PASS** | Method body unchanged |
| `adminUpdate` completion branch | **PASS** | No inventory logic added |

### Inventory

| Check | Result | Evidence |
|-------|--------|----------|
| Inventory schema | **PASS** | `inventory/*` not modified |
| Inventory services | **PASS** | No imports from tasks to inventory services |
| Stock quantities | **PASS** | No `applyMovement` / `recordStock*` in tasks |

### Inventory transactions

| Check | Result | Evidence |
|-------|--------|----------|
| Transaction service untouched | **PASS** | Forbidden path not modified |
| No new transaction rows from tasks | **PASS** | Persistence only writes `task_inventory_lines` |

### Model registration

| Check | Result | Evidence |
|-------|--------|----------|
| `SQL_MODELS` registry | **PASS** | Phase 0.1 registration intact |
| `DbService` bootstrap | **PASS** | Build succeeds |

---

## Phase 0.2

### DTO support

| Check | Result | Evidence |
|-------|--------|----------|
| `inventory_lines` on `CreateTaskDto` | **PASS** | Field + validators present |
| `TaskInventoryLineDto` | **PASS** | New file with three required fields |
| Nested validation | **PASS** | class-validator test — 0 errors valid, errors on invalid |

### Persistence support

| Check | Result | Evidence |
|-------|--------|----------|
| REST create path | **PASS** | `adminCreate` → `persistInventoryLines` |
| Internal single assign | **PASS** | `assignToUser` → `persistInventoryLines` |
| Internal batch assign | **PASS** | `assignToAll` loop |
| End-to-end DB write | **NOT VERIFIED** | Postgres unavailable |

### Retrieval support

| Check | Result | Evidence |
|-------|--------|----------|
| `adminFindOne` include | **PASS** | `inventory_lines` + `inventory_item` |
| List/WhatsApp flows unchanged | **PASS** | No new includes on `getTasks` / `adminList` |

### Deletion behavior

| Check | Result | Evidence |
|-------|--------|----------|
| `adminRemove` destroys lines | **PASS** | `taskInventoryLineModel.destroy` before `task.destroy` |
| Consistent with `TaskUpdate` | **PASS** | Same explicit destroy pattern |
| Live delete test | **NOT VERIFIED** | No DB |

---

## Regression Summary

| Area | Classification |
|------|----------------|
| Phase 0.1 foundation | **PASS** |
| Task creation (no lines) | **PASS** |
| Task updates | **PASS** |
| Task completion | **PASS** |
| Inventory / transactions | **PASS** |
| DTO support | **PASS** |
| Persistence (code) | **PASS** |
| Persistence (runtime) | **NOT VERIFIED** |
| Retrieval (code) | **PASS** |
| Retrieval (runtime) | **NOT VERIFIED** |
| Deletion (code) | **PASS** |
| Build | **PASS** |

**Conclusion:** Phase 0.2 is additive. Existing flows without `inventory_lines` behave as before. No stock movement or completion changes.

---

## NEXT IMPLEMENTATION TARGETS

1. Runtime regression suite with Postgres: create task without lines, with lines, delete task.
2. Verify WhatsApp assign still works (no lines) after deploy.
3. Phase 0.3 stock movement on complete.
