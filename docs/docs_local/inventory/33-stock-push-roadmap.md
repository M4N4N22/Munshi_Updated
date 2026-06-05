# Phase 2.5A — Stock Push Implementation Roadmap

**Run date:** 2026-06-04  
**Scope:** Phase 2.5 breakdown for implementation (post-analysis)

---

## Overview

```text
2.5.1 Event Capture
        ↓
2.5.2 Push Queue / Outbox (+ idempotency table)
        ↓
2.5.3 Zoho Stock Update Client
        ↓
2.5.4 Retry Processing (handler + dispatch registry)
        ↓
2.5.5 Validation & observability
```

**Dependency rule:** Each sub-phase is a reviewable PR. Phases 2.1–2.4 regression must stay green after every merge.

---

## 2.5.1 — Event Capture

**Goal:** After successful task inventory ledger commit, publish outbound push intent without changing movement logic.

### Deliverables

| Item | Detail |
|------|--------|
| Event type constant | `zoho.stock_push.requested` (or `DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED`) |
| Publish site | `TasksService.completeTaskWithAtomicInventory()` post-commit |
| Payload | `{ factory_id, inventory_transaction_id, task_id, transaction_type }` |
| Filter | Only lines that produced STOCK_IN / STOCK_OUT ledger rows |
| Exclusions | Never publish for non-task reference types |

### Dependencies

- Phase 0 task inventory (unchanged movement logic)
- Phase 2.1 `domain_events` table (exists)
- `DomainEventsService.publish()` (exists)

### Risks

| Risk | Mitigation |
|------|------------|
| Publish inside DB transaction | Publish **after** `sequelize.transaction()` resolves |
| Missing transaction IDs | Return IDs from `executeTaskInventoryMovements` or query by `(TASK, task_id)` post-commit |
| Multi-line tasks → many events | Acceptable; handler idempotency per txn |

### Files likely affected

```text
backend/src/services/tasks/tasks.service.ts          (post-commit publish only)
backend/src/services/tasks/tasks.inventory.helper.ts (optional: return txn IDs — minimal)
backend/src/services/domain-events/domain-events.constants.ts  (event type)
```

### Testing strategy

- Unit: mock publish called once per line after successful completion
- Unit: publish NOT called on movement failure (rollback)
- Integration: task complete → N events in `domain_events` for N lines
- Phase 0 regression 12/12 unchanged

---

## 2.5.2 — Push Queue / Outbox + Idempotency

**Goal:** Durable queue and duplicate protection without duplicating pull sync logic.

### Deliverables

| Item | Detail |
|------|--------|
| Migration | `012_integration_push_deliveries.sql` (proposed) |
| Model | `IntegrationPushDelivery` |
| Repository methods | `findDelivery`, `createDelivery`, `markDelivered`, `markFailed` |
| Unique constraint | `(connection_id, inventory_transaction_id)` |

### Schema (proposed)

```text
integration_push_deliveries
  id, connection_id, factory_id, inventory_transaction_id
  status, zoho_reference, last_error, created_at, updated_at, delivered_at
  UNIQUE (connection_id, inventory_transaction_id)
```

### Dependencies

- **2.5.1** events published
- Phase 2.1 integration foundation

### Risks

| Risk | Mitigation |
|------|------------|
| Over-engineering queue table | Single small table; `domain_events` remains primary queue |
| Race on concurrent handlers | Unique constraint + transactional insert before API |

### Files likely affected

```text
backend/migrations/012_integration_push_deliveries.sql
backend/src/services/integrations/integration-push-delivery.schema.ts
backend/src/services/integrations/integration.repository.ts  (extend)
backend/src/core/services/db-service/models.ts
```

### Testing strategy

- Migration applies
- Duplicate insert → constraint violation → handler skips API
- Factory isolation on delivery queries

---

## 2.5.3 — Zoho Stock Update Client

**Goal:** HTTP client for outbound stock adjustments (mirror of pull client pattern).

### Deliverables

| Item | Detail |
|------|--------|
| `ZohoInventoryClient.adjustStock()` | Map STOCK_IN/OUT → Zoho adjustment API |
| Mock handlers | `setAdjustStockHandler()` for CI |
| Token usage | Decrypted access token from connection |
| Mapping | Requires `integration_item_mappings.external_id` |

### Dependencies

- Phase 2.2 OAuth + token refresh
- Phase 2.3 mappings populated (pull or manual)

### Risks

| Risk | Mitigation |
|------|------------|
| Wrong Zoho API endpoint | Spike against Zoho Inventory adjustment docs in staging |
| Multi-warehouse | v1: single warehouse from mapping metadata; document limit |
| Unit mismatch | Pass Munshi unit; validate in staging |

### Files likely affected

```text
backend/src/services/integrations/zoho/zoho-inventory.client.ts  (extend)
backend/src/services/integrations/zoho/zoho-push.service.ts      (new)
backend/src/services/integrations/zoho/zoho-inventory.types.ts   (extend)
```

### Testing strategy

- Mock HTTP: STOCK_OUT → negative adjustment call
- Unmapped item → skip without HTTP
- Token refresh invoked when expired

---

## 2.5.4 — Retry Processing

**Goal:** Wire first real domain event handler; process push asynchronously with retries.

### Deliverables

| Item | Detail |
|------|--------|
| `ZohoPushHandler` | Implements handler interface |
| `DomainEventsService.dispatch()` registry | Route `zoho.stock_push.requested` → handler |
| `ZohoPushService` | Orchestrate: load txn → mapping → idempotency → API → audit |
| `integration_sync_runs` | `direction=push`, `trigger=task_complete` |
| Env | `ZOHO_PUSH_ENABLED=true` (master switch) |

### Dependencies

- **2.5.1** events
- **2.5.2** idempotency
- **2.5.3** client
- `DomainEventsProcessorCron` (exists)

### Risks

| Risk | Mitigation |
|------|------------|
| R-Z10 double push | Idempotency table |
| R-O01 dispatch no-op | Replace with registry map |
| Handler throws → blocks batch | Existing per-event try/catch in processor |
| Infinite retry on unmapped | Handler completes event with skip, not throw |

### Files likely affected

```text
backend/src/services/domain-events/domain-events.service.ts
backend/src/services/domain-events/handlers/zoho-push.handler.ts
backend/src/services/integrations/zoho/zoho-push.service.ts
backend/src/services/integrations/integration.module.ts
```

### Testing strategy

- Mock Zoho: event → API called once
- Replay event → API not called twice
- 401 → refresh + retry
- Phase 2.2–2.4 regression suites

---

## 2.5.5 — Validation & Observability

**Goal:** Sign-off criteria, API visibility, documentation.

### Deliverables

| Item | Detail |
|------|--------|
| Integration tests | Full push path with mocked Zoho |
| API extension | Optional: last push sync fields on `/integrations/connections` |
| Reports | `34-zoho-push-*` validation series |
| Phase 2 final signoff | After 2.5.5 |

### Dependencies

- **2.5.1–2.5.4** complete

### Testing strategy

| # | Test |
|---|------|
| 1 | Task complete → ledger → event → mock Zoho |
| 2 | Unmapped → skip gracefully |
| 3 | Idempotent replay |
| 4 | Push failure → event retry |
| 5 | ZOHO_PULL rows never pushed |
| 6 | Phase 0–2.4 regression |

---

## Implementation order

| Order | Phase | PR suggestion | Blocks |
|-------|-------|---------------|--------|
| 1 | **2.5.1** Event capture | `feat/zoho-push-events` | — |
| 2 | **2.5.2** Idempotency table | `feat/zoho-push-idempotency` | 2.5.1 |
| 3 | **2.5.3** Zoho adjust client | `feat/zoho-push-client` | 2.2 |
| 4 | **2.5.4** Handler + dispatch | `feat/zoho-push-handler` | 2.5.1–2.5.3 |
| 5 | **2.5.5** Validation + signoff | `feat/zoho-push-validation` | 2.5.4 |

**Note:** 2.5.2 and 2.5.3 can run in parallel after 2.5.1 is merged.

---

## Explicit non-goals (P2 v1)

- CSV import push
- ZOHO_PULL echo push
- Synchronous push on task path
- Zoho webhooks / bidirectional sync
- Changes to `InventoryTransactionService` internals
- Stock push web UI controls (beyond optional last-push metadata)

---

## Ready for Phase 2.5 implementation

Analysis complete. Proceed with **2.5.1 Event Capture** as first PR.
