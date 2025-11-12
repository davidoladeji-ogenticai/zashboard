-- Migration 005: Convert Organization Tables to Clerk TEXT IDs
-- This migration converts organization system tables from UUID to TEXT
-- to support Clerk authentication IDs

-- ============================================
-- STEP 1: Alter organizations table
-- ============================================

-- Drop existing foreign key constraints that reference organizations.id
ALTER TABLE IF EXISTS organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_organization_id_fkey;
ALTER TABLE IF EXISTS teams DROP CONSTRAINT IF EXISTS teams_organization_id_fkey;
ALTER TABLE IF EXISTS organization_spaces DROP CONSTRAINT IF EXISTS organization_spaces_organization_id_fkey;
ALTER TABLE IF EXISTS organization_ai_configs DROP CONSTRAINT IF EXISTS organization_ai_configs_organization_id_fkey;
ALTER TABLE IF EXISTS user_preferences DROP CONSTRAINT IF EXISTS user_preferences_active_organization_id_fkey;

-- Convert organizations.id from UUID to TEXT
ALTER TABLE organizations ALTER COLUMN id TYPE TEXT;

-- ============================================
-- STEP 2: Alter organization_memberships table
-- ============================================

-- Convert user_id and organization_id to TEXT
ALTER TABLE organization_memberships ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE organization_memberships ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE organization_memberships ALTER COLUMN id TYPE TEXT;

-- Re-add foreign keys (with IF NOT EXISTS check via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_memberships_user_id_fkey'
  ) THEN
    ALTER TABLE organization_memberships
      ADD CONSTRAINT organization_memberships_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_memberships_organization_id_fkey'
  ) THEN
    ALTER TABLE organization_memberships
      ADD CONSTRAINT organization_memberships_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- STEP 3: Alter teams table
-- ============================================

ALTER TABLE teams ALTER COLUMN id TYPE TEXT;
ALTER TABLE teams ALTER COLUMN organization_id TYPE TEXT;

-- Re-add foreign key
ALTER TABLE teams
  ADD CONSTRAINT teams_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================
-- STEP 4: Alter team_members table
-- ============================================

ALTER TABLE team_members ALTER COLUMN id TYPE TEXT;
ALTER TABLE team_members ALTER COLUMN team_id TYPE TEXT;
ALTER TABLE team_members ALTER COLUMN user_id TYPE TEXT;

-- Re-add foreign keys
ALTER TABLE team_members
  ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 5: Alter organization_spaces table
-- ============================================

ALTER TABLE organization_spaces ALTER COLUMN id TYPE TEXT;
ALTER TABLE organization_spaces ALTER COLUMN organization_id TYPE TEXT;

-- Re-add foreign key
ALTER TABLE organization_spaces
  ADD CONSTRAINT organization_spaces_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================
-- STEP 6: Alter organization_ai_configs table
-- ============================================

ALTER TABLE organization_ai_configs ALTER COLUMN id TYPE TEXT;
ALTER TABLE organization_ai_configs ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE organization_ai_configs ALTER COLUMN created_by TYPE TEXT;

-- Re-add foreign keys
ALTER TABLE organization_ai_configs
  ADD CONSTRAINT organization_ai_configs_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_ai_configs
  ADD CONSTRAINT organization_ai_configs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- STEP 7: Alter user_preferences table
-- ============================================

ALTER TABLE user_preferences ALTER COLUMN id TYPE TEXT;
ALTER TABLE user_preferences ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_preferences ALTER COLUMN active_organization_id TYPE TEXT;

-- Re-add foreign keys
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_active_organization_id_fkey
  FOREIGN KEY (active_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ============================================
-- STEP 8: Update organization RBAC tables (from migration 003)
-- ============================================

-- These tables may have been created with UUID, convert them to TEXT
ALTER TABLE IF EXISTS organization_roles ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS organization_roles ALTER COLUMN organization_id TYPE TEXT;

ALTER TABLE IF EXISTS organization_permissions ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS organization_permissions ALTER COLUMN organization_id TYPE TEXT;

ALTER TABLE IF EXISTS organization_role_permissions ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS organization_role_permissions ALTER COLUMN role_id TYPE TEXT;
ALTER TABLE IF EXISTS organization_role_permissions ALTER COLUMN permission_id TYPE TEXT;

ALTER TABLE IF EXISTS organization_user_roles ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS organization_user_roles ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS organization_user_roles ALTER COLUMN organization_id TYPE TEXT;
ALTER TABLE IF EXISTS organization_user_roles ALTER COLUMN role_id TYPE TEXT;

-- Re-add foreign keys for organization RBAC
ALTER TABLE IF EXISTS organization_roles DROP CONSTRAINT IF EXISTS organization_roles_organization_id_fkey;
ALTER TABLE IF EXISTS organization_roles
  ADD CONSTRAINT organization_roles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS organization_permissions DROP CONSTRAINT IF EXISTS organization_permissions_organization_id_fkey;
ALTER TABLE IF EXISTS organization_permissions
  ADD CONSTRAINT organization_permissions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS organization_role_permissions DROP CONSTRAINT IF EXISTS organization_role_permissions_role_id_fkey;
ALTER TABLE IF EXISTS organization_role_permissions DROP CONSTRAINT IF EXISTS organization_role_permissions_permission_id_fkey;
ALTER TABLE IF EXISTS organization_role_permissions
  ADD CONSTRAINT organization_role_permissions_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES organization_roles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS organization_role_permissions
  ADD CONSTRAINT organization_role_permissions_permission_id_fkey
  FOREIGN KEY (permission_id) REFERENCES organization_permissions(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_user_id_fkey;
ALTER TABLE IF EXISTS organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_organization_id_fkey;
ALTER TABLE IF EXISTS organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_role_id_fkey;
ALTER TABLE IF EXISTS organization_user_roles
  ADD CONSTRAINT organization_user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS organization_user_roles
  ADD CONSTRAINT organization_user_roles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS organization_user_roles
  ADD CONSTRAINT organization_user_roles_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES organization_roles(id) ON DELETE CASCADE;

-- Log migration completion
INSERT INTO system_metrics (metric_name, metric_value, metric_text) VALUES
('migration_005_completed', 1, 'Converted organization tables from UUID to TEXT for Clerk compatibility');
