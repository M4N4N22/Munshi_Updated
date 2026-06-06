-- Push delivery retry tracking (Phase 2.5.5)
-- Apply after 012_integration_push_deliveries.sql.

BEGIN;

ALTER TABLE integration_push_deliveries
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE integration_push_deliveries
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

ALTER TABLE integration_push_deliveries
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_integration_push_deliveries_retry_due
  ON integration_push_deliveries (status, next_retry_at)
  WHERE status = 'failed';

COMMIT;
