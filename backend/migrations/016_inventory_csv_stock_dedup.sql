-- Prevent duplicate CSV import stock-in per item + batch (confirm retry protection)
-- Apply after 015_whatsapp_webhook_dedup.sql.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_txn_csv_import_item_batch
  ON inventory_transactions (inventory_item_id, reference_type, reference_id)
  WHERE reference_type = 'CSV_IMPORT' AND reference_id IS NOT NULL;

COMMIT;
