-- Business Discovery Expansion (Prompt 13)
-- Adds manager/workforce completion columns; preserves existing profile rows.

BEGIN;

ALTER TABLE business_discovery_profiles
  ADD COLUMN IF NOT EXISTS manager_completion INTEGER NOT NULL DEFAULT 0;

ALTER TABLE business_discovery_profiles
  ADD COLUMN IF NOT EXISTS workforce_completion INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN business_discovery_profiles.organization_completion IS
  'ORGANIZATION_STRUCTURE bucket completion (legacy name retained for compat)';

COMMENT ON COLUMN business_discovery_profiles.inventory_completion IS
  'INVENTORY_DISCOVERY bucket completion';

COMMENT ON COLUMN business_discovery_profiles.vendor_completion IS
  'VENDOR_DISCOVERY bucket completion';

COMMIT;
