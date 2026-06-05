# Phase 0.6 — WhatsApp Inventory Notification Analysis

**Run date:** 2026-06-05  
**Scope:** Owner/manager notification on inventory-linked task completion

---

## 1. Existing Notification Flow

Task completion triggers `notifyTaskCompleted()` via `MessagingService.fireAndForget()` from three paths:

| Path | Location | Trigger |
|------|----------|---------|
| Worker/manager `completeTask()` | `tasks.service.ts` ~957 | WhatsApp `/complete` |
| `adminComplete(true)` | `tasks.service.ts` ~1365 | Admin API |
| `adminUpdate` when `is_completed` becomes true | `tasks.service.ts` ~1320 | Admin API |

### `notifyTaskCompleted` behavior (before Phase 0.6)

1. Load task (id, factory, assigner, owner, description).
2. Resolve completer via `formatUserDesignation`.
3. Notify `owner_id ?? assigned_by` (owner/manager).
4. Build text via `MessagingService.buildTaskCompletedText()` (English, generic).
5. Send WhatsApp text via `MessagingService.sendText()`.

Inventory movements run earlier in `completeTaskWithAtomicInventory()` — notification is decoupled and async (`fireAndForget`).

---

## 2. Files Involved

| File | Role |
|------|------|
| `tasks.service.ts` | Completion hooks, `notifyTaskCompleted()` |
| `messaging.service.ts` | `buildTaskCompletedText()`, `sendText()` |
| `whatsapp.templates.ts` | Shared WhatsApp copy patterns |
| `tasks.inventory.helper.ts` | Movement execution (unchanged) |
| `task_inventory_lines` / `InventoryItem` | Line + item data for summary |

---

## 3. Notification Design

### Detection

After completion, count `task_inventory_lines` for the task. If `count > 0`, use inventory-aware template; else existing English template.

### Data source (post-movement)

For each line (ordered by id):

- **Item name / unit** — from `inventory_item` association
- **Quantity moved** — `quantity_expected` on line
- **Current qty** — `inventory_items.current_quantity` (after movement)
- **Previous qty** — derived:
  - `STOCK_OUT`: `current + moved`
  - `STOCK_IN`: `current - moved`
- **Movement type** — `movement_type` on line

No changes to `InventoryTransactionService` — reads persisted state only.

### Message format (Hindi/Hinglish)

```text
✅ Task #42 complete ho gaya.

📦 Cement pcs
Stock: 48 → 43
Qty moved: 5
Movement: Stock out (nikala)

✔️ Completed by: ...
🎭 Role: ...
```

Multi-line tasks repeat the 📦 block per item.

### Backward compatibility

Tasks **without** inventory lines continue using `buildTaskCompletedText()` unchanged.

---

## 4. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Wrong previous qty if movement failed partially | **Low** | Notification only fires after successful completion (movements committed) |
| Race if qty read before commit | **Low** | `fireAndForget` runs after `completeTaskWithAtomicInventory` resolves |
| Multi-line same item | **Low** | Each line reported separately (matches ledger) |
| Inventory regression | **None** | No inventory service/schema changes |
| Integration test impact | **Low** | Tests don't assert notification text; 12/12 verified |

---

## New Files (planned)

| File | Purpose |
|------|---------|
| `tasks.inventory-notification.helper.ts` | Load line summaries post-completion |
| `buildTaskInventoryCompletionOwnerText()` in `whatsapp.templates.ts` | Hinglish owner message |
