-- Intent classification observability (ML hardening closure I1–I5)
-- Apply after 016_inventory_csv_stock_dedup.sql

BEGIN;

CREATE TABLE IF NOT EXISTS intent_classification_events (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  trace_id UUID NOT NULL,
  schema_version VARCHAR(8) NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  factory_id INTEGER,
  user_id INTEGER,
  user_role VARCHAR(32),
  phone_hash VARCHAR(64) NOT NULL,

  raw_length INTEGER NOT NULL DEFAULT 0,
  raw_hash VARCHAR(64) NOT NULL,
  raw_redacted TEXT,
  provider_message_id VARCHAR(256),

  inbound_path VARCHAR(64) NOT NULL,

  predicted_intent VARCHAR(64),
  classification_stage VARCHAR(64),
  llm_invoked BOOLEAN NOT NULL DEFAULT FALSE,
  llm_raw_intent VARCHAR(64),
  post_rule_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  classification_latency_ms INTEGER,

  worker_slug VARCHAR(128),
  depart_slug VARCHAR(128),
  task_id INTEGER,
  task_description TEXT,
  deadline VARCHAR(64),

  command_executed VARCHAR(64),
  outcome VARCHAR(64) NOT NULL,
  outcome_detail TEXT,
  role_block BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_started BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_id INTEGER,
  is_general_chat BOOLEAN NOT NULL DEFAULT FALSE,

  retry_within_60s BOOLEAN NOT NULL DEFAULT FALSE,
  retry_of_event_id UUID,
  misclass_score INTEGER NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_intent_classification_events_event_id
  ON intent_classification_events (event_id);

CREATE INDEX IF NOT EXISTS idx_ice_trace_id
  ON intent_classification_events (trace_id);

CREATE INDEX IF NOT EXISTS idx_ice_factory_created
  ON intent_classification_events (factory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ice_phone_hash_created
  ON intent_classification_events (phone_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ice_outcome_created
  ON intent_classification_events (outcome, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ice_review_queue
  ON intent_classification_events (misclass_score DESC, created_at DESC)
  WHERE reviewed_at IS NULL AND misclass_score >= 50;

COMMIT;
