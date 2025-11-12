/**
 * Database Schema Migration for Clerk Integration (v2)
 *
 * This script converts ALL user ID columns from UUID to TEXT to accommodate
 * Clerk's user ID format (user_xxxxxxxxxxxxx).
 *
 * Handles:
 * - users.id (primary key)
 * - user_id columns in 9 tables
 * - created_by, assigned_by, granted_by columns in 9 tables
 * - target_user_id in audit_log
 *
 * IMPORTANT: Run this BEFORE running the user migration script.
 *
 * Usage:
 *   psql -U macbook -d zashboard -f scripts/prepare-database-for-clerk-v2.sql
 */

-- Start transaction
BEGIN;

-- Backup note: Create backup before running this migration!
-- pg_dump -U macbook zashboard > backup_before_clerk_migration.sql

-- ================================================================
-- STEP 1: Drop all foreign key constraints referencing users.id
-- ================================================================

-- Drop constraints from user_sessions
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- Drop constraints from roles
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_created_by_fkey;

-- Drop constraints from role_permissions
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_granted_by_fkey;

-- Drop constraints from user_roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;

-- Drop constraints from audit_log
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_target_user_id_fkey;

-- Drop constraints from organization_memberships
ALTER TABLE organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_user_id_fkey;

-- Drop constraints from team_members
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- Drop constraints from organization_ai_configs
ALTER TABLE organization_ai_configs DROP CONSTRAINT IF EXISTS organization_ai_configs_created_by_fkey;

-- Drop constraints from user_preferences
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- Drop constraints from organization_roles
ALTER TABLE organization_roles DROP CONSTRAINT IF EXISTS organization_roles_created_by_fkey;

-- Drop constraints from organization_permissions
ALTER TABLE organization_permissions DROP CONSTRAINT IF EXISTS organization_permissions_created_by_fkey;

-- Drop constraints from organization_role_permissions
ALTER TABLE organization_role_permissions DROP CONSTRAINT IF EXISTS organization_role_permissions_granted_by_fkey;

-- Drop constraints from organization_user_roles
ALTER TABLE organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_user_id_fkey;
ALTER TABLE organization_user_roles DROP CONSTRAINT IF EXISTS organization_user_roles_assigned_by_fkey;

-- Drop constraints from system_ai_config
ALTER TABLE system_ai_config DROP CONSTRAINT IF EXISTS system_ai_config_created_by_fkey;

-- ================================================================
-- STEP 2: Convert users.id primary key from UUID to TEXT
-- ================================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE users ADD PRIMARY KEY (id);

-- ================================================================
-- STEP 3: Convert all user_id columns from UUID to TEXT
-- ================================================================

ALTER TABLE user_sessions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE audit_log ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE audit_log ALTER COLUMN target_user_id TYPE TEXT USING target_user_id::TEXT;
ALTER TABLE organization_memberships ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE organization_user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE team_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE user_preferences ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
-- analytics_events.user_id is already character varying, skip

-- ================================================================
-- STEP 4: Convert created_by, assigned_by, granted_by columns
-- ================================================================

ALTER TABLE roles ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE role_permissions ALTER COLUMN granted_by TYPE TEXT USING granted_by::TEXT;
ALTER TABLE user_roles ALTER COLUMN assigned_by TYPE TEXT USING assigned_by::TEXT;
ALTER TABLE organization_ai_configs ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE organization_roles ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE organization_permissions ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE organization_role_permissions ALTER COLUMN granted_by TYPE TEXT USING granted_by::TEXT;
ALTER TABLE organization_user_roles ALTER COLUMN assigned_by TYPE TEXT USING assigned_by::TEXT;
ALTER TABLE system_ai_config ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- ================================================================
-- STEP 5: Recreate foreign key constraints
-- ================================================================

-- user_sessions → users
ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- roles → users
ALTER TABLE roles
  ADD CONSTRAINT roles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- role_permissions → users
ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

-- user_roles → users
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- audit_log → users
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- organization_memberships → users
ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- team_members → users
ALTER TABLE team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- organization_ai_configs → users
ALTER TABLE organization_ai_configs
  ADD CONSTRAINT organization_ai_configs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- user_preferences → users
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- organization_roles → users
ALTER TABLE organization_roles
  ADD CONSTRAINT organization_roles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- organization_permissions → users
ALTER TABLE organization_permissions
  ADD CONSTRAINT organization_permissions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- organization_role_permissions → users
ALTER TABLE organization_role_permissions
  ADD CONSTRAINT organization_role_permissions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

-- organization_user_roles → users
ALTER TABLE organization_user_roles
  ADD CONSTRAINT organization_user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE organization_user_roles
  ADD CONSTRAINT organization_user_roles_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- system_ai_config → users
ALTER TABLE system_ai_config
  ADD CONSTRAINT system_ai_config_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Commit transaction
COMMIT;

-- ================================================================
-- Verification
-- ================================================================

-- Show updated column types
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE (column_name LIKE '%user_id%'
   OR column_name IN ('created_by', 'assigned_by', 'granted_by'))
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Show users table
SELECT id, email, name FROM users;

-- Success message
SELECT '✅ Database schema successfully migrated for Clerk integration!' AS status;
