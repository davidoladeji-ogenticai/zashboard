/**
 * Fix RBAC Functions for Clerk ID Migration
 *
 * After migrating user IDs from UUID to TEXT (Clerk IDs), the PostgreSQL RBAC
 * functions need to be updated to accept TEXT parameters instead of UUID.
 *
 * This script updates 4 functions:
 * 1. user_has_org_permission - Check org-level permissions
 * 2. get_user_org_permissions - Get all org permissions for user
 * 3. user_has_permission - Check platform-level permissions
 * 4. get_user_permissions - Get all platform permissions for user
 *
 * Usage:
 *   psql -U macbook -d zashboard -f scripts/fix-rbac-functions-for-clerk.sql
 */

BEGIN;

-- ================================================================
-- 1. user_has_org_permission
--    Check if a user has a specific permission in an organization
-- ================================================================

DROP FUNCTION IF EXISTS user_has_org_permission(uuid, uuid, varchar);

CREATE OR REPLACE FUNCTION user_has_org_permission(
  p_user_id TEXT,
  p_organization_id TEXT,  -- Accept TEXT but cast to UUID internally
  p_permission_name VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_user_roles our
    JOIN organization_role_permissions orp ON our.role_id = orp.role_id
    JOIN organization_permissions op ON orp.permission_id = op.id
    WHERE our.user_id = p_user_id
      AND our.organization_id = p_organization_id::UUID  -- Cast TEXT to UUID
      AND op.name = p_permission_name
      AND our.is_active = TRUE
      AND (our.expires_at IS NULL OR our.expires_at > NOW())
  );
END;
$$;

COMMENT ON FUNCTION user_has_org_permission IS
'Check if a user has a specific permission in an organization. Updated for Clerk TEXT user IDs.';

-- ================================================================
-- 2. get_user_org_permissions
--    Get all permissions for a user in an organization
-- ================================================================

DROP FUNCTION IF EXISTS get_user_org_permissions(uuid, uuid);

CREATE OR REPLACE FUNCTION get_user_org_permissions(
  p_user_id TEXT,
  p_organization_id TEXT  -- Accept TEXT but cast to UUID internally
)
RETURNS TABLE(
  permission_id TEXT,
  name VARCHAR,
  display_name VARCHAR,
  category VARCHAR,
  resource VARCHAR,
  action VARCHAR
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    op.id::TEXT,
    op.name,
    op.display_name,
    op.category,
    op.resource,
    op.action
  FROM organization_user_roles our
  JOIN organization_role_permissions orp ON our.role_id = orp.role_id
  JOIN organization_permissions op ON orp.permission_id = op.id
  WHERE our.user_id = p_user_id
    AND our.organization_id = p_organization_id::UUID  -- Cast TEXT to UUID
    AND our.is_active = TRUE
    AND (our.expires_at IS NULL OR our.expires_at > NOW())
  ORDER BY op.category, op.name;
END;
$$;

COMMENT ON FUNCTION get_user_org_permissions IS
'Get all permissions for a user in an organization. Updated for Clerk TEXT user IDs.';

-- ================================================================
-- 3. user_has_permission
--    Check if a user has a specific platform-level permission
-- ================================================================

DROP FUNCTION IF EXISTS user_has_permission(uuid, varchar);

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id TEXT,
  p_permission_name VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      AND p.name = p_permission_name
  ) INTO has_perm;

  RETURN has_perm;
END;
$$;

COMMENT ON FUNCTION user_has_permission IS
'Check if a user has a specific platform-level permission. Updated for Clerk TEXT user IDs.';

-- ================================================================
-- 4. get_user_permissions
--    Get all platform-level permissions for a user
-- ================================================================

DROP FUNCTION IF EXISTS get_user_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id TEXT
)
RETURNS TABLE(
  permission_name VARCHAR,
  permission_display_name VARCHAR,
  category VARCHAR,
  role_name VARCHAR
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.name,
    p.display_name,
    p.category,
    r.name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ORDER BY p.category, p.name;
END;
$$;

COMMENT ON FUNCTION get_user_permissions IS
'Get all platform-level permissions for a user. Updated for Clerk TEXT user IDs.';

COMMIT;

-- ================================================================
-- Verification Tests
-- ================================================================

-- Test user_has_org_permission with Clerk IDs
SELECT '=== Testing user_has_org_permission ===' AS test_section;

SELECT
  u.email,
  user_has_org_permission(
    u.id,
    'fe4e2553-1045-4439-a299-d458efaea296',
    'org:roles:read'
  ) as has_roles_read_permission
FROM users u
WHERE u.email IN ('david@zashboard.ai', 'david@ogenticai.com');

-- Test get_user_org_permissions
SELECT '=== Testing get_user_org_permissions ===' AS test_section;

SELECT
  u.email,
  COUNT(p.*) as permission_count
FROM users u
CROSS JOIN LATERAL get_user_org_permissions(
  u.id,
  'fe4e2553-1045-4439-a299-d458efaea296'
) p
WHERE u.email IN ('david@zashboard.ai', 'david@ogenticai.com')
GROUP BY u.email;

-- Test user_has_permission (platform-level)
SELECT '=== Testing user_has_permission ===' AS test_section;

SELECT
  u.email,
  u.role as platform_role
FROM users u
WHERE u.email IN ('david@zashboard.ai', 'david@ogenticai.com');

-- Success message
SELECT '✅ All RBAC functions successfully updated for Clerk TEXT user IDs!' AS status;
