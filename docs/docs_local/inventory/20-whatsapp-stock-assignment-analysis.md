# Phase 0.7 — WhatsApp Assign With Stock Analysis

**Run date:** 2026-06-06  
**Scope:** `/assign_delivery @worker SKU qty` — inventory-linked DELIVERY tasks from WhatsApp

---

## 1. Existing WhatsApp Routing

Incoming messages flow through `WhatsAppService.handleIncomingMessage()`:

1. Interactive actions, home triggers, workflows, cancel.
2. **Slash bypass** — commands matching `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject`, and now `/assign_delivery` skip ML classification and go straight to `processCommand()`.
3. Otherwise ML `/classify` → `processCommand()` with normalized intent.

`processCommand()` resolves user + factory, applies role guards, and dispatches by `COMMANDS.*` constant.

Existing assign path (`/assign`) uses `TasksService.handleAssign()` → `resolveMention()` → `assignToUser()`.

---

## 2. Existing Task Assignment Flow

| Step | Location | Behavior |
|------|----------|----------|
| Mention resolution | `tasks.service.ts` `resolveMention()` | `@id`, `@phone`, `@name`, `@all`; ambiguous → list |
| Task create | `assignToUser()` | Routing, department, deadline, `taskModel.create()` |
| Inventory lines | `persistInventoryLines()` | Writes `task_inventory_lines` when `options.inventory_lines` present |
| Worker notify | `notifyWorkerTaskAssigned()` | `fireAndForget` WhatsApp to assignee |

Completion later uses `completeTaskWithAtomicInventory()` → `executeTaskInventoryMovements()` (unchanged).

---

## 3. Design

### Command

```text
/assign_delivery @<worker> <SKU> <qty>
```

Example: `/assign_delivery @ramesh CEMENT_50KG 5`

### Handler (`WhatsAppService.handleAssignDelivery`)

1. `ensureManager(role)` — owner/manager only (same as `/assign`).
2. Parse `@mention`, SKU, quantity from raw message.
3. `TasksService.resolveMention()` — reuse worker lookup; ambiguous → existing disambiguation message.
4. `InventoryService.findItemBySku()` — factory-scoped SKU lookup (normalized uppercase).
5. `parsePositiveQuantity()` — qty > 0.
6. `TasksService.assignToUser()` with:
   - `description`: `[DELIVERY] {item} ({sku}) x{qty}` (no `task_kind` column in schema)
   - `inventory_lines`: `[{ inventory_item_id, quantity_expected, movement_type: STOCK_OUT }]`

### Success / error copy

Hinglish templates in `whatsapp.templates.ts` per spec.

### What is NOT in scope

- RESTOCK, TRANSFER, NL parsing, ML intent, SKU disambiguation, partial completion
- Schema/migration changes for `task_kind`
- Changes to inventory transaction layer

---

## 4. Risks

| Risk | Mitigation |
|------|------------|
| No `task_kind` column | Semantic DELIVERY encoded in `[DELIVERY]` description prefix; movement type on line drives stock behavior |
| Slash-only (no ML) | Added to slash bypass regex; direct typing works without ML service |
| `@all` on delivery | Rejected with invalid-format message (single worker required) |
| Duplicate stock on bulk assign | Not applicable — delivery uses single-worker `assignToUser`, not `assignToAll` |
| Worker notification vs custom success text | `assignToUser` still fires worker WhatsApp; assigner gets custom Hinglish confirmation |

**Overall risk: Low** — thin orchestration layer over validated Phase 0.1–0.6 paths.
