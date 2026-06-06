# Phase 3.2 — Integration Sync Failure Alert Analysis

**Run date:** 2026-06-06  
**Scope:** Proactive `integration.sync_failed` domain event + WhatsApp alert

---

## 1. Problem Statement

Phase 2 logged integration failures to `integration_sync_runs` and `integration_push_deliveries`, but owners received **no proactive WhatsApp** when pull sync failed or push deliveries exhausted retries (Phase 2 audit limitation #2).

Phase 3.2 closes this gap:

```text
Pull sync FAILED / Terminal push FAILED
      ↓
integration.sync_failed domain event
      ↓
DomainEventsProcessorCron
      ↓
IntegrationSyncFailedAlertHandler
      ↓
WhatsApp to factory owner
```

---

## 2. Publish Sources

| Source | Condition | Aggregate key |
|--------|-----------|---------------|
| Manual pull sync | `SYNC_STATUS.FAILED` (catch or all items failed) | `integration_sync_run:{sync_run_id}` |
| Scheduled pull sync | Same — uses `ZohoPullSyncService` | Same |
| Terminal push delivery | `retry_count >= 4` or non-retryable terminal | `integration_push_delivery:{delivery_id}` |

**Not published:** Retryable push failures with remaining attempts, successful retries, partial pull sync, skipped unmapped.

---

## 3. Dedup Strategy

Before publish, check `domain_events` for existing row with same:

- `event_type = integration.sync_failed`
- `aggregate_type` + `aggregate_id`

One alert per sync run or delivery — prevents owner spam on reprocessing.

---

## 4. Payload Design

```json
{
  "factory_id": 123,
  "provider": "zoho_inventory",
  "direction": "pull",
  "connection_id": 5,
  "sync_run_id": 99,
  "delivery_id": null,
  "error_summary": "Token expired",
  "occurred_at": "2026-06-06T12:00:00.000Z"
}
```

---

## 5. Constraints

| Rule | Approach |
|------|----------|
| No pull sync behavior change | Publish calls added after existing status updates only |
| No push retry behavior change | Publish only in terminal branches of `applyExecutionOutcome` |
| No OAuth/inventory changes | Alert layer only |

---

## Conclusion

Minimal alerting on existing failure paths, reusing Phase 3.1 outbox + handler pattern.
