-- Integration foundation (Phase 2.1)
-- Connections, item mappings, and sync run audit.
-- Apply after 010_task_inventory_lines.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS integration_connections (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL REFERENCES factories (id),
  provider VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_factory_id
  ON integration_connections (factory_id);

CREATE INDEX IF NOT EXISTS idx_integration_connections_provider
  ON integration_connections (provider);

CREATE INDEX IF NOT EXISTS idx_integration_connections_status
  ON integration_connections (status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_connections_factory_provider_active
  ON integration_connections (factory_id, provider)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS integration_item_mappings (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES integration_connections (id),
  factory_id INTEGER NOT NULL REFERENCES factories (id),
  external_id VARCHAR(128) NOT NULL,
  external_sku VARCHAR(128),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items (id),
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(32) NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_item_mappings_connection_external_id
  ON integration_item_mappings (connection_id, external_id);

CREATE INDEX IF NOT EXISTS idx_integration_item_mappings_factory_inventory_item
  ON integration_item_mappings (factory_id, inventory_item_id);

CREATE TABLE IF NOT EXISTS integration_sync_runs (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES integration_connections (id),
  factory_id INTEGER NOT NULL REFERENCES factories (id),
  direction VARCHAR(16) NOT NULL,
  trigger VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  items_processed INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_runs_connection_id
  ON integration_sync_runs (connection_id);

CREATE INDEX IF NOT EXISTS idx_integration_sync_runs_factory_id
  ON integration_sync_runs (factory_id);

CREATE INDEX IF NOT EXISTS idx_integration_sync_runs_status
  ON integration_sync_runs (status);

COMMIT;
