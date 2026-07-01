# Fix C — Import Locking

## Problem

Parallel CONFIRM replies (from duplicate webhook text deliveries) could both pass `awaiting_confirm` check and execute `processImportWithProvisioning()` concurrently.

## Solution

Session phase state machine:

```
awaiting_upload → awaiting_confirm → importing → (completed, session cleared)
```

### Changes in `confirmImport()`

1. If phase is `importing` → return `WA_INVENTORY_IMPORT_IN_PROGRESS`
2. Before async import, atomically set phase to `importing`
3. On success or failure, clear session

### `handleReviewReply()`

Returns `Import already in progress.` when phase is `importing`.

### `importFromCsvBuffer()`

Blocks new CSV uploads while phase is `importing`.

## User Message

```
Import already in progress.
```

## Test Coverage

- `inventory-bulk-import.service.spec.ts` — `blocks double CONFIRM while import is in progress`
- `inventory-import-idempotency.integration.spec.ts` — concurrent CONFIRM (Postgres required)
