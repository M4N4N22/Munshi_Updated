-- WhatsApp inbound webhook idempotency (inventory import duplicate fix)
-- Deduplicates provider message_id retries from Olli/WABA webhook delivery.
-- Apply after 014_low_stock_alert_context.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id SERIAL PRIMARY KEY,
  provider_message_id VARCHAR(256) NOT NULL,
  event_kind VARCHAR(32) NOT NULL,
  from_phone VARCHAR(32),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_webhook_events_provider_message_id
  ON whatsapp_webhook_events (provider_message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_from_phone
  ON whatsapp_webhook_events (from_phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_processed_at
  ON whatsapp_webhook_events (processed_at);

COMMIT;
