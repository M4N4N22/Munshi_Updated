# Phase 4 — Low Stock Alert Discovery

**Date:** 2026-06-07  
**Scope:** Discovery only

---

## Executive Summary

Low-stock alerts fire when a **STOCK_OUT** transaction crosses an item's `reorder_threshold` (from above/at threshold to below). Alerts are delivered asynchronously via domain events to **all owners + all department managers** (plus task-linked dept manager when applicable).

The alert includes an interactive **"Purchase karein"** button intended to start a prefilled purchase request workflow.

---

## 1. End-to-End Code Path

```
InventoryTransactionService.recordStockOut()
  → applyMovement()
  → scheduleLowStockAlertIfNeeded() [after commit]
      → didCrossLowStockThreshold(previous, next, threshold)
      → buildInventoryLowStockEventPayload()
      → DomainEventsService.publish(INVENTORY_LOW_STOCK)
      → DomainEventsService.processEventById() [immediate]
          → dispatch() → InventoryLowStockAlertHandler.handle()
              → resolveLowStockAlertRecipientPhones()
              → buildInventoryLowStockAlertOutbound()
              → MessagingService.sendInteractiveButtons() [per recipient]
```

**Cron fallback:** `domain-events.processor.cron.ts` — `processPendingBatch` every minute + backlog drain on startup.

**STOCK_OUT sources:**
- Direct `recordStockOut()` API/service calls
- Task completion via `tasks.inventory.helper.ts` → `executeTaskInventoryMovements()`

---

## 2. Threshold Logic

**File:** `backend/src/services/inventory/inventory.low-stock.helper.ts`

| Function | Purpose |
|----------|---------|
| `isItemLowStock(qty, threshold)` | Current qty < threshold |
| `didCrossLowStockThreshold(prev, next, threshold)` | Alert only on **crossing** into low (not if already low) |
| `buildInventoryLowStockEventPayload()` | Builds domain event JSON |

**Skipped when:**
- `reorder_threshold` is null/empty
- Transaction type is not STOCK_OUT
- Item was already below threshold before movement

---

## 3. Domain Event Payload

**Event type:** `inventory.low_stock` (`domain-events.constants.ts`)  
**Aggregate:** `inventory_item` / `aggregate_id` = item id string  
**Table:** `domain_events` (outbox pattern)

### `InventoryLowStockEventPayload` fields

| Field | Type | Used in alert UI |
|-------|------|-----------------|
| `factory_id` | number | Recipient resolution |
| `inventory_item_id` | number | ✅ Button `itemId` |
| `sku` | string | ✅ Alert body |
| `item_name` | string | ✅ Alert body |
| `current_quantity` | string (formatted) | ✅ Alert body |
| `reorder_threshold` | string (formatted) | ✅ Alert body |
| `previous_quantity` | string | Event only |
| `reference_type` | string \| null | Recipient resolution (task link) |
| `reference_id` | number \| null | Task dept manager lookup |

**Not in payload:** `unit`, `category`, `location`, `suggested_quantity` (computed at prefill time).

---

## 4. Recipient Resolution

**File:** `backend/src/services/inventory/inventory-low-stock-alert.recipients.ts`

`resolveLowStockAlertRecipientPhones()` returns deduped phones in order:

1. All factory **owners** (`FactoryUser` role `OWNER`)
2. All **department managers** in factory
3. **Task department manager** (when `reference_type` is task inventory reference + `reference_id` = task id)

If zero recipients → alert skipped (warning log).

---

## 5. Outbound Message Structure

**File:** `backend/src/core/messaging/inventory-low-stock-outbound.ts`

### Body text

```
━━━━━━━━━━━━━━━━
⚠️ Low Stock Alert
━━━━━━━━━━━━━━━━

Item: {name}
SKU: {sku}          (if present)

Current: {qty}
Threshold: {threshold}

Inventory low ho gaya hai.

Neeche se purchase request shuru karein 👇
```

### Button

| Property | Value |
|----------|-------|
| `title` | `Purchase karein` |
| `id` | `/purchase_request_create?itemId={inventoryItemId}` |

Built via `buildPurchaseRequestCreateCommand(inventoryItemId)`.

### Send implementation

**File:** `inventory-low-stock-alert.handler.ts`

- Sends via `MessagingService.sendInteractiveButtons()` **directly**
- Does **not** go through `WhatsAppService.sendOutbound()`
- Per-recipient try/catch — one failure does not block others

---

## 6. What Data Exists Inside the Alert?

### At send time (in outbound message)

| Data | Available to user |
|------|-------------------|
| Item name | ✅ Visible in body |
| SKU | ✅ Visible in body |
| Current quantity | ✅ Visible in body |
| Reorder threshold | ✅ Visible in body |
| Inventory item ID | ✅ Embedded in button `id` (not shown in body) |
| Suggested order quantity | ❌ Not in alert — computed on CTA tap |
| Factory name | ❌ Not in alert body |
| Task reference | ❌ Not in alert body |

### After CTA tap (prefill prompt)

**File:** `purchase-request-prefill.helper.ts` → `buildPurchaseRequestPrefillPrompt()`

Additional data loaded from DB:
- `suggested_quantity` (formula-based)
- `unit`
- `title` (auto-generated)
- Full `prefill_context` stored in `workflow_sessions.session_data`

---

## 7. Parallel REST Surfaces (Same Low-Stock Data)

| Endpoint | Purpose |
|----------|---------|
| `GET /purchase-requests/suggestions/low-stock` | List suggestions |
| `GET /purchase-requests/prefill/low-stock?factory_id=&inventory_item_id=` | API prefill |
| `POST /purchase-requests/from-suggestion` | Create PR from suggestion key `low-stock:{factoryId}:{itemId}` |

These share the same suggested-quantity formula as the WhatsApp prefill path.

---

## 8. WhatsApp Informational (Not Alert Pipeline)

**File:** `whatsapp.service.ts` → `handleInventoryStatus()`

- `/inventory_status` lists items including low-stock count
- Does **not** send interactive purchase button
- Does **not** create PR

---

## 9. Historical Context

**Doc:** `docs/docs_local/inventory/45-purchase-request-prefill-regression.md`

| Before Phase 3.4 | After |
|------------------|-------|
| CTA: `/purchase_request_create` (generic) | CTA: `/purchase_request_create?itemId={id}` (prefilled) |

Integration tests confirm button `id` and title on send.

---

## 10. Known Alert → CTA Gap

The alert **sends** the button correctly (tested). The reported "nothing happens on click" is an **inbound routing** issue, not an alert generation issue:

- If Olli echoes button **title** (`Purchase karein`) instead of **reply id**, workflow does not start.
- See `01-whatsapp-interactive-flow.md` for full routing analysis.

---

## 11. Key Files Index

| Step | Path |
|------|------|
| Threshold + payload | `inventory.low-stock.helper.ts` |
| Event publish | `inventory-transaction.service.ts` |
| Event dispatch | `domain-events.service.ts` |
| Alert handler | `inventory-low-stock-alert.handler.ts` |
| Recipients | `inventory-low-stock-alert.recipients.ts` |
| Outbound builder | `inventory-low-stock-outbound.ts` |
| Prefill on tap | `purchase-request-prefill.service.ts` |
| Tests | `test/integration/inventory-low-stock-*.integration.spec.ts` |
