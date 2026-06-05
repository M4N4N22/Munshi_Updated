# Phase 2.5.1 — Stock Push Event Capture Implementation

**Run date:** 2026-06-04

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/services/tasks/tasks.stock-push-events.helper.ts` | Post-commit `ZOHO_STOCK_PUSH_REQUESTED` publisher |
| `backend/test/integration/zoho-stock-push-events.integration.spec.ts` | Phase 2.5.1 integration tests (6 scenarios) |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/domain-events/domain-events.constants.ts` | Added `ZOHO_STOCK_PUSH_REQUESTED` |
| `backend/src/services/tasks/tasks.inventory.helper.ts` | Returns `TaskInventoryMovementCaptured[]` with ledger IDs |
| `backend/src/services/tasks/tasks.service.ts` | Injects `DomainEventsService`; publishes after commit |
| `backend/src/services/tasks/tasks.module.ts` | Imports `DomainEventsModule` |

**Not modified (per scope):**

- `inventory-transaction.service.ts`
- Zoho integration services
- `domain-events.service.ts` dispatch (remains no-op)
- Import / pull sync / OAuth modules

---

## 3. Event Type

```typescript
DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED = 'zoho.stock_push.requested'
```

- **Aggregate type:** `inventory_transaction`
- **Aggregate ID:** `{inventory_transaction_id}`
- **Status:** `PENDING` (processed by existing cron with no-op dispatch)

---

## 4. Publish Flow

```typescript
// tasks.service.ts — completeTaskWithAtomicInventory()
const movements = await sequelize.transaction(async (transaction) => {
  const captured = await executeTaskInventoryMovements({ ..., transaction });
  await task.update({ is_completed: true }, { transaction });
  return captured;
});

if (movements.length > 0) {
  await publishZohoStockPushRequestedEvents({
    domainEventsService: this.domainEventsService,
    factoryId: task.factory_id,
    taskId: task.id,
    movements,
  });
}
```

**Inventory ID capture:**

`executeTaskInventoryMovements()` collects `{ inventory_transaction_id, transaction_type }` from each `recordStockIn` / `recordStockOut` return value — no post-commit query.

**Tasks without inventory lines:** Early return before transaction; no events.

---

## 5. Explicitly Not Implemented (Phase 2.5.2+)

- `integration_push_deliveries` idempotency table
- `ZohoPushService` / `ZohoPushHandler`
- Dispatch registry wiring
- Zoho API stock adjustment calls
- Retry processing beyond existing domain event cron no-op
