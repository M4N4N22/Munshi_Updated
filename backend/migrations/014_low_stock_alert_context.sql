-- Low-stock alert CTA context: bridges title-only "Purchase karein" taps to itemId.
CREATE TABLE IF NOT EXISTS low_stock_alert_contexts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(32) NOT NULL,
  factory_id INTEGER NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  inventory_item_name VARCHAR(255) NOT NULL,
  alert_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_low_stock_alert_contexts_phone_expires
  ON low_stock_alert_contexts (phone_number, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_low_stock_alert_contexts_factory_item
  ON low_stock_alert_contexts (factory_id, inventory_item_id);
