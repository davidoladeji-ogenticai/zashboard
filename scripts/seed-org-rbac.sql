-- Seed Organization RBAC system with default roles and permissions
-- Run this after migration 003

DO $$
DECLARE
  org_record RECORD;
  perm_id UUID;
  role_id UUID;
BEGIN
  FOR org_record IN SELECT id, name FROM organizations LOOP
    RAISE NOTICE 'Seeding RBAC for organization: %', org_record.name;

    -- Create default permissions for this organization
    INSERT INTO organization_permissions (organization_id, name, display_name, description, category, resource, action, is_system)
    VALUES
      (org_record.id, 'org:members:read', 'View Members', 'View organization members', 'members', 'members', 'read', TRUE),
      (org_record.id, 'org:members:write', 'Manage Members', 'Add and edit organization members', 'members', 'members', 'write', TRUE),
      (org_record.id, 'org:members:delete', 'Remove Members', 'Remove members from organization', 'members', 'members', 'delete', TRUE),
      (org_record.id, 'org:teams:read', 'View Teams', 'View organization teams', 'teams', 'teams', 'read', TRUE),
      (org_record.id, 'org:teams:write', 'Manage Teams', 'Create and edit teams', 'teams', 'teams', 'write', TRUE),
      (org_record.id, 'org:teams:delete', 'Delete Teams', 'Delete teams from organization', 'teams', 'teams', 'delete', TRUE),
      (org_record.id, 'org:settings:read', 'View Settings', 'View organization settings', 'settings', 'settings', 'read', TRUE),
      (org_record.id, 'org:settings:write', 'Manage Settings', 'Modify organization settings', 'settings', 'settings', 'write', TRUE),
      (org_record.id, 'org:analytics:read', 'View Analytics', 'View organization analytics', 'analytics', 'analytics', 'read', TRUE),
      (org_record.id, 'org:ai_config:read', 'View AI Config', 'View AI configuration', 'ai', 'ai_config', 'read', TRUE),
      (org_record.id, 'org:ai_config:write', 'Manage AI Config', 'Modify AI configuration', 'ai', 'ai_config', 'write', TRUE),
      (org_record.id, 'org:roles:read', 'View Roles', 'View organization roles and permissions', 'roles', 'roles', 'read', TRUE),
      (org_record.id, 'org:roles:write', 'Manage Roles', 'Create and edit organization roles', 'roles', 'roles', 'write', TRUE),
      (org_record.id, 'org:roles:delete', 'Delete Roles', 'Delete organization roles', 'roles', 'roles', 'delete', TRUE);

    -- Create default roles for this organization
    INSERT INTO organization_roles (organization_id, name, display_name, description, level, is_system)
    VALUES
      (org_record.id, 'super_admin', 'Super Admin', 'Full control over organization settings, members, and permissions', 100, TRUE),
      (org_record.id, 'admin', 'Admin', 'Can manage members and teams, view analytics', 50, TRUE),
      (org_record.id, 'member', 'Member', 'Basic organization member', 10, TRUE);

    -- Assign ALL permissions to Super Admin role
    INSERT INTO organization_role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM organization_roles r
    CROSS JOIN organization_permissions p
    WHERE r.organization_id = org_record.id
      AND r.name = 'super_admin'
      AND p.organization_id = org_record.id;

    -- Assign selected permissions to Admin role (no role management)
    INSERT INTO organization_role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM organization_roles r
    CROSS JOIN organization_permissions p
    WHERE r.organization_id = org_record.id
      AND r.name = 'admin'
      AND p.organization_id = org_record.id
      AND p.name IN (
        'org:members:read',
        'org:members:write',
        'org:teams:read',
        'org:teams:write',
        'org:teams:delete',
        'org:settings:read',
        'org:analytics:read',
        'org:ai_config:read'
      );

    -- Assign read-only permissions to Member role
    INSERT INTO organization_role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM organization_roles r
    CROSS JOIN organization_permissions p
    WHERE r.organization_id = org_record.id
      AND r.name = 'member'
      AND p.organization_id = org_record.id
      AND p.name IN (
        'org:members:read',
        'org:teams:read',
        'org:analytics:read'
      );

    -- Migrate existing organization_memberships to organization_user_roles
    -- Map old simple roles to new RBAC roles
    INSERT INTO organization_user_roles (user_id, organization_id, role_id, assigned_at)
    SELECT DISTINCT
      om.user_id,
      om.organization_id,
      r.id,
      om.joined_at
    FROM organization_memberships om
    JOIN organization_roles r ON r.organization_id = om.organization_id
    WHERE om.organization_id = org_record.id
      AND r.name = CASE
        WHEN om.role = 'super_admin' THEN 'super_admin'
        WHEN om.role = 'admin' THEN 'admin'
        ELSE 'member'
      END;

    RAISE NOTICE 'Completed RBAC seeding for organization: %', org_record.name;
  END LOOP;

  RAISE NOTICE 'Organization RBAC seeding completed successfully!';
END $$;
