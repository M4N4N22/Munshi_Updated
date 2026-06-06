# Phase 2.5.4 — Push Handler Analysis

**Run date:** 2026-06-06  
**Scope:** Handler + dispatch wiring — no new queue/outbox

---

## 1. End-to-End Flow

```text
Task completion (existing)
      ↓
ZOHO_STOCK_PUSH_REQUESTED domain event (2.5.1)
      ↓
DomainEventsProcessorCron.processPendingBatch()
      ↓
DomainEventsService.dispatch()
      ↓
ZohoStockPushHandler.handle()
      ↓
ensurePushDelivery() (2.5.2)
      ↓
Read inventory_transactions (read-only)
      ↓
Resolve integration_item_mapping
      ↓
ZohoInventoryClient.adjustStock() (2.5.3)
      ↓
markDelivered / markFailed / markSkippedUnmapped
```

Reuses existing `domain_events` outbox and cron — no new queue or scheduler.

---

## 2. Handler Responsibilities

| Step | Action |
|------|--------|
| Parse payload | `factory_id`, `inventory_transaction_id`, optional `transaction_type` |
| Connection | Active `zoho_inventory` connection for factory |
| Idempotency | `ensurePushDelivery()` — skip if delivery row already exists |
| Ledger read | Load txn by id; verify `reference_type = TASK` |
| Mapping | Lookup by `connection_id` + `inventory_item_id` |
| Unmapped | `markSkippedUnmapped()` — no Zoho API call |
| Push | `adjustStock()` with mapping `external_id` |
| Success | `markDelivered()` + `zoho_reference` |
| Failure | `markFailed()` + `last_error` — handler does not throw (event completes) |

---

## 3. R-Z06 Compliance

Handler uses `DbService.sqlService.InventoryTransaction.findOne()` only.  
No `InventoryTransactionService`, no `recordStockIn`/`recordStockOut`, no quantity writes.

---

## 4. Duplicate / Replay Strategy

`ensurePushDelivery()` returns `created: false` when `(connection_id, inventory_transaction_id)` already exists → handler returns immediately. No second `adjustStock()` call (R-P05-01).

---

## 5. Error Strategy (2.5.4)

- Single attempt per event processing
- Client errors → delivery `FAILED`, domain event `COMPLETED`
- Unmapped → delivery `SKIPPED_UNMAPPED`, domain event `COMPLETED`
- No handler-level retry (deferred to 2.5.5)

---

## 6. Module Wiring

`DomainEventsModule` imports `IntegrationModule` (forwardRef).  
`DomainEventsService` injects optional `ZohoStockPushHandler` and routes `zoho.stock_push.requested`.

---

## 7. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-P05-01 | Duplicate push | ensurePushDelivery skip |
| R-Z06 | Inventory write | Read-only ledger access |
| R-P05-05 | Failed push no auto-retry | Documented for 2.5.5 |
| R-P05-08 | Unmapped items | SKIPPED_UNMAPPED terminal state |
