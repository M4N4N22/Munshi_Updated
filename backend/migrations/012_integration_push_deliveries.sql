-- Integration push delivery idempotency (Phase 2.5.2)
-- Tracks outbound stock push intent per connection + inventory transaction.
-- Apply after 011_integration_foundation.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS integration_push_deliveries (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES integration_connections (id),
  factory_id INTEGER NOT NULL REFERENCES factories (id),
  inventory_transaction_id INTEGER NOT NULL REFERENCES inventory_transactions (id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  zoho_reference VARCHAR(256),
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_push_deliveries_connection_inventory_txn
  ON integration_push_deliveries (connection_id, inventory_transaction_id);

CREATE INDEX IF NOT EXISTS idx_integration_push_deliveries_connection_id
  ON integration_push_deliveries (connection_id);

CREATE INDEX IF NOT EXISTS idx_integration_push_deliveries_factory_id
  ON integration_push_deliveries (factory_id);

CREATE INDEX IF NOT EXISTS idx_integration_push_deliveries_status
  ON integration_push_deliveries (status);

CREATE INDEX IF NOT EXISTS idx_integration_push_deliveries_inventory_transaction_id
  ON integration_push_deliveries (inventory_transaction_id);

COMMIT;
