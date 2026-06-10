# Staging UAT Plan

**Branch:** feature/shantanu-inventory-import-idempotency
**Target:** Railway staging (munshi-staging)
**Date:** 2026-06-10

## Railway Steps

1. Merge PR is **not** done yet — deploy feature branch to staging backend service
2. Open Railway project `munshi-staging` → backend service
3. Set deploy branch to `feature/shantanu-inventory-import-idempotency` (or use PR preview if available)
4. Run migrations against staging Postgres:
   ```bash
   POSTGRES_CONNECTION_STRING=<staging-url> npm run migrate
   ```
5. Verify health: `GET /health/migrations` → `pending_count: 0`, 18/18 applied
6. Redeploy backend if migration ran before new code was live

## WhatsApp Test Scenarios

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | No session CSV | Attach CSV without `/inventory_import_csv` | Guidance only, no import |
| 2 | Review flow | `/inventory_import_csv` → CSV → CONFIRM | One review, one complete |
| 3 | Webhook dedup | Replay same webhook payload (same message_id) | Second returns ok, no duplicate |
| 4 | Double CONFIRM | Send CONFIRM twice quickly | One import, second blocked |
| 5 | REST import | POST CSV via API | Unchanged behavior |

## DB Verification Queries

```sql
-- Migration count
SELECT COUNT(*) FROM schema_migrations;
-- Expected: 18

-- Webhook dedup table exists
SELECT COUNT(*) FROM whatsapp_webhook_events;

-- After one WhatsApp message, one row per message_id
SELECT provider_message_id, COUNT(*)
FROM whatsapp_webhook_events
GROUP BY provider_message_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Stock integrity after single import
SELECT it.inventory_item_id, it.reference_id, COUNT(*)
FROM inventory_transactions it
WHERE it.reference_type = 'CSV_IMPORT'
GROUP BY it.inventory_item_id, it.reference_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (for same batch retry)

-- Item quantity check
SELECT sku, current_quantity FROM inventory_items
WHERE sku = '<test-sku>';
```

## Expected Outcomes

- No duplicate "Inventory Import Review" for one user action
- No duplicate "Inventory import complete" for one CONFIRM
- `whatsapp_webhook_events` grows by 1 per unique inbound message
- Stock quantities not inflated on retry

## Rollback Criteria

Rollback if **any** of:

- Migrations fail to apply on staging
- Review flow broken (cannot complete import after CONFIRM)
- REST CSV import regresses
- Duplicate imports still occur after dedup deploy
- Stock quantities double on single CONFIRM

**Rollback steps:** Revert deploy to previous main build. Migrations 015–016 are additive and safe to leave in place.
