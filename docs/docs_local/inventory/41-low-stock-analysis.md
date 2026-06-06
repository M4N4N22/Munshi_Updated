# Phase 3.1 — Low Stock Alert Analysis

**Run date:** 2026-06-06  
**Scope:** Proactive `inventory.low_stock` domain event + WhatsApp alert

---

## 1. Problem Statement

Phase 0 linked tasks to inventory; Phase 2 added Zoho push. Owners still had **no proactive alert** when stock dropped below reorder threshold — only on-demand `/inventory_status` queries.

Phase 3.1 closes this gap:

```text
STOCK_OUT
      ↓
Quantity crosses below reorder_threshold
      ↓
inventory.low_stock domain event (post-commit)
      ↓
DomainEventsProcessorCron
      ↓
InventoryLowStockAlertHandler
      ↓
WhatsApp to factory owner
```

---

## 2. Threshold-Crossing Logic

Alert fires only on **transition**, not sustained low stock:

| Before movement | After movement | STOCK_OUT? | Event? |
|-----------------|----------------|------------|--------|
| Not low (≥ threshold) | Low (< threshold) | Yes | **Yes** |
| Already low | Still low | Yes | **No** |
| Any | Any | STOCK_IN | **No** |
| Any | Any | ADJUSTMENT | **No** |
| No threshold set | — | — | **No** |

Uses same comparison as `InventoryService.isLowStock()`: `current_quantity < reorder_threshold`.

---

## 3. Publish Location

**File:** `InventoryTransactionService`  
**Method:** `scheduleLowStockAlertIfNeeded()` called from `applyMovement()` after quantity update.

**Critical constraint:** Inventory math in `applyMovement()` is unchanged. Alert scheduling is additive only.

**Post-commit:** Uses Sequelize `transaction.afterCommit()` so events publish only after successful commit — including nested transactions (task completion).

---

## 4. Event Design

| Field | Value |
|-------|-------|
| Type | `inventory.low_stock` |
| Aggregate | `inventory_item:{id}` |
| Payload | factory_id, inventory_item_id, sku, item_name, quantities, reference |

---

## 5. Handler Design

**File:** `InventoryLowStockAlertHandler`

- Resolves factory **owner** phone via `FactoryUser` (role OWNER)
- Sends Hindi/Hinglish message via `MessagingService.sendText()`
- Includes `/purchase_request_create` CTA (no auto-create)

---

## 6. Infrastructure Reuse

| Component | Reused from |
|-----------|-------------|
| Outbox | `domain_events` table + `DomainEventsService.publish()` |
| Cron | `DomainEventsProcessorCron` (every minute) |
| Dispatch | Extended if/else in `DomainEventsService.dispatch()` |
| Low-stock math | Same `< reorder_threshold` rule as `InventoryService` |
| WhatsApp | `MessagingService`, `whatsapp.templates.ts` |
| Purchase request | CTA only — existing workflow |

**Not implemented (by design):** dispatch registry refactor, dept manager copy, dedup table migration.

---

## 7. Anti-Spam

Threshold-crossing detection prevents repeated alerts when stock is already low. Restocking above threshold and crossing again will re-alert (correct behavior).

---

## Conclusion

Minimal additive implementation on existing outbox + inventory movement path. No inventory calculation changes.
