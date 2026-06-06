# Phase 2.5.5 — Retry Processing Analysis

**Run date:** 2026-06-06  
**Scope:** Failed push delivery retry eligibility and backoff design

---

## 1. Problem Statement

Phase 2.5.4 processes `zoho.stock_push.requested` events and calls Zoho `adjustStock()`. Transient Zoho or network failures leave deliveries in `failed` status. Without retry processing, those adjustments are lost until manual intervention.

Phase 2.5.5 adds **operational hardening**: a cron-driven retry processor that re-attempts eligible failed deliveries using the same read-only push path (R-Z06).

```text
Initial Push (2.5.4)
      ↓
FAILED delivery
      ↓
Retry Processor (2.5.5) — cron every minute
      ↓
adjustStock() (read-only ledger)
      ↓
DELIVERED | FAILED (with backoff) | terminal FAILED
```

---

## 2. Delivery Status Analysis (`integration_push_deliveries`)

| Status | Meaning | Retryable? | Rationale |
|--------|---------|------------|-----------|
| `pending` | Registered; first attempt not yet confirmed | **No** | Handled by initial event dispatch (2.5.4), not the retry batch. Rows should not remain pending after handler runs. |
| `delivered` | Zoho acknowledged successfully | **No** | Idempotent success — re-push would duplicate external adjustments (R-P05-01). |
| `failed` | Push attempt failed | **Yes** (conditional) | Only status eligible for retry. Must satisfy `retry_count < 4` and `next_retry_at <= now`. |
| `skipped_unmapped` | No item mapping; no API call attempted | **No** | Terminal business decision — retrying without a mapping would loop forever. Mapping must be added and a new event/delivery flow used. |

---

## 3. Retry Eligibility Rules

A delivery is picked up by `listFailedDeliveriesDueRetry()` when **all** of:

1. `status = 'failed'`
2. `retry_count < MAX_PUSH_DELIVERY_ATTEMPTS` (4)
3. `next_retry_at IS NOT NULL AND next_retry_at <= NOW()`

Terminal failed deliveries (`retry_count >= 4` or `next_retry_at IS NULL` after max attempts) are excluded permanently.

---

## 4. Backoff Schedule

| Attempt | When | Delay from prior failure |
|---------|------|--------------------------|
| 1 | Immediate (initial handler) | — |
| 2 | Retry 1 | +0 (immediate on next due tick) |
| 3 | Retry 2 | +15 minutes |
| 4 | Retry 3 | +60 minutes |
| After 4 | Terminal `failed` | +6 hours was scheduled but never runs — max exceeded |

**Note:** `retry_count` tracks completed failed attempts. After the 4th failed attempt, `next_retry_at` is set to `NULL` and the row is terminal.

Constants: `zoho-push-retry.constants.ts` — `PUSH_RETRY_BACKOFF_MS`, `MAX_PUSH_DELIVERY_ATTEMPTS = 4`.

---

## 5. Safety Preconditions (No Retry Side-Effects)

Before calling `adjustStock()`, the shared `ZohoPushExecutionService` verifies:

| Check | On failure |
|-------|------------|
| Connection exists and `status = active` | Stay `failed`, preserve `retry_count` |
| Token refresh succeeds | Stay `failed`, preserve `retry_count` |
| Ledger row exists (TASK reference) | Terminal `failed` (`retry_count = 4`) |
| Item mapping exists | Transition to `skipped_unmapped` |

Safety failures do **not** consume a retry attempt — `preserveRetryCount: true` on the outcome.

---

## 6. Schema Extension

Migration `013_push_delivery_retry.sql` adds to existing `integration_push_deliveries`:

- `retry_count INTEGER NOT NULL DEFAULT 0`
- `last_attempt_at TIMESTAMPTZ`
- `next_retry_at TIMESTAMPTZ`
- Partial index `idx_integration_push_deliveries_retry_due` on `(status, next_retry_at) WHERE status = 'failed'`

No new tables. Reuses delivery ledger from 2.5.2.

---

## 7. R-Z06 Compliance

Retry path uses `ZohoPushExecutionService.executeForDelivery()` which:

- **Reads** `inventory_transactions` (ledger lookup only)
- **Never** calls `recordStockIn()`, `recordStockOut()`, or modifies `inventory_items.current_quantity`

Inventory remains Munshi source-of-truth; Zoho receives outbound adjustments only.

---

## 8. Infrastructure Reuse

| Component | Reused from |
|-----------|-------------|
| Cron tick | `@nestjs/schedule` — same as domain-events and scheduled sync |
| Push logic | `ZohoPushExecutionService` (extracted from handler in 2.5.5) |
| OAuth / client | `ZohoOAuthService`, `ZohoInventoryClient.adjustStock()` |
| Delivery repo | `IntegrationRepository` extended with retry methods |

No new queue, worker process, or scheduler framework.

---

## 9. Feature Flag

`ZOHO_PUSH_RETRY_ENABLED` — default enabled (`undefined` = on). Set to `0`/`false`/`no` to disable cron batch without code change.

---

## 10. Conclusion

**Retryable:** `failed` only, with backoff and max-attempt cap.  
**Not retryable:** `delivered`, `skipped_unmapped`, `pending`, terminal `failed`.  
**Design approved for implementation** — minimal schema, shared execution service, existing cron infrastructure.
