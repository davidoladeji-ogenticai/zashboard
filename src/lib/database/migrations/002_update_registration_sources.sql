-- ============================================================================
-- Migration 002: Update Registration Source Values
-- Purpose: Standardize signup source tracking across all platforms
-- ============================================================================

-- Update CHECK constraint to use new standardized source values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_registration_source_check;
ALTER TABLE users ADD CONSTRAINT users_registration_source_check
  CHECK (registration_source IN ('zing_browser', 'zashboard', 'ogents_builder'));

-- Migrate existing data to new source values
UPDATE users SET registration_source = 'zashboard' WHERE registration_source = 'web';
UPDATE users SET registration_source = 'zing_browser' WHERE registration_source = 'zing';

-- Update column comment
COMMENT ON COLUMN users.registration_source IS 'Source of user registration: zing_browser (Zing Browser app), zashboard (direct signup on zashboard.ai), ogents_builder (Ogents Market agent employment)';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 002 completed: Registration sources updated to zing_browser, zashboard, ogents_builder';
END $$;
