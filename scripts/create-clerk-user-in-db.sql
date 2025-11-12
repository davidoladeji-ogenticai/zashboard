-- Manual Clerk User Creation Script
--
-- Use this script when webhook is not working or for quick manual user creation
--
-- INSTRUCTIONS:
-- 1. User signs up via Clerk at /sign-up
-- 2. Get Clerk user ID from Clerk Dashboard (looks like: user_xxxxxxxxxxxxx)
-- 3. Replace placeholders below with actual values
-- 4. Run this script: psql -U macbook -d zashboard -f scripts/create-clerk-user-in-db.sql

-- ============================================
-- STEP 1: Insert new Clerk user
-- ============================================

-- Replace these values:
-- 'user_CLERK_ID_HERE' -> Actual Clerk ID (e.g., user_2abc...xyz)
-- 'email@example.com' -> User's email
-- 'User Name' -> User's name

INSERT INTO users (id, email, name, registration_source, created_at, updated_at, is_active, role)
VALUES (
  'user_CLERK_ID_HERE',  -- Replace with actual Clerk user ID
  'email@example.com',    -- Replace with user's email
  'User Name',            -- Replace with user's name
  'web',
  NOW(),
  NOW(),
  true,
  'user'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- STEP 2: Verify user was created
-- ============================================

SELECT id, email, name, created_at
FROM users
WHERE email = 'email@example.com';  -- Replace with user's email

-- ============================================
-- STEP 3: (OPTIONAL) Update organization membership
-- ============================================

-- If migrating from old UUID user, update org memberships:
-- Replace 'user_NEW_CLERK_ID' with new Clerk ID
-- Replace 'old-uuid-here' with old UUID

-- UPDATE organization_memberships
-- SET user_id = 'user_NEW_CLERK_ID'
-- WHERE user_id = 'old-uuid-here';

-- ============================================
-- STEP 4: Verify organization memberships
-- ============================================

-- SELECT
--   u.email,
--   o.name as organization,
--   om.role,
--   om.joined_at
-- FROM organization_memberships om
-- JOIN users u ON om.user_id = u.id
-- JOIN organizations o ON om.organization_id = o.id
-- WHERE u.email = 'email@example.com';  -- Replace with user's email


-- ============================================
-- CLEANUP: Delete old UUID user (if migrating)
-- ============================================

-- WARNING: Only run after verifying new user works!
-- DELETE FROM users WHERE id = 'old-uuid-here';
