/**
 * Database Schema Migration for Clerk Integration
 *
 * This script converts user_id columns from UUID to TEXT to accommodate
 * Clerk's user ID format (user_xxxxxxxxxxxxx).
 *
 * IMPORTANT: Run this BEFORE running the user migration script.
 *
 * Usage:
 *   psql -U postgres -d zashboard -f scripts/prepare-database-for-clerk.sql
 */

-- Start transaction
BEGIN;

-- Backup note: Create backup before running this migration!
-- pg_dump -U postgres zashboard > backup_before_clerk_migration.sql

-- 1. Alter users table primary key
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE users ADD PRIMARY KEY (id);

-- 2. Alter organization_memberships
ALTER TABLE organization_memberships ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 3. Alter user_roles
ALTER TABLE user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 4. Alter organization_user_roles
ALTER TABLE organization_user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 5. Alter team_members (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    ALTER TABLE team_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

-- 6. Alter audit_logs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

-- 7. Alter api_keys (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    ALTER TABLE api_keys ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

-- 8. Recreate foreign key constraints
ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE organization_user_roles
  ADD CONSTRAINT organization_user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Team members FK (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Audit logs FK (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- API keys FK (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    ALTER TABLE api_keys
      ADD CONSTRAINT api_keys_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Commit transaction
COMMIT;

-- Verify changes
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Show users table
SELECT id, email, name FROM users;
