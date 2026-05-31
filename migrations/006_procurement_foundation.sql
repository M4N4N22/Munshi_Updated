-- Munshi Procurement Foundation (Prompt 10)
-- Extends purchase_requests, adds line items and audit trail.
-- Apply after migrations 001-005.

BEGIN;

-- Rename legacy columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'requester_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'requested_by'
  ) THEN
    ALTER TABLE purchase_requests RENAME COLUMN requester_id TO requested_by;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'vendor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'assigned_vendor_id'
  ) THEN
    ALTER TABLE purchase_requests RENAME COLUMN vendor_id TO assigned_vendor_id;
  END IF;
END $$;

ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS request_number VARCHAR(64);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL';
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_by INTEGER;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Ensure requested_by exists on greenfield 001 that used requester_id naming in app only
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS requested_by INTEGER;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS assigned_vendor_id INTEGER;

UPDATE purchase_requests
SET requested_at = COALESCE(requested_at, created_at)
WHERE requested_at IS NULL;

UPDATE purchase_requests
SET status = 'PENDING_APPROVAL'
WHERE status IN ('SUBMITTED');

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_requests_factory_request_number
  ON purchase_requests (factory_id, request_number)
  WHERE request_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_requests_factory_priority
  ON purchase_requests (factory_id, priority);

-- Line items
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id SERIAL PRIMARY KEY,
  purchase_request_id INTEGER NOT NULL,
  inventory_item_id INTEGER,
  item_name VARCHAR(255) NOT NULL,
  requested_quantity NUMERIC(18, 4) NOT NULL,
  unit VARCHAR(64) NOT NULL DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_pr_id
  ON purchase_request_items (purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_inventory_item_id
  ON purchase_request_items (inventory_item_id);

-- Audit trail
CREATE TABLE IF NOT EXISTS purchase_request_audit (
  id SERIAL PRIMARY KEY,
  purchase_request_id INTEGER NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  performed_by INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_audit_pr_id
  ON purchase_request_audit (purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_audit_event_type
  ON purchase_request_audit (event_type);

COMMIT;
