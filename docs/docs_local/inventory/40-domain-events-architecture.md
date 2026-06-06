# Phase 3A — Domain Events Architecture (Current State)

**Run date:** 2026-06-06  
**Scope:** As-built documentation after Phase 2 completion  
**Status:** Analysis only — no code changes

---

## 1. Overview

Munshi uses an **outbox-lite** pattern: producers write rows to `domain_events`; a cron worker picks up `PENDING` rows and calls `DomainEventsService.dispatch()`.

The original P2 planning doc (2026-06-04) stated `dispatch()` was a **no-op**. That is **no longer accurate**. Phase 2.5.4 wired real dispatch for Zoho stock push. The infrastructure is operational but narrowly used.

```text
Producer (service layer)
      ↓
DomainEventsService.publish()
      ↓
domain_events row (status=PENDING)
      ↓
DomainEventsProcessorCron (every minute)
      ↓
DomainEventsService.processPendingBatch()
      ↓
dispatch(event) → handler(s)
      ↓
status=COMPLETED | FAILED (with retry)
```

---

## 2. Persistence Layer

**Table:** `domain_events` (migration `007_p0_finance_foundation.sql`)

| Column | Purpose |
|--------|---------|
| `factory_id` | Optional tenant scope |
| `event_type` | Routing key (string, max 128) |
| `aggregate_type` / `aggregate_id` | Idempotency / traceability |
| `payload` | JSONB event body |
| `status` | `PENDING` → `PROCESSING` → `COMPLETED` \| `FAILED` |
| `attempts` / `last_error` | Outbox worker retry (max 5) |
| `scheduled_at` | Delayed processing support |
| `processed_at` | Completion timestamp |

**Index:** `idx_domain_events_pending` on `(status, scheduled_at) WHERE status = 'PENDING'`

**Model:** `backend/src/services/domain-events/domain-events.schema.ts`

---

## 3. DomainEventsService

**File:** `backend/src/services/domain-events/domain-events.service.ts`

### 3.1 publish()

Creates a row with `status = PENDING`, `scheduled_at = now` (or override). Used by:

| Producer | Event type | When |
|----------|------------|------|
| `OnboardingService` | `onboarding.registered` | User/factory registration |
| `TasksService` (via helper) | `zoho.stock_push.requested` | Post-commit after task inventory movements |

### 3.2 processPendingBatch(limit = 50)

1. Finds `PENDING` rows where `scheduled_at <= now`, ordered by `id ASC`
2. Sets `PROCESSING`
3. Calls `dispatch(row)`
4. On success → `COMPLETED`, `processed_at = now`
5. On thrown error → increment `attempts`; if `attempts >= 5` → `FAILED`, else back to `PENDING`

**Note:** Handlers that swallow errors (e.g. Zoho push marking delivery `failed` without throwing) mark the domain event `COMPLETED` even when business outcome failed.

### 3.3 dispatch() — current routing

```typescript
private async dispatch(event: DomainEvent): Promise<void> {
  if (event.event_type === DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED) {
    await this.zohoStockPushHandler.handle(event);
    return;
  }
  // All other types: debug log "no handler"
}
```

**Not a pluggable registry** — single `if` branch with optional injected handler. Other event types are published but not processed.

---

## 4. DomainEventsProcessorCron

**File:** `backend/src/services/domain-events/domain-events.processor.cron.ts`

- `@Cron(CronExpression.EVERY_MINUTE)`
- Calls `processPendingBatch()`
- Logs count when `processed > 0`

Same cron infrastructure as Zoho scheduled pull and push retry crons (`@nestjs/schedule`).

---

## 5. Module Wiring

**File:** `backend/src/services/domain-events/domain-events.module.ts`

```text
DomainEventsModule
  imports: forwardRef(IntegrationModule)   // for ZohoStockPushHandler
  providers: DomainEventsService, DomainEventsProcessorCron
  exports: DomainEventsService
```

`DomainEventsService` constructor injects `@Optional() ZohoStockPushHandler`. Without `IntegrationModule`, push events log a warning and complete with no action.

**Circular dependency:** `IntegrationModule` ↔ `DomainEventsModule` resolved via `forwardRef`.

---

## 6. Registered Event Types

**Constants:** `backend/src/services/domain-events/domain-events.constants.ts`

| Constant | Value | Published? | Handler wired? |
|----------|-------|------------|----------------|
| `ONBOARDING_REGISTERED` | `onboarding.registered` | Yes | **No** |
| `BANK_CONSENT_ACTIVE` | `bank.consent.active` | No | No |
| `BANK_STATEMENT_FETCHED` | `bank.statement.fetched` | No | No |
| `MATCH_SUGGESTION_CREATED` | `match.suggestion.created` | No | No |
| `JOURNAL_ENTRY_POSTED` | `journal.entry.posted` | No | No |
| `ZOHO_STOCK_PUSH_REQUESTED` | `zoho.stock_push.requested` | Yes | **Yes** → `ZohoStockPushHandler` |

Phase 3 P2 events (`inventory.low_stock`, `task.completed_with_stock`, `integration.sync_failed`) are **not defined** in constants yet.

---

## 7. Handler: ZohoStockPushHandler

**File:** `backend/src/services/integrations/zoho/zoho-stock-push.handler.ts`

**Trigger:** `zoho.stock_push.requested` (Phase 2.5.1)

**Flow:**
1. Parse `factory_id`, `inventory_transaction_id` from payload
2. Find active Zoho connection
3. `ensurePushDelivery()` — idempotency (Phase 2.5.2)
4. `ZohoPushExecutionService.executeForDelivery()` — read ledger, map item, `adjustStock()` (Phase 2.5.3–2.5.4)
5. Apply outcome to `integration_push_deliveries`

**Retry:** Not in handler — `ZohoPushRetryCron` retries failed **deliveries** separately (Phase 2.5.5).

**R-Z06:** Read-only inventory access.

---

## 8. Event Lifecycle (Detailed)

```text
┌──────────────────────────────────────────────────────────────────┐
│ PUBLISH PHASE                                                     │
├──────────────────────────────────────────────────────────────────┤
│ Task completion with inventory lines                              │
│   → sequelize.transaction(movements + task update)                │
│   → COMMIT success                                                │
│   → publishZohoStockPushRequestedEvents()  [R-P05-02]             │
│       one event per inventory_transaction_id                      │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ OUTBOX ROW: status=PENDING, scheduled_at=now                     │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ CRON TICK (≤1 min latency)                                       │
│   processPendingBatch → PROCESSING                               │
│   dispatch → ZohoStockPushHandler                                │
│   COMPLETED (or FAILED if handler throws, up to 5 attempts)      │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ SIDE EFFECTS (outside domain_events table)                       │
│   integration_push_deliveries: pending/delivered/failed/skipped  │
│   Zoho API adjustStock                                           │
│   Retry cron on failed deliveries (separate from outbox retry)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Outbox vs Delivery Retry (Two Layers)

| Layer | Table | Retries | Purpose |
|-------|-------|---------|---------|
| Domain event outbox | `domain_events` | Up to 5 if handler **throws** | At-least-once handler invocation |
| Push delivery retry | `integration_push_deliveries` | Up to 4 with backoff | Zoho API transient failures |

For Zoho push, the handler typically **does not throw** on API failure — delivery row tracks retry instead. Domain event is marked `COMPLETED` after first handler run.

---

## 10. Current Capabilities Summary

| Capability | Status |
|------------|--------|
| Durable event publishing | **Yes** |
| Async processing (cron) | **Yes** |
| Handler dispatch | **Partial** — one handler, if/else routing |
| Multi-handler registry | **No** |
| Inventory alert events | **No** |
| Integration failure alert events | **No** |
| Task completion alert events | **No** (direct WhatsApp instead) |
| Zoho stock push pipeline | **Yes** (Phase 2 complete) |

---

## 11. Test Coverage

| Test | Location |
|------|----------|
| Dispatch routes to Zoho handler | `domain-events.service.spec.ts` |
| Event publish post-commit | `zoho-stock-push-events.integration.spec.ts` (6 tests) |
| Handler + delivery transitions | `zoho-stock-push-handler.integration.spec.ts` (6 tests) |
| Retry processing | `zoho-push-retry.integration.spec.ts` (8 tests) |

No tests exist for `INVENTORY_LOW_STOCK`, `TASK_COMPLETED_WITH_STOCK`, or `INTEGRATION_SYNC_FAILED` domain events.

---

## 12. Conclusion

The domain events **infrastructure is production-ready** and **partially utilized**. Phase 2 repurposed it for Zoho outbound sync. Phase 3 should **extend** dispatch with alert handlers — not rebuild the outbox, cron, or Zoho push pipeline.
