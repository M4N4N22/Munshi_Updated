# Phase 3.1 — Low Stock Alert Implementation

**Run date:** 2026-06-06  
**Status:** IMPLEMENTED

---

## Files Added / Modified

| File | Change |
|------|--------|
| `domain-events.constants.ts` | Added `INVENTORY_LOW_STOCK: 'inventory.low_stock'` |
| `domain-events.service.ts` | Route to `InventoryLowStockAlertHandler` |
| `domain-events.module.ts` | Import `InventoryModule` (forwardRef) |
| `domain-events.service.spec.ts` | Dispatch test for low stock |
| `inventory.low-stock.helper.ts` | Threshold-cross detection + payload builder |
| `inventory.low-stock.helper.spec.ts` | Unit tests |
| `inventory-transaction.service.ts` | Post-commit publish via `scheduleLowStockAlertIfNeeded()` |
| `inventory-low-stock-alert.handler.ts` | Owner resolve + WhatsApp send |
| `inventory.module.ts` | Handler, MessagingModule, DomainEventsModule |
| `integration.module.ts` | forwardRef InventoryModule (break circular dep) |
| `whatsapp.templates.ts` | `buildInventoryLowStockAlertText()` |
| `inventory-low-stock-alert.integration.spec.ts` | 5 scenario tests |

---

## Publish Flow

```typescript
// Inside applyMovement run(), after updateItemQuantity:
scheduleLowStockAlertIfNeeded(transaction, {
  transactionType, previousQuantity, nextQuantity, reorderThreshold, ...
});

// scheduleLowStockAlertIfNeeded:
if (didCrossLowStockThreshold(...)) {
  transaction.afterCommit(async () => {
    await domainEventsService.publish({
      event_type: INVENTORY_LOW_STOCK,
      payload: { factory_id, inventory_item_id, sku, ... },
    });
  });
}
```

---

## Handler Flow

```typescript
InventoryLowStockAlertHandler.handle(event)
  → resolve owner phone (FactoryUser OWNER)
  → buildInventoryLowStockAlertText()
  → messagingService.sendText(ownerPhone, text)
```

---

## Message Template

```
⚠️ Low Stock Alert

Item: Steel Rod 12mm
SKU: ...

Current: 8.0000
Threshold: 10.0000

Inventory low ho gaya hai.

Purchase request create karne ke liye:
/purchase_request_create
```

---

## Module Wiring

```text
InventoryModule
  imports: MessagingModule, forwardRef(DomainEventsModule)
  exports: InventoryLowStockAlertHandler, InventoryTransactionService

DomainEventsModule
  imports: forwardRef(IntegrationModule), forwardRef(InventoryModule)
  injects handler into DomainEventsService
```

---

## Constraints Satisfied

| Rule | Status |
|------|--------|
| No inventory math changes | **Yes** — only `scheduleLowStockAlertIfNeeded` added |
| Threshold-cross only | **Yes** — `didCrossLowStockThreshold()` |
| No STOCK_IN / ADJUSTMENT events | **Yes** |
| Purchase request CTA only | **Yes** |
| No registry refactor | **Yes** — if/else dispatch extended |
