-- Migration 005: Ensure Organization Tables use TEXT IDs for Clerk
-- This is an idempotent migration that handles foreign key constraints properly

DO $$
DECLARE
  r RECORD;
  fk_record RECORD;
BEGIN
  RAISE NOTICE 'Starting Clerk organization ID migration...';

  -- Step 1: Drop all foreign key constraints that involve ID columns
  FOR fk_record IN
    SELECT
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN (
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
  LOOP
    RAISE NOTICE 'Dropping constraint %.%', fk_record.table_name, fk_record.constraint_name;
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', fk_record.table_name, fk_record.constraint_name);
  END LOOP;

  -- Step 2: Convert all ID columns to TEXT
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
      AND data_type NOT IN ('text', 'character varying')
  LOOP
    RAISE NOTICE 'Converting %.% from % to TEXT', r.table_name, r.column_name, r.data_type;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TEXT', r.table_name, r.column_name);
  END LOOP;

  -- Step 3: Re-add foreign key constraints
  RAISE NOTICE 'Re-adding foreign key constraints...';

  -- organization_memberships
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_memberships_user_id_fkey') THEN
    ALTER TABLE organization_memberships
      ADD CONSTRAINT organization_memberships_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_memberships_organization_id_fkey') THEN
    ALTER TABLE organization_memberships
      ADD CONSTRAINT organization_memberships_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- teams
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_organization_id_fkey') THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- team_members
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_id_fkey') THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_user_id_fkey') THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- organization_spaces
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_spaces_organization_id_fkey') THEN
    ALTER TABLE organization_spaces
      ADD CONSTRAINT organization_spaces_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- organization_ai_configs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_ai_configs_organization_id_fkey') THEN
    ALTER TABLE organization_ai_configs
      ADD CONSTRAINT organization_ai_configs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_ai_configs_created_by_fkey') THEN
    ALTER TABLE organization_ai_configs
      ADD CONSTRAINT organization_ai_configs_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- user_preferences
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_user_id_fkey') THEN
    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_active_organization_id_fkey') THEN
    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_active_organization_id_fkey
      FOREIGN KEY (active_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- organization_roles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_roles_organization_id_fkey') THEN
    ALTER TABLE organization_roles
      ADD CONSTRAINT organization_roles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- organization_permissions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_permissions_organization_id_fkey') THEN
    ALTER TABLE organization_permissions
      ADD CONSTRAINT organization_permissions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- organization_role_permissions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_role_permissions_role_id_fkey') THEN
    ALTER TABLE organization_role_permissions
      ADD CONSTRAINT organization_role_permissions_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES organization_roles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_role_permissions_permission_id_fkey') THEN
    ALTER TABLE organization_role_permissions
      ADD CONSTRAINT organization_role_permissions_permission_id_fkey
      FOREIGN KEY (permission_id) REFERENCES organization_permissions(id) ON DELETE CASCADE;
  END IF;

  -- organization_user_roles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_user_roles_user_id_fkey') THEN
    ALTER TABLE organization_user_roles
      ADD CONSTRAINT organization_user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_user_roles_organization_id_fkey') THEN
    ALTER TABLE organization_user_roles
      ADD CONSTRAINT organization_user_roles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_user_roles_role_id_fkey') THEN
    ALTER TABLE organization_user_roles
      ADD CONSTRAINT organization_user_roles_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES organization_roles(id) ON DELETE CASCADE;
  END IF;

  RAISE NOTICE 'All organization ID columns are now TEXT type with foreign keys restored';
END $$;

-- Log migration completion
INSERT INTO system_metrics (metric_name, metric_value, metric_text) VALUES
('migration_005_completed', 1, 'Ensured all organization tables use TEXT IDs for Clerk compatibility')
ON CONFLICT (id) DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  metric_text = EXCLUDED.metric_text,
  timestamp = NOW();
