# Stock Integrity Validation

## Risk

Duplicate CONFIRM or duplicate import execution could call `recordCsvStockIn()` multiple times for the same batch, inflating `current_quantity`.

## Investigation

`processRow()` records STOCK_IN with:

- `reference_type = CSV_IMPORT`
- `reference_id = batchId`

No unique constraint existed on `(inventory_item_id, reference_type, reference_id)`.

Re-import with a **new** batchId intentionally adds stock again (by design for REST re-upload). The bug target is **same batch retry**.

## Protections Added

### 1. Application guard

`recordCsvStockIn()` checks `findCsvImportTransaction(itemId, batchId)` before inserting.

### 2. Database guard (`016_inventory_csv_stock_dedup.sql`)

```sql
CREATE UNIQUE INDEX uq_inventory_txn_csv_import_item_batch
  ON inventory_transactions (inventory_item_id, reference_type, reference_id)
  WHERE reference_type = 'CSV_IMPORT' AND reference_id IS NOT NULL;
```

## Remaining Behavior (Intentional)

Re-uploading the same CSV after a **completed** import (new session, new batchId) still adds stock-in per row quantity. This is existing REST/WhatsApp review behavior, not addressed in this fix.

## Test Coverage

- `inventory-import-idempotency.integration.spec.ts` — single STOCK_IN per confirm (Postgres required)
