-- Web onboarding setup: inventory + team ingest before WhatsApp handoff.

ALTER TABLE factories
  ADD COLUMN IF NOT EXISTS onboarding_inventory_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_team_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_pending_welcomes JSONB NOT NULL DEFAULT '[]'::jsonb;
