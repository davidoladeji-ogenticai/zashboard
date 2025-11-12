-- Update Organization ID Type from UUID to VARCHAR
-- This allows compatibility with Clerk organization IDs

BEGIN;

-- Step 1: Drop dependent constraints and indexes
ALTER TABLE organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_organization_id_fkey;
ALTER TABLE organization_ai_configs DROP CONSTRAINT IF EXISTS organization_ai_configs_organization_id_fkey;
ALTER TABLE organization_spaces DROP CONSTRAINT IF EXISTS organization_spaces_organization_id_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_organization_id_fkey;
ALTER TABLE organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_organization_id_fkey;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_active_organization_id_fkey;
ALTER TABLE organization_permissions DROP CONSTRAINT IF EXISTS organization_permissions_organization_id_fkey;
ALTER TABLE organization_roles DROP CONSTRAINT IF EXISTS organization_roles_organization_id_fkey;

-- Step 2: Alter column types
ALTER TABLE organizations ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE organizations ALTER COLUMN id SET DEFAULT NULL;
ALTER TABLE organization_memberships ALTER COLUMN organization_id TYPE VARCHAR(255);
ALTER TABLE organization_ai_configs ALTER COLUMN organization_id TYPE VARCHAR(255);
ALTER TABLE organization_spaces ALTER COLUMN organization_id TYPE VARCHAR(255);
ALTER TABLE teams ALTER COLUMN organization_id TYPE VARCHAR(255);
ALTER TABLE organization_user_roles ALTER COLUMN organization_id TYPE VARCHAR(255);
ALTER TABLE user_preferences ALTER COLUMN active_organization_id TYPE VARCHAR(255);
ALTER TABLE organization_permissions ALTER COLUMN organization_id TYPE VARCHAR(255);
ALTER TABLE organization_roles ALTER COLUMN organization_id TYPE VARCHAR(255);

-- Step 3: Re-add foreign key constraints
ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_ai_configs
  ADD CONSTRAINT organization_ai_configs_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_spaces
  ADD CONSTRAINT organization_spaces_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE teams
  ADD CONSTRAINT teams_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_user_roles
  ADD CONSTRAINT organization_user_roles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_active_organization_id_fkey
  FOREIGN KEY (active_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE organization_permissions
  ADD CONSTRAINT organization_permissions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_roles
  ADD CONSTRAINT organization_roles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

COMMIT;

-- Verify changes
\d organizations
