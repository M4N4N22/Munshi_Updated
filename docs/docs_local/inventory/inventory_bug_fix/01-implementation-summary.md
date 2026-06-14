# Inventory Import Idempotency — Implementation Summary

**Branch:** `feature/shantanu-inventory-import-idempotency`  
**Date:** 2026-06-10

## Objective

Eliminate duplicate inventory import execution caused by:

1. Legacy auto-import bypassing review flow (BUG 1)
2. Duplicate webhook deliveries without inbound idempotency (BUG 2)
3. Parallel CONFIRM processing race (BUG 3)

## Fixes Delivered

| Fix | Description | Key files |
|-----|-------------|-----------|
| **B** | Removed `canAutoImport()` path; CSV without `/inventory_import_csv` session returns guidance only | `whatsapp.service.ts`, `inventory-bulk-import.service.ts` |
| **A** | Postgres-backed webhook dedup on `provider_message_id` | `015_whatsapp_webhook_dedup.sql`, `whatsapp-webhook-dedup.service.ts`, `whatsapp.controller.ts` |
| **C** | `importing` phase lock on `confirmImport()` | `inventory-bulk-import.service.ts` |
| **Stock** | Unique index + skip duplicate CSV stock-in per item+batch | `016_inventory_csv_stock_dedup.sql`, `inventory-import.service.ts` |

## Migrations

- `015_whatsapp_webhook_dedup.sql` — `whatsapp_webhook_events` table
- `016_inventory_csv_stock_dedup.sql` — partial unique index on CSV_IMPORT transactions

## Test Evidence

- **Unit:** 386/386 passed (`npm test`)
- **Integration:** Requires Postgres; NOT VERIFIED locally (no running DB). New suite: `inventory-import-idempotency.integration.spec.ts`

## Deployment Impact

- Apply migrations 015–016 before or during deploy
- No env var changes
- WhatsApp owners must use `/inventory_import_csv` before CSV upload (intentional behavior change)

## Rollback

1. Revert PR merge
2. Migrations are additive; rollback optional (dedup table can remain)
