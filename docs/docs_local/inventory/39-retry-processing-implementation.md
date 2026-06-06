# Phase 2.5.5 — Retry Processing Implementation

**Run date:** 2026-06-06  
**Status:** IMPLEMENTED

---

## 1. Files Changed / Added

| File | Purpose |
|------|---------|
| `migrations/013_push_delivery_retry.sql` | `retry_count`, `last_attempt_at`, `next_retry_at`, due index |
| `integration.schema.ts` | Retry columns on `IntegrationPushDelivery` model |
| `integration.repository.ts` | `markFailedWithRetry`, `touchPushAttempt`, `listFailedDeliveriesDueRetry`; `markDelivered` clears `next_retry_at` |
| `zoho-push-retry.constants.ts` | Backoff map, eligibility helpers, feature flag |
| `zoho-push-retry.constants.spec.ts` | Unit tests for backoff/eligibility |
| `zoho-push-execution.service.ts` | **Shared** push execution (handler + retry) |
| `zoho-push-retry.service.ts` | Batch processor + API list helper |
| `zoho-push-retry.cron.ts` | `@Cron(EVERY_MINUTE)` tick |
| `zoho-push-retry.dto.ts` | Query DTO for list endpoint |
| `zoho-stock-push.handler.ts` | Refactored to delegate to `ZohoPushExecutionService` |
| `zoho-sync.controller.ts` | `GET /integrations/zoho/sync/push-deliveries` |
| `integration.module.ts` | Registers execution, retry service, cron |
| `zoho-stock-push.handler.spec.ts` | Updated unit tests |
| `zoho-push-retry.integration.spec.ts` | 8 retry scenario tests |
| `push-idempotency.integration.spec.ts` | Extended column assertion for retry fields |

---

## 2. Architecture

```text
ZohoPushRetryCron (every minute)
      ↓
ZohoPushRetryService.runRetryBatch(limit=50)
      ↓
IntegrationRepository.listFailedDeliveriesDueRetry()
      ↓
for each delivery:
  ZohoPushRetryService.retryDelivery()
      ↓
  ZohoPushExecutionService.executeForDelivery()
      ├─ touchPushAttempt (last_attempt_at)
      ├─ verify connection active
      ├─ refreshConnectionIfNeeded()
      ├─ read ledger (TASK only)
      ├─ resolve mapping
      └─ ZohoInventoryClient.adjustStock()
      ↓
  ZohoPushExecutionService.applyExecutionOutcome()
      ├─ delivered → markDelivered
      ├─ skipped_unmapped → markSkippedUnmapped
      ├─ preserveRetryCount → markFailedWithRetry (unchanged count)
      └─ failed + scheduleRetry → increment retry_count, compute next_retry_at
```

Initial push (2.5.4) uses the same `ZohoPushExecutionService` from `ZohoStockPushHandler`.

---

## 3. Backoff Implementation

```typescript
PUSH_RETRY_BACKOFF_MS = { 1: 0, 2: 15min, 3: 60min, 4: 6h }
MAX_PUSH_DELIVERY_ATTEMPTS = 4

computeNextRetryAt(failedAttemptCount) → Date | null
isDeliveryRetryEligible(status, retryCount, nextRetryAt) → boolean
```

After handler or retry failure with `scheduleRetry: true`:

- `retry_count` incremented
- `next_retry_at = computeNextRetryAt(newCount)`
- When `retry_count >= 4` or non-retryable API error: `next_retry_at = NULL` (terminal)

---

## 4. Safety Controls

| Scenario | Outcome field | DB effect |
|----------|---------------|-----------|
| Inactive/disconnected connection | `preserveRetryCount: true` | `failed`, count unchanged |
| Token refresh error | `preserveRetryCount: true` | `failed`, count unchanged |
| Missing mapping | `skipped_unmapped` | Terminal skip |
| Missing/non-TASK ledger | `terminal_failed` | `retry_count = 4`, no schedule |
| Zoho error (retryable) | `scheduleRetry: true` | Increment count, schedule |
| Zoho error (non-retryable) | `scheduleRetry: false` | Terminal failed |

---

## 5. Observability

**API:** `GET /integrations/zoho/sync/push-deliveries?factory_id=&user_id=&connection_id=`

Response includes per delivery:

- `retry_count`
- `last_attempt_at`
- `next_retry_at`
- `status`, `last_error`, `zoho_reference`

Auth: `IntegrationAuthValidationService.assertCanManageIntegrations`.

**Logs:** Cron logs batch summary when `processed > 0`.

---

## 6. R-Z06 Verification

Grep audit of retry/execution path confirms **zero** calls to:

- `recordStockIn`
- `recordStockOut`
- `InventoryService` write methods

Only `InventoryTransaction.findOne` for read-only ledger access.

---

## 7. Environment

| Variable | Default | Effect |
|----------|---------|--------|
| `ZOHO_PUSH_RETRY_ENABLED` | enabled | Disable cron retry when `false` |

---

## 8. Migration Order

```
011_integration_foundation.sql
012_integration_push_deliveries.sql
013_push_delivery_retry.sql  ← new
```
