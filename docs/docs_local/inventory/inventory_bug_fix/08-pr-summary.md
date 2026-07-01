# PR Summary — Inventory Import Idempotency

## Title

fix(inventory): webhook idempotency, remove auto-import, confirm locking

## Root Cause

1. Legacy `canAutoImport()` allowed owner/manager CSV uploads without review session
2. Duplicate Olli webhook deliveries re-processed the same `message_id`
3. Parallel CONFIRM handling had no `importing` lock, causing duplicate `processImportWithProvisioning()` calls

## Files Changed

### Backend — Core fix

- `backend/src/modules/whatsapp/whatsapp.service.ts`
- `backend/src/modules/whatsapp/whatsapp.controller.ts`
- `backend/src/modules/whatsapp/inventory-bulk-import.service.ts`
- `backend/src/modules/whatsapp/whatsapp-webhook-dedup.*` (new)
- `backend/src/services/inventory/inventory-import.service.ts`
- `backend/src/services/inventory/inventory.repository.ts`
- `backend/src/core/services/db-service/models.ts`
- `backend/src/modules/whatsapp/whatsapp.module.ts`

### Migrations

- `backend/migrations/015_whatsapp_webhook_dedup.sql`
- `backend/migrations/016_inventory_csv_stock_dedup.sql`

### Tests

- `inventory-bulk-import.service.spec.ts` (updated)
- `whatsapp-webhook-dedup.*.spec.ts` (new)
- `whatsapp.controller.spec.ts` (new)
- `inventory-import-idempotency.integration.spec.ts` (new)
- `inventory-csv-whatsapp.integration.spec.ts` (updated)

### Docs

- `docs/docs_local/inventory/inventory_bug_fix/01–08`

## Migration Notes

Run before deploy:

```bash
npm run migrate
```

Expect 18 migrations applied (was 16). New tables/indexes are additive.

## Deployment Impact

- **Breaking (WhatsApp UX):** Owners can no longer attach inventory CSV without `/inventory_import_csv` first
- **Non-breaking:** REST import unchanged
- **Performance:** One INSERT per unique webhook message_id (negligible)

## Rollback Plan

1. Revert merge commit
2. Optional: drop `whatsapp_webhook_events` and unique index (not required for code rollback)

## Test Evidence

- Unit: **386/386 PASS**
- Integration: NOT VERIFIED (no local Postgres)

## Risks Remaining

1. Webhooks without `message_id` cannot be deduplicated (logged, still processed)
2. Re-import after successful completion with new session still adds stock (by design)
3. `whatsapp_webhook_events` table grows unbounded — consider TTL cleanup in future PR

## Do Not Merge Until

- [ ] Migrations applied on staging
- [ ] Manual WhatsApp import smoke test on staging
- [ ] Reviewer approval
