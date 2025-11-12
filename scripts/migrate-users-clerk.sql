/**
 * Simple SQL Migration for Clerk User IDs
 *
 * This script updates existing UUID user IDs to Clerk IDs
 * by temporarily dropping and recreating foreign key constraints.
 *
 * Usage:
 *   psql -U macbook -d zashboard -f scripts/migrate-users-clerk.sql
 *
 * IMPORTANT: Update the Clerk IDs below before running!
 */

BEGIN;

-- ================================================================
-- STEP 1: Drop all foreign key constraints
-- ================================================================

-- user_sessions
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- roles
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_created_by_fkey;

-- role_permissions
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_granted_by_fkey;

-- user_roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;

-- audit_log
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_target_user_id_fkey;

-- organization_memberships
ALTER TABLE organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_user_id_fkey;

-- team_members
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- organization_ai_configs
ALTER TABLE organization_ai_configs DROP CONSTRAINT IF EXISTS organization_ai_configs_created_by_fkey;

-- user_preferences
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- organization_roles
ALTER TABLE organization_roles DROP CONSTRAINT IF EXISTS organization_roles_created_by_fkey;

-- organization_permissions
ALTER TABLE organization_permissions DROP CONSTRAINT IF EXISTS organization_permissions_created_by_fkey;

-- organization_role_permissions
ALTER TABLE organization_role_permissions DROP CONSTRAINT IF EXISTS organization_role_permissions_granted_by_fkey;

-- organization_user_roles
ALTER TABLE organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_user_id_fkey;
ALTER TABLE organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_assigned_by_fkey;

-- system_ai_config
ALTER TABLE system_ai_config DROP CONSTRAINT IF EXISTS system_ai_config_created_by_fkey;

SELECT '✅ Foreign key constraints dropped' AS status;

-- ================================================================
-- STEP 2: Update user IDs
-- ================================================================

-- david@zashboard.ai: ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8 → user_35LhrTOIU7dvGD4k7p9oGzynQd8
UPDATE users SET id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_memberships SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE user_roles SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE user_roles SET assigned_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE assigned_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_user_roles SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_user_roles SET assigned_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE assigned_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE team_members SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE audit_log SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE audit_log SET target_user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE target_user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE user_sessions SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE user_preferences SET user_id = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE roles SET created_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE created_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE role_permissions SET granted_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE granted_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_ai_configs SET created_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE created_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_roles SET created_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE created_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_permissions SET created_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE created_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE organization_role_permissions SET granted_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE granted_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';
UPDATE system_ai_config SET created_by = 'user_35LhrTOIU7dvGD4k7p9oGzynQd8' WHERE created_by = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';

SELECT '✅ Updated david@zashboard.ai to user_35LhrTOIU7dvGD4k7p9oGzynQd8' AS status;

-- david@ogenticai.com: 69ed1e9f-4c36-4e81-8299-72ee0ca2ff46 → user_35LRNK8bPg7vbaiEOWzY6qulevz
UPDATE users SET id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_memberships SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE user_roles SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE user_roles SET assigned_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE assigned_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_user_roles SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_user_roles SET assigned_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE assigned_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE team_members SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE audit_log SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE audit_log SET target_user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE target_user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE user_sessions SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE user_preferences SET user_id = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE roles SET created_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE created_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE role_permissions SET granted_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE granted_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_ai_configs SET created_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE created_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_roles SET created_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE created_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_permissions SET created_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE created_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE organization_role_permissions SET granted_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE granted_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
UPDATE system_ai_config SET created_by = 'user_35LRNK8bPg7vbaiEOWzY6qulevz' WHERE created_by = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';

SELECT '✅ Updated david@ogenticai.com to user_35LRNK8bPg7vbaiEOWzY6qulevz' AS status;

-- ================================================================
-- STEP 3: Recreate foreign key constraints
-- ================================================================

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE roles
  ADD CONSTRAINT roles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE organization_ai_configs
  ADD CONSTRAINT organization_ai_configs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE organization_roles
  ADD CONSTRAINT organization_roles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_permissions
  ADD CONSTRAINT organization_permissions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_role_permissions
  ADD CONSTRAINT organization_role_permissions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_user_roles
  ADD CONSTRAINT organization_user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE organization_user_roles
  ADD CONSTRAINT organization_user_roles_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE system_ai_config
  ADD CONSTRAINT system_ai_config_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

SELECT '✅ Foreign key constraints recreated' AS status;

COMMIT;

-- ================================================================
-- Verification
-- ================================================================

SELECT '📊 MIGRATION RESULTS' AS status;
SELECT id, email, name FROM users;
SELECT COUNT(*) AS org_memberships FROM organization_memberships WHERE user_id LIKE 'user_%';
SELECT COUNT(*) AS user_roles FROM user_roles WHERE user_id LIKE 'user_%';
SELECT COUNT(*) AS org_user_roles FROM organization_user_roles WHERE user_id LIKE 'user_%';

SELECT '✅ Migration completed successfully!' AS status;
