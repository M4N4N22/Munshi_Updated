-- Munshi Workflow Session Engine (Prompt 4)
-- Apply after 001/002 migrations.

BEGIN;

CREATE TABLE IF NOT EXISTS workflow_sessions (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  workflow_type VARCHAR(64) NOT NULL,
  current_step VARCHAR(64) NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_sessions_factory_id
  ON workflow_sessions (factory_id);

CREATE INDEX IF NOT EXISTS idx_workflow_sessions_phone_status
  ON workflow_sessions (phone_number, status);

CREATE INDEX IF NOT EXISTS idx_workflow_sessions_factory_status
  ON workflow_sessions (factory_id, status);

-- One active workflow per phone number
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_sessions_active_phone
  ON workflow_sessions (phone_number)
  WHERE status = 'ACTIVE';

COMMIT;
