-- Organization RBAC Migration
-- Adds organization-scoped roles and permissions system
-- Migration Version: 003

-- ============================================
-- PART 1: Create Organization Roles Table
-- ============================================

CREATE TABLE IF NOT EXISTS organization_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(organization_id, name),
  UNIQUE(organization_id, level)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_roles_org ON organization_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_roles_level ON organization_roles(level DESC);
CREATE INDEX IF NOT EXISTS idx_org_roles_active ON organization_roles(is_active);

-- Add comment
COMMENT ON TABLE organization_roles IS 'Organization-scoped roles for fine-grained access control';
COMMENT ON COLUMN organization_roles.level IS 'Higher number = more permissions. 100=super_admin, 50=admin, 10=member';
COMMENT ON COLUMN organization_roles.is_system IS 'System roles cannot be deleted, only permissions can be modified';

-- ============================================
-- PART 2: Create Organization Permissions Table
-- ============================================

CREATE TABLE IF NOT EXISTS organization_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(organization_id, name),
  UNIQUE(organization_id, resource, action)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_perms_org ON organization_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_perms_category ON organization_permissions(category);
CREATE INDEX IF NOT EXISTS idx_org_perms_resource ON organization_permissions(resource);

-- Add comment
COMMENT ON TABLE organization_permissions IS 'Organization-scoped permissions for fine-grained access control';
COMMENT ON COLUMN organization_permissions.category IS 'Groups permissions for UI display: members, settings, analytics, etc.';

-- ============================================
-- PART 3: Create Organization Role-Permission Mapping
-- ============================================

CREATE TABLE IF NOT EXISTS organization_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES organization_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES organization_permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_role_perms_role ON organization_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_org_role_perms_perm ON organization_role_permissions(permission_id);

-- Add comment
COMMENT ON TABLE organization_role_permissions IS 'Maps organization roles to their permissions';

-- ============================================
-- PART 4: Create Organization User Roles Table
-- ============================================

CREATE TABLE IF NOT EXISTS organization_user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES organization_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, organization_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_user_roles_user ON organization_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_org_user_roles_org ON organization_user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_user_roles_role ON organization_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_org_user_roles_active ON organization_user_roles(is_active);

-- Add comment
COMMENT ON TABLE organization_user_roles IS 'Assigns organization-scoped roles to users. Users can have multiple roles per organization.';

-- ============================================
-- PART 5: Create Helper Functions
-- ============================================

-- Function to check if a user has a specific organization permission
CREATE OR REPLACE FUNCTION user_has_org_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_user_roles our
    JOIN organization_role_permissions orp ON our.role_id = orp.role_id
    JOIN organization_permissions op ON orp.permission_id = op.id
    WHERE our.user_id = p_user_id
      AND our.organization_id = p_organization_id
      AND op.name = p_permission_name
      AND our.is_active = TRUE
      AND (our.expires_at IS NULL OR our.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION user_has_org_permission IS 'Check if a user has a specific permission in an organization';

-- Function to get all permissions for a user in an organization
CREATE OR REPLACE FUNCTION get_user_org_permissions(p_user_id UUID, p_organization_id UUID)
RETURNS TABLE(
  permission_id UUID,
  name VARCHAR,
  display_name VARCHAR,
  category VARCHAR,
  resource VARCHAR,
  action VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    op.id,
    op.name,
    op.display_name,
    op.category,
    op.resource,
    op.action
  FROM organization_user_roles our
  JOIN organization_role_permissions orp ON our.role_id = orp.role_id
  JOIN organization_permissions op ON orp.permission_id = op.id
  WHERE our.user_id = p_user_id
    AND our.organization_id = p_organization_id
    AND our.is_active = TRUE
    AND (our.expires_at IS NULL OR our.expires_at > NOW())
  ORDER BY op.category, op.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_org_permissions IS 'Get all permissions a user has in an organization';

-- ============================================
-- PART 6: Seed Default Roles and Permissions
-- ============================================

-- Create default permissions for all existing organizations
DO $$
DECLARE
  org RECORD;
  perm_members_read UUID;
  perm_members_write UUID;
  perm_members_delete UUID;
  perm_teams_read UUID;
  perm_teams_write UUID;
  perm_teams_delete UUID;
  perm_settings_read UUID;
  perm_settings_write UUID;
  perm_analytics_read UUID;
  perm_ai_config_read UUID;
  perm_ai_config_write UUID;
  perm_roles_read UUID;
  perm_roles_write UUID;
  perm_roles_delete UUID;
  role_super_admin UUID;
  role_admin UUID;
  role_member UUID;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    -- Create default permissions for this organization
    INSERT INTO organization_permissions (organization_id, name, display_name, description, category, resource, action, is_system)
    VALUES
      (org.id, 'org:members:read', 'View Members', 'View organization members', 'members', 'members', 'read', TRUE),
      (org.id, 'org:members:write', 'Manage Members', 'Add and edit organization members', 'members', 'members', 'write', TRUE),
      (org.id, 'org:members:delete', 'Remove Members', 'Remove members from organization', 'members', 'members', 'delete', TRUE),
      (org.id, 'org:teams:read', 'View Teams', 'View organization teams', 'teams', 'teams', 'read', TRUE),
      (org.id, 'org:teams:write', 'Manage Teams', 'Create and edit teams', 'teams', 'teams', 'write', TRUE),
      (org.id, 'org:teams:delete', 'Delete Teams', 'Delete teams from organization', 'teams', 'teams', 'delete', TRUE),
      (org.id, 'org:settings:read', 'View Settings', 'View organization settings', 'settings', 'settings', 'read', TRUE),
      (org.id, 'org:settings:write', 'Manage Settings', 'Modify organization settings', 'settings', 'settings', 'write', TRUE),
      (org.id, 'org:analytics:read', 'View Analytics', 'View organization analytics', 'analytics', 'analytics', 'read', TRUE),
      (org.id, 'org:ai_config:read', 'View AI Config', 'View AI configuration', 'ai', 'ai_config', 'read', TRUE),
      (org.id, 'org:ai_config:write', 'Manage AI Config', 'Modify AI configuration', 'ai', 'ai_config', 'write', TRUE),
      (org.id, 'org:roles:read', 'View Roles', 'View organization roles and permissions', 'roles', 'roles', 'read', TRUE),
      (org.id, 'org:roles:write', 'Manage Roles', 'Create and edit organization roles', 'roles', 'roles', 'write', TRUE),
      (org.id, 'org:roles:delete', 'Delete Roles', 'Delete organization roles', 'roles', 'roles', 'delete', TRUE);

    -- Get the permission IDs (we need to query them since RETURNING only gets the last one)
    SELECT id INTO perm_members_read FROM organization_permissions WHERE organization_id = org.id AND name = 'org:members:read';
    SELECT id INTO perm_members_write FROM organization_permissions WHERE organization_id = org.id AND name = 'org:members:write';
    SELECT id INTO perm_members_delete FROM organization_permissions WHERE organization_id = org.id AND name = 'org:members:delete';
    SELECT id INTO perm_teams_read FROM organization_permissions WHERE organization_id = org.id AND name = 'org:teams:read';
    SELECT id INTO perm_teams_write FROM organization_permissions WHERE organization_id = org.id AND name = 'org:teams:write';
    SELECT id INTO perm_teams_delete FROM organization_permissions WHERE organization_id = org.id AND name = 'org:teams:delete';
    SELECT id INTO perm_settings_read FROM organization_permissions WHERE organization_id = org.id AND name = 'org:settings:read';
    SELECT id INTO perm_settings_write FROM organization_permissions WHERE organization_id = org.id AND name = 'org:settings:write';
    SELECT id INTO perm_analytics_read FROM organization_permissions WHERE organization_id = org.id AND name = 'org:analytics:read';
    SELECT id INTO perm_ai_config_read FROM organization_permissions WHERE organization_id = org.id AND name = 'org:ai_config:read';
    SELECT id INTO perm_ai_config_write FROM organization_permissions WHERE organization_id = org.id AND name = 'org:ai_config:write';
    SELECT id INTO perm_roles_read FROM organization_permissions WHERE organization_id = org.id AND name = 'org:roles:read';
    SELECT id INTO perm_roles_write FROM organization_permissions WHERE organization_id = org.id AND name = 'org:roles:write';
    SELECT id INTO perm_roles_delete FROM organization_permissions WHERE organization_id = org.id AND name = 'org:roles:delete';

    -- Create default roles for this organization
    INSERT INTO organization_roles (organization_id, name, display_name, description, level, is_system)
    VALUES
      (org.id, 'super_admin', 'Super Admin', 'Full control over organization settings, members, and permissions', 100, TRUE),
      (org.id, 'admin', 'Admin', 'Can manage members and teams, view analytics', 50, TRUE),
      (org.id, 'member', 'Member', 'Basic organization member', 10, TRUE);

    -- Get the role IDs
    SELECT id INTO role_super_admin FROM organization_roles WHERE organization_id = org.id AND name = 'super_admin';
    SELECT id INTO role_admin FROM organization_roles WHERE organization_id = org.id AND name = 'admin';
    SELECT id INTO role_member FROM organization_roles WHERE organization_id = org.id AND name = 'member';

    -- Assign permissions to Super Admin role (all permissions)
    INSERT INTO organization_role_permissions (role_id, permission_id)
    VALUES
      (role_super_admin, perm_members_read),
      (role_super_admin, perm_members_write),
      (role_super_admin, perm_members_delete),
      (role_super_admin, perm_teams_read),
      (role_super_admin, perm_teams_write),
      (role_super_admin, perm_teams_delete),
      (role_super_admin, perm_settings_read),
      (role_super_admin, perm_settings_write),
      (role_super_admin, perm_analytics_read),
      (role_super_admin, perm_ai_config_read),
      (role_super_admin, perm_ai_config_write),
      (role_super_admin, perm_roles_read),
      (role_super_admin, perm_roles_write),
      (role_super_admin, perm_roles_delete);

    -- Assign permissions to Admin role (most permissions except role management)
    INSERT INTO organization_role_permissions (role_id, permission_id)
    VALUES
      (role_admin, perm_members_read),
      (role_admin, perm_members_write),
      (role_admin, perm_teams_read),
      (role_admin, perm_teams_write),
      (role_admin, perm_teams_delete),
      (role_admin, perm_settings_read),
      (role_admin, perm_analytics_read),
      (role_admin, perm_ai_config_read);

    -- Assign permissions to Member role (read-only)
    INSERT INTO organization_role_permissions (role_id, permission_id)
    VALUES
      (role_member, perm_members_read),
      (role_member, perm_teams_read),
      (role_member, perm_analytics_read);

    -- Migrate existing organization_memberships to organization_user_roles
    -- Map old roles to new roles
    INSERT INTO organization_user_roles (user_id, organization_id, role_id, assigned_at)
    SELECT
      om.user_id,
      om.organization_id,
      CASE
        WHEN om.role = 'super_admin' THEN role_super_admin
        WHEN om.role = 'admin' THEN role_admin
        ELSE role_member
      END,
      om.joined_at
    FROM organization_memberships om
    WHERE om.organization_id = org.id
    ON CONFLICT (user_id, organization_id, role_id) DO NOTHING;

  END LOOP;
END $$;

-- ============================================
-- PART 7: Add Update Triggers
-- ============================================

-- Trigger to update updated_at on organization_roles
CREATE OR REPLACE FUNCTION update_org_role_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_roles_updated_at
  BEFORE UPDATE ON organization_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_org_role_updated_at();

-- ============================================
-- PART 8: Add Audit Logging
-- ============================================

COMMENT ON TABLE organization_user_roles IS 'Audit trail: All role assignments are tracked with assigned_by and assigned_at';
COMMENT ON TABLE organization_role_permissions IS 'Audit trail: All permission grants are tracked with granted_by and granted_at';

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed successfully';
  RAISE NOTICE 'Organization RBAC system has been created';
  RAISE NOTICE 'Existing organization memberships have been migrated to the new system';
END $$;
