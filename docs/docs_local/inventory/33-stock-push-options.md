# Phase 2.5A — Stock Push Architecture Options

**Run date:** 2026-06-04  
**Scope:** Architecture evaluation — no implementation

---

## 1. Sync Architecture Options

### Option A — Synchronous push

```text
Task completion transaction
    ↓
recordStockOut / recordStockIn
    ↓
Zoho Inventory API (same request path)
    ↓
COMMIT or ROLLBACK
```

| Pros | Cons |
|------|------|
| Immediate consistency in Zoho | **Violates P2 requirement** — task must not fail on Zoho outage |
| Simpler mental model | Extends transaction latency; Zoho timeout risks DB lock hold |
| No queue infrastructure | Rate limits block user-facing task completion |
| | Cannot reuse existing outbox/retry |
| | Breaks Phase 0 atomic completion UX |

**Verdict:** **Reject** for P2. Acceptable only for admin-only manual "sync now" tools (not task path).

---

### Option B — Async queue (dedicated queue table + worker)

```text
Ledger commit
    ↓
INSERT integration_push_queue (status=pending)
    ↓
Dedicated ZohoPushWorker cron
    ↓
Zoho API
```

| Pros | Cons |
|------|------|
| Clear separation of concerns | **Parallel infrastructure** to existing `domain_events` |
| Custom retry/backoff per queue | Two outbox patterns to maintain |
| Idempotency colocated with queue | Extra migration + worker |
| | Duplicates `DomainEventsProcessorCron` behavior |

**Verdict:** **Viable** but **not recommended** — Munshi already invested in domain events outbox (P0 finance foundation).

---

### Option C — Outbox pattern (recommended)

```text
Ledger commit (task transaction)
    ↓
DomainEventsService.publish(ZOHO_STOCK_PUSH_REQUESTED)
    payload: { factory_id, inventory_transaction_id, connection_id?, ... }
    ↓
domain_events (status=PENDING)
    ↓
DomainEventsProcessorCron (every minute — exists today)
    ↓
dispatch registry → ZohoPushHandler
    ↓
ZohoPushService → Zoho Inventory adjustment API
    ↓
integration_sync_runs (direction=push) + idempotency record
```

| Pros | Cons |
|------|------|
| **Reuses existing table + cron + retry** (`MAX_ATTEMPTS=5`) | Must implement first real `dispatch()` handler |
| Task completion decoupled from Zoho latency | Event payload schema must be versioned |
| Same pattern as future Phase 3 alerts | Processor currently no-op — small wiring change |
| Observability via `domain_events.last_error` | Minute-level latency (acceptable for P2) |
| Factory-scoped events already supported | |

**Verdict:** **Recommend Option C.**

---

## 2. Recommended Architecture

### 2.1 Event capture (after commit)

Publish from `TasksService.completeTaskWithAtomicInventory()` **after** successful transaction:

```typescript
// Pseudocode — not implementation
await sequelize.transaction(async (tx) => {
  await executeTaskInventoryMovements({ ..., transaction: tx });
  await task.update({ is_completed: true }, { transaction: tx });
});
// Post-commit only:
for (const txn of createdTransactionIds) {
  await domainEvents.publish({
    factory_id,
    event_type: 'zoho.stock_push.requested',
    aggregate_type: 'inventory_transaction',
    aggregate_id: String(txn.id),
    payload: { inventory_transaction_id, task_id, factory_id },
  });
}
```

**Alternative:** publish single event per task with array of transaction IDs — simpler capture, handler iterates. Trade-off: partial handler failure retry replays whole task batch (idempotency per txn still required).

**Recommendation:** one event per inventory transaction row for finer idempotency.

### 2.2 Handler pipeline

```text
ZohoPushHandler
    ↓
Load inventory_transaction (verify reference_type=TASK)
    ↓
Load active connection (zoho_inventory)
    ↓
Load mapping by inventory_item_id
    ↓
If unmapped → mark event COMPLETED with skip reason (not FAILED)
    ↓
refreshConnectionIfNeeded()
    ↓
ZohoInventoryClient.adjustStock(external_id, qty, direction)
    ↓
Record idempotency + sync_run progress
```

### 2.3 Idempotency

Before Zoho API call:

```sql
SELECT * FROM integration_push_deliveries
WHERE connection_id = ? AND inventory_transaction_id = ?
```

If `status = delivered` → skip API (replay safe).

**New table recommended** (minimal):

| Column | Purpose |
|--------|---------|
| `connection_id` | FK |
| `inventory_transaction_id` | FK unique per connection |
| `factory_id` | Scope |
| `status` | pending / delivered / failed / skipped_unmapped |
| `zoho_response_ref` | Optional external ref |
| `delivered_at` | Audit |
| `last_error` | Debug |

Unique: `(connection_id, inventory_transaction_id)`.

---

## 3. Failure Recovery Design

### 3.1 Failure modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| **Zoho outage (5xx)** | HTTP error | `domain_events` retry with backoff (existing attempts counter) |
| **Token expiry (401)** | API 401 | Handler calls `refreshConnectionIfNeeded`; retry once; else re-queue |
| **Rate limit (429)** | HTTP 429 | Exponential backoff; respect `Retry-After` if present |
| **Network timeout** | Client timeout | Retry via outbox |
| **Partial task (multi-line)** | Per-txn events | Each event independent; one line failure doesn't block others |
| **Duplicate push** | Event replay | Idempotency table short-circuit |
| **Unmapped SKU** | No mapping row | Skip with `skipped_unmapped`; do not retry infinitely |

### 3.2 Retry strategy

| Layer | Strategy |
|-------|----------|
| **Outbox (`domain_events`)** | Existing: up to 5 attempts, status returns to PENDING |
| **Handler internal** | 1 token refresh retry per attempt |
| **HTTP client** | 2 retries on 429/5xx with jitter (mirror `ZohoInventoryClient` pull pattern) |
| **Poison messages** | After 5 failures → FAILED; ops alert via logs + `integration_sync_runs` |

### 3.3 Backoff

| Attempt | Delay (suggested) |
|---------|-------------------|
| 1 | Immediate (cron tick) |
| 2 | 1 min (scheduled_at bump) |
| 3 | 5 min |
| 4 | 15 min |
| 5 | 60 min → FAILED |

Implement via `scheduled_at` on event row (already exists) rather than sleep in handler.

### 3.4 Idempotency strategy

- **Key:** `(connection_id, inventory_transaction_id)`
- **Store before API call:** insert `pending` delivery row (unique constraint prevents double API)
- **After success:** update to `delivered`
- **Zoho-side:** use stable client reference = `munshi-txn-{inventory_transaction_id}` if API supports idempotency key

---

## 4. Data model recommendation

| Table | Needed for 2.5? | Role |
|-------|-----------------|------|
| `integration_connections` | Existing | Auth |
| `integration_item_mappings` | Existing | Zoho item_id lookup |
| `integration_sync_runs` | Existing | Push batch audit (`direction=push`) |
| `domain_events` | Existing | Outbox queue |
| **`integration_push_deliveries`** | **New (recommended)** | Per-transaction idempotency + delivery audit |

**Can `integration_sync_runs` be reused?** Yes — one run per handler batch or per factory tick with `direction=push`, `trigger=task_complete`. Per-transaction detail belongs in push deliveries or event payload, not one run per txn (too many rows).

**Is separate outbox needed?** No — `domain_events` is the outbox.

---

## 5. Observability (P2.5 requirements)

| Signal | Source |
|--------|--------|
| Push attempted | `domain_events.event_type` |
| Push succeeded | `integration_push_deliveries.status=delivered` |
| Push failed | `domain_events.last_error`, delivery row |
| Batch summary | `integration_sync_runs` (push) |
| Unmapped skips | delivery `skipped_unmapped` + structured log |
| Owner visibility | Extend `/integrations/connections` with last push sync (mirror pull fields) — optional 2.5.5 |

No new WhatsApp infrastructure required for v1; reuse pattern from pull summary if needed later.

---

## 6. Comparison summary

| Criterion | Option A Sync | Option B Queue | Option C Outbox |
|-----------|---------------|----------------|-----------------|
| Task completion safety | **Fail** | Pass | **Pass** |
| Reuses existing infra | — | Partial | **Best** |
| Idempotency | Hard | Good | **Good** |
| Implementation cost | Low | Medium | **Medium-low** |
| P2 alignment | **No** | Yes | **Yes** |

**Final recommendation: Option C — Outbox via `domain_events` + `ZohoPushHandler` + optional `integration_push_deliveries` idempotency table.**
