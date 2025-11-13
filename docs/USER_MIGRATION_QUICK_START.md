# User Migration Quick Start Guide

## Problem

You're seeing "Failed to fetch user: Unauthorized" because:
- Your database has 2 users with old UUID IDs
- Clerk gives users new IDs (format: `user_xxxxx`)
- The database lookup fails because the IDs don't match

## Solution: Migrate Users to Clerk

Follow these steps to migrate your 2 existing users.

---

## Step-by-Step Migration

### 1. Sign Up First User via Clerk (5 minutes)

```bash
# Start the dev server if not already running
pnpm dev
```

1. Visit http://localhost:3000/sign-up
2. Sign up as **david@zashboard.ai**
3. Complete the Clerk sign-up flow
4. You should be signed in but might see errors (expected for now)

**What happens**: Clerk creates user with ID like `user_2abc123xyz`, tries to create in DB via webhook OR auto-creation

### 2. Verify User Created in Database (2 minutes)

```bash
# Check if user was created
psql -U macbook -d zashboard -c "SELECT id, email, name FROM users WHERE email = 'david@zashboard.ai' ORDER BY created_at DESC LIMIT 1;"
```

**Expected output**:
```
           id            |       email         |     name
-------------------------+--------------------+--------------
 user_2abc123xyz         | david@zashboard.ai | David Chen
```

**If you see a Clerk ID (starts with `user_`)**: ✅ Auto-creation worked! Skip to step 4.

**If you still see only UUID**: ⚠️ Auto-creation failed. Go to step 3.

### 3. Manual User Creation (if auto-creation failed)

Get the Clerk user ID:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Users" in sidebar
3. Find david@zashboard.ai
4. Copy the User ID (looks like `user_2abc...xyz`)

Run manual SQL:
```bash
psql -U macbook -d zashboard

-- Replace 'user_CLERK_ID' with actual ID from Clerk Dashboard
INSERT INTO users (id, email, name, registration_source, created_at, updated_at, is_active, role)
VALUES ('user_CLERK_ID', 'david@zashboard.ai', 'David Chen', 'web', NOW(), NOW(), true, 'user');

-- Verify
SELECT id, email FROM users WHERE email = 'david@zashboard.ai' ORDER BY created_at DESC;
\q
```

### 4. Update Organization Membership (3 minutes)

```bash
psql -U macbook -d zashboard

-- Check current memberships
SELECT om.user_id, u.email, o.name as org, om.role
FROM organization_memberships om
LEFT JOIN users u ON om.user_id = u.id
LEFT JOIN organizations o ON om.organization_id = o.id;

-- Get new Clerk user ID
SELECT id FROM users WHERE email = 'david@zashboard.ai' ORDER BY created_at DESC LIMIT 1;

-- Update membership (replace 'user_NEW_ID' with actual Clerk ID from above)
UPDATE organization_memberships
SET user_id = 'user_NEW_ID'
WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';

-- Verify update
SELECT om.user_id, u.email, o.name as org, om.role
FROM organization_memberships om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'david@zashboard.ai';

\q
```

### 5. Test First User (2 minutes)

1. Sign out from the app (if signed in)
2. Visit http://localhost:3000/sign-in
3. Sign in as david@zashboard.ai
4. Check browser console - should see detailed logs like:
   ```
   [AUTH-CLERK] Clerk userId: user_2abc123xyz
   [AUTH-CLERK] Database query returned 1 rows
   [AUTH-CLERK] User found in database: david@zashboard.ai
   [useOrgPermissions] Successfully fetched user: david@zashboard.ai
   ```
5. ✅ You should see the dashboard without errors!
6. ✅ You should see the OgenticAI organization

### 6. Repeat for Second User (10 minutes)

Repeat steps 1-5 for **david@ogenticai.com**:

```bash
# After signing up the second user
psql -U macbook -d zashboard

-- Get new Clerk ID
SELECT id FROM users WHERE email = 'david@ogenticai.com' ORDER BY created_at DESC LIMIT 1;

-- Update membership (replace 'user_NEW_ID_2' with actual Clerk ID)
UPDATE organization_memberships
SET user_id = 'user_NEW_ID_2'
WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';

\q
```

### 7. Clean Up Old Users (2 minutes)

**WARNING**: Only do this AFTER verifying both new users work!

```bash
psql -U macbook -d zashboard

-- Verify old users are not referenced anymore
SELECT COUNT(*) FROM organization_memberships
WHERE user_id IN ('ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8', '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46');
-- Should return 0

-- Delete old UUID users
DELETE FROM users
WHERE id IN ('ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8', '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46');

-- Verify only Clerk users remain
SELECT id, email, name FROM users;

\q
```

---

## Verification Checklist

After migration, verify:

- [ ] Both users can sign in via Clerk
- [ ] No "Unauthorized" errors in console
- [ ] Dashboard loads without errors
- [ ] Users can see OgenticAI organization
- [ ] Users have super_admin role in organization
- [ ] Organization switching works (if multiple orgs)
- [ ] All admin features accessible

---

## Troubleshooting

### Issue: Auto-creation not working

**Check server logs**:
```bash
# Look for [AUTH-CLERK] prefixed logs
# Should see: "Creating user in database" and "Successfully created user"
```

**Common causes**:
- Database connection issue
- Duplicate email constraint
- Missing required fields

**Solution**: Use manual creation (Step 3)

### Issue: Still seeing "Unauthorized" after migration

**Check Clerk session**:
```javascript
// In browser console
document.cookie
// Should see __session or __clerk_* cookies
```

**Check server logs**:
```
[AUTH-CLERK] Clerk userId: user_xxxxx
[AUTH-CLERK] Database query returned 1 rows
```

**If userId is null**: Clerk session expired, sign in again
**If query returns 0 rows**: User not in database, check email spelling

### Issue: User in DB but still getting 401

**Possible causes**:
1. `is_active = false` - Check: `SELECT is_active FROM users WHERE email='...'`
2. Wrong user ID - Check: `SELECT id FROM users WHERE email='...'`
3. Database connection issue - Check server logs for postgres errors

---

## Quick Commands Reference

```bash
# Check all users
psql -U macbook -d zashboard -c "SELECT id, email, name FROM users;"

# Check org memberships
psql -U macbook -d zashboard -c "SELECT u.email, o.name, om.role FROM organization_memberships om JOIN users u ON om.user_id = u.id JOIN organizations o ON om.organization_id = o.id;"

# Watch server logs (look for [AUTH-CLERK] and [useOrgPermissions])
# Already visible in your terminal running `pnpm dev`

# Test API endpoint directly
curl http://localhost:3000/api/users/me -H "Cookie: $(cat /tmp/cookies.txt)" -v
```

---

## Success! 🎉

Once both users are migrated:
- ✅ No more UUID users in database
- ✅ All users have Clerk IDs
- ✅ Organization memberships preserved
- ✅ No "Unauthorized" errors
- ✅ Full Clerk authentication working

You now have a secure, modern authentication system with Clerk while keeping all your organization and RBAC functionality!
