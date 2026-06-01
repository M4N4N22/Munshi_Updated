-- Business Discovery Framework (Prompt 11)
-- Progressive business profiling without mandatory onboarding.

BEGIN;

CREATE TABLE IF NOT EXISTS business_discovery_profiles (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  identity_completion INTEGER NOT NULL DEFAULT 0,
  organization_completion INTEGER NOT NULL DEFAULT 0,
  inventory_completion INTEGER NOT NULL DEFAULT 0,
  vendor_completion INTEGER NOT NULL DEFAULT 0,
  overall_completion INTEGER NOT NULL DEFAULT 0,
  bucket_data JSONB NOT NULL DEFAULT '{}',
  reminder_stage INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_discovery_profiles_status
  ON business_discovery_profiles (status);
CREATE INDEX IF NOT EXISTS idx_business_discovery_profiles_next_reminder
  ON business_discovery_profiles (next_reminder_at)
  WHERE next_reminder_at IS NOT NULL AND status = 'ACTIVE';

COMMIT;
