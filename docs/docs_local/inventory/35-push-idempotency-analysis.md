# Phase 2.5.2 — Push Idempotency Analysis

**Run date:** 2026-06-04  
**Scope:** Durable delivery tracking and idempotency — no push execution

---

## 1. Problem Statement

Phase 2.5.1 captures outbound sync intent as `zoho.stock_push.requested` domain events. Phase 2.5.4 will process those events and call Zoho. Without idempotency, duplicate event processing or concurrent handlers could create duplicate Zoho stock adjustments (R-P05-01, R-Z10).

Phase 2.5.2 adds a **delivery ledger** separate from the domain event outbox:

```text
Domain Event (2.5.1)
      ↓
Future Push Handler (2.5.4)
      ↓
ensurePushDelivery()  ← 2.5.2
      ↓
integration_push_deliveries row
      ↓
(Future) Zoho API call (2.5.3+)
```

---

## 2. Idempotency Key Design

**Natural key:** `(connection_id, inventory_transaction_id)`

| Dimension | Rationale |
|-----------|-----------|
| `connection_id` | One factory may have one active Zoho connection; push is per integration |
| `inventory_transaction_id` | One Munshi ledger row = one outbound push unit (matches 2.5.1 event cardinality) |

**Not used as key:** `task_id` (multi-line tasks produce multiple transactions), `domain_event_id` (events may replay).

**Database enforcement:** `UNIQUE (connection_id, inventory_transaction_id)` — race-safe at persistence layer.

---

## 3. Status Lifecycle

| Status | Meaning | Set by |
|--------|---------|--------|
| `pending` | Delivery registered; push not yet confirmed | `createDelivery` / `ensurePushDelivery` |
| `delivered` | Zoho acknowledged (future) | `markDelivered` |
| `failed` | Push attempt failed (future retry) | `markFailed` |
| `skipped_unmapped` | No item mapping; no API call (future) | Handler in 2.5.4 |

Phase 2.5.2 implements persistence and status transitions only. No handler sets `delivered` or `failed` in production yet.

---

## 4. ensurePushDelivery Flow

```text
findDelivery(factory, connection, inventory_txn)
    ├─ found → return { delivery, created: false }
    └─ not found → createDelivery(PENDING)
           ├─ success → return { delivery, created: true }
           └─ UniqueConstraintError (race) → findDelivery → return existing
```

**No exception-based duplicate flow** for callers — duplicates return the existing row with `created: false`.

---

## 5. Factory Scoping

All repository methods filter by `factory_id`:

- `findDelivery`, `markDelivered`, `markFailed`, `listDeliveries`

Prevents cross-factory reads/updates even if IDs are guessed.

---

## 6. Risks

| ID | Risk | Mitigation in 2.5.2 | Residual |
|----|------|---------------------|----------|
| R-P05-01 | Duplicate deliveries | Unique constraint + `ensurePushDelivery` | Low |
| R-P05-04 | Concurrent handler race | DB unique index; catch and re-fetch | Low |
| R-P05-05 | Event without delivery row | Handler calls `ensurePushDelivery` first (2.5.4) | Open until handler wired |
| R-P05-09 | Orphan delivery (no txn) | FK to `inventory_transactions` | Low |

---

## 7. Explicitly Out of Scope

- Zoho API client / HTTP calls
- `ZohoPushService`, `ZohoPushHandler`
- `DomainEventsService.dispatch()` registry changes
- Event processing or retry cron
- Task or inventory logic changes
