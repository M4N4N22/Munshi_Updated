# Phase 3.2 — Integration Sync Failure Implementation

**Run date:** 2026-06-06  
**Status:** IMPLEMENTED

---

## Files Added / Modified

| File | Change |
|------|--------|
| `domain-events.constants.ts` | `INTEGRATION_SYNC_FAILED: 'integration.sync_failed'` |
| `domain-events.service.ts` | Route to `IntegrationSyncFailedAlertHandler` |
| `domain-events.service.spec.ts` | Dispatch test |
| `integration-sync-failed.helper.ts` | Payload builder + deduped publish |
| `integration-sync-failed.helper.spec.ts` | Unit tests |
| `integration-sync-failed.publisher.ts` | Injectable publish facade |
| `integration-sync-failed-alert.handler.ts` | Owner WhatsApp handler |
| `zoho-pull-sync.service.ts` | Publish on FAILED (catch + all-items-failed) |
| `zoho-push-execution.service.ts` | Publish on terminal push failure |
| `integration.module.ts` | DomainEventsModule, MessagingModule, new providers |
| `whatsapp.templates.ts` | `buildIntegrationSyncFailedAlertText()` |
| `integration-sync-failed-alert.integration.spec.ts` | 6 scenario tests |

---

## Publish Flow

### Pull sync

```typescript
// After sync run marked FAILED (catch or runStatus === FAILED)
await syncFailedPublisher.publishPullSyncFailure({
  factoryId, connectionId, syncRunId, errorSummary,
});
```

### Terminal push

```typescript
// In applyExecutionOutcome — terminal_failed or max retries / non-retryable
await syncFailedPublisher.publishPushDeliveryFailure({
  factoryId, connectionId, deliveryId, errorSummary,
});
```

---

## Handler

`IntegrationSyncFailedAlertHandler` → resolve owner phone → Hindi/Hinglish template → `MessagingService.sendText()`.

---

## Module Wiring

```text
IntegrationModule
  imports: forwardRef(InventoryModule), forwardRef(DomainEventsModule), MessagingModule
  providers: IntegrationSyncFailedPublisher, IntegrationSyncFailedAlertHandler

DomainEventsModule
  imports: forwardRef(IntegrationModule)  // handler injection
```

`IntegrationSyncFailedPublisher` uses `@Inject(forwardRef(() => DomainEventsService))` for circular dep resolution.
