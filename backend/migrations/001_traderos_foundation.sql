-- Munshi TraderOS foundation schema (Prompt 2)
-- Apply against PostgreSQL before enabling new modules in production.
-- Idempotent: safe to re-run (uses IF NOT EXISTS).

BEGIN;

-- ---------------------------------------------------------------------------
-- vendors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(255),
  email VARCHAR(255),
  address TEXT,
  gst_number VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_factory_id ON vendors (factory_id);
CREATE INDEX IF NOT EXISTS idx_vendors_factory_name ON vendors (factory_id, name);

-- ---------------------------------------------------------------------------
-- inventory_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_categories (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_categories_factory_name UNIQUE (factory_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_categories_factory_id
  ON inventory_categories (factory_id);

-- ---------------------------------------------------------------------------
-- inventory_locations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_locations (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_locations_factory_name UNIQUE (factory_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_factory_id
  ON inventory_locations (factory_id);

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  category_id INTEGER,
  location_id INTEGER,
  sku VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(64) NOT NULL,
  current_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC(18, 4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_items_factory_sku UNIQUE (factory_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_factory_id ON inventory_items (factory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items (category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_id ON inventory_items (location_id);

-- ---------------------------------------------------------------------------
-- inventory_transactions (append-only audit; created_at only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  inventory_item_id INTEGER NOT NULL,
  transaction_type VARCHAR(64) NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL,
  reference_type VARCHAR(128),
  reference_id INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_factory_id
  ON inventory_transactions (factory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id
  ON inventory_transactions (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference
  ON inventory_transactions (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- purchase_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_requests (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  requester_id INTEGER NOT NULL,
  vendor_id INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_factory_id ON purchase_requests (factory_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_factory_status
  ON purchase_requests (factory_id, status);

-- Indexes depend on column names (006 may have renamed requester_id / vendor_id on re-run).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'requester_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_requests_requester_id
      ON purchase_requests (requester_id);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'requested_by'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_by
      ON purchase_requests (requested_by);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'vendor_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_requests_vendor_id
      ON purchase_requests (vendor_id);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'assigned_vendor_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_requests_assigned_vendor_id
      ON purchase_requests (assigned_vendor_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- approval_requests (polymorphic approval foundation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  entity_type VARCHAR(128) NOT NULL,
  entity_id INTEGER NOT NULL,
  requester_id INTEGER NOT NULL,
  approver_id INTEGER,
  status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
  remarks TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_factory_id ON approval_requests (factory_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_factory_status
  ON approval_requests (factory_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
  ON approval_requests (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_id ON approval_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_id ON approval_requests (approver_id);

COMMIT;
