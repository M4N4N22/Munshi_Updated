# Phase 0.6 — WhatsApp Inventory Notification Implementation

**Run date:** 2026-06-05

---

## 1. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/tasks/tasks.inventory-notification.helper.ts` | **Created** — load post-completion line summaries |
| `backend/src/modules/whatsapp/whatsapp.templates.ts` | **Added** `buildTaskInventoryCompletionOwnerText()` |
| `backend/src/services/tasks/tasks.service.ts` | **Updated** `notifyTaskCompleted()` branching |

### Not modified (per scope)

- `InventoryRepository`, `InventoryTransactionService`
- Migrations, schemas
- Integration test assertions
- Domain events, CSV, Zoho, ML

---

## 2. Exact Changes

### `tasks.inventory-notification.helper.ts`

- `loadInventoryCompletionNotifyLines()` — queries lines with `inventory_item` include, derives previous/current qty from movement type.

### `whatsapp.templates.ts`

- `TaskInventoryCompletionLine` type
- `waInventoryMovementLabel()` — Hinglish movement labels
- `buildTaskInventoryCompletionOwnerText()` — owner notification body

### `tasks.service.ts`

- Register `inventoryItemModel` from `DbService`
- In `notifyTaskCompleted()`:
  - If `task_inventory_lines` count > 0 → inventory template
  - Else → existing `buildTaskCompletedText()`

---

## 3. Notification Format

```text
━━━━━━━━━━━━━━━━
✅ Task #42 complete ho gaya.
━━━━━━━━━━━━━━━━

🏭 Factory: ...
📝 Deliver cement

📦 Cement pcs
Stock: 10 → 7
Qty moved: 3
Movement: Stock out (nikala)

✔️ Completed by: Worker Name
🎭 Role: Worker

━━━━━━━━━━━━━━━━
```

---

## 4. Backward Compatibility

| Task type | Notification |
|-----------|--------------|
| No inventory lines | **Unchanged** — `buildTaskCompletedText()` (English) |
| With inventory lines | **New** — Hinglish + stock summary |

Completion paths, movement logic, and idempotency guards are untouched.

---

## 5. Validation Results

| Check | Result |
|-------|--------|
| `yarn test:integration` | **12/12 PASS** |
| `nest start` bootstrap | **PASS** (Nest application successfully started) |
| Inventory logic modified | **No** |

---

## 6. Regression Risk

**Low** — notification-only layer; reads data after movements complete.
