-- Munshi TraderOS — Vendor Master (Prompt 3)
-- Renames phone → phone_number, enforces required phone, adds unique indexes per factory.
-- Idempotent where possible.

BEGIN;

-- Rename legacy column from 001 if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'phone'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE vendors RENAME COLUMN phone TO phone_number;
  END IF;
END $$;

-- Ensure phone_number column exists (greenfield after updated 001)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32);

-- Backfill placeholder only for empty legacy rows (manual fix recommended in prod)
UPDATE vendors SET phone_number = 'UNKNOWN-' || id::text
WHERE phone_number IS NULL OR TRIM(phone_number) = '';

ALTER TABLE vendors ALTER COLUMN phone_number SET NOT NULL;

-- Drop non-unique name index from 001 if present
DROP INDEX IF EXISTS idx_vendors_factory_name;

-- Case-insensitive uniqueness per factory (name + phone)
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_factory_name_ci
  ON vendors (factory_id, LOWER(TRIM(name)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_factory_phone_ci
  ON vendors (factory_id, LOWER(TRIM(phone_number)));

CREATE INDEX IF NOT EXISTS idx_vendors_factory_active
  ON vendors (factory_id, is_active);

CREATE INDEX IF NOT EXISTS idx_vendors_factory_gst
  ON vendors (factory_id, gst_number);

COMMIT;
