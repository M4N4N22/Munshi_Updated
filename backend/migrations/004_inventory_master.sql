-- Munshi Inventory Master (Prompt 6)
-- Apply after 001/002/003 migrations.

BEGIN;

-- Items require category and location (Prompt 6 business rules)
ALTER TABLE inventory_items
  ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE inventory_items
  ALTER COLUMN location_id SET NOT NULL;

-- Document transaction types used by application (informational comment)
COMMENT ON COLUMN inventory_transactions.transaction_type IS
  'STOCK_IN | STOCK_OUT | ADJUSTMENT — quantity changes only via transactions';

COMMIT;
