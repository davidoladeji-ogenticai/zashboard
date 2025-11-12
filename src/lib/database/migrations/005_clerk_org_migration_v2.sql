-- Migration 005: Ensure Organization Tables use TEXT IDs for Clerk
-- This is an idempotent migration that converts any remaining UUID columns to TEXT

-- ============================================
-- Helper function to check and convert column types
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Convert all ID columns to TEXT if they aren't already
  FOR r IN
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'organizations',
        'organization_memberships',
        'teams',
        'team_members',
        'organization_spaces',
        'organization_ai_configs',
        'user_preferences',
        'organization_roles',
        'organization_permissions',
        'organization_role_permissions',
        'organization_user_roles'
      )
      AND column_name IN ('id', 'user_id', 'organization_id', 'team_id', 'role_id', 'permission_id', 'active_organization_id', 'created_by')
      AND data_type != 'text'
  LOOP
    RAISE NOTICE 'Converting %.% from % to TEXT', r.table_name, r.column_name, r.data_type;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TEXT', r.table_name, r.column_name);
  END LOOP;

  RAISE NOTICE 'All organization ID columns are now TEXT type';
END $$;

-- Log migration completion
INSERT INTO system_metrics (metric_name, metric_value, metric_text) VALUES
('migration_005_completed', 1, 'Ensured all organization tables use TEXT IDs for Clerk compatibility')
ON CONFLICT DO NOTHING;
