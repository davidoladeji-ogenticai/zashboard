# User Migration to Clerk - Step-by-Step Instructions

## Current Situation

Your database has:
- **2 users**: david@zashboard.ai, david@ogenticai.com
- **1 organization**: OgenticAI
- **2 memberships**: Both users are super_admins in OgenticAI

## The Issue

Clerk generates user IDs like `user_xxxxxxxxxxxxx` but your database uses UUIDs. We need to migrate existing users.

## Migration Options

### Option A: Simple Re-registration (Recommended for 2 Users)

**Steps:**

1. **Set up Clerk in Dashboard**
   - Go to [dashboard.clerk.com](https://dashboard.clerk.com)
   - Create application
   - Copy keys to `.env.local`
   - Set up webhook (see CLERK_QUICKSTART.md)

2. **Test Clerk Integration**
   ```bash
   pnpm dev
   # Visit http://localhost:3000/sign-in
   # Try signing up with a test email
   # Verify user appears in database
   ```

3. **Have Existing Users Re-register**
   - david@zashboard.ai signs up via /sign-up
   - david@ogenticai.com signs up via /sign-up
   - Both users are now in database with Clerk IDs

4. **Reassign Organization Memberships**
   ```sql
   -- Check new Clerk user IDs
   SELECT id, email, name FROM users WHERE email IN ('david@zashboard.ai', 'david@ogenticai.com');

   -- Update organization memberships with new Clerk IDs
   UPDATE organization_memberships
   SET user_id = 'user_xxxxx' -- Replace with actual Clerk ID for david@zashboard.ai
   WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';

   UPDATE organization_memberships
   SET user_id = 'user_yyyyy' -- Replace with actual Clerk ID for david@ogenticai.com
   WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';

   -- Delete old UUID users
   DELETE FROM users WHERE id IN ('ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8', '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46');
   ```

5. **Verify Everything Works**
   - Both users can sign in
   - Both can see OgenticAI organization
   - Both have super_admin role
   - All permissions work

**Pros**: Simple, quick, no API calls needed
**Cons**: Users need to create new passwords

---

### Option B: Programmatic Migration via Clerk API (For Many Users)

If you had more users, you'd use Clerk's API to create accounts programmatically.

**Steps:**

1. **Get Clerk Secret Key**
   - From Clerk Dashboard > API Keys
   - Copy Secret Key (starts with `sk_`)

2. **Run Migration Script**
   ```bash
   node scripts/migrate-users-to-clerk.js
   ```

3. **Script Actions:**
   - Exports existing users from database
   - Creates Clerk accounts via API
   - Updates all database foreign keys
   - Preserves all relationships

**Pros**: Automated, scalable
**Cons**: More complex, users still need to set passwords via Clerk

---

## Recommended Approach for Your Case

Since you only have 2 users, **Option A (Simple Re-registration)** is recommended:

### Quick Migration Steps

1. **Backup Database**
   ```bash
   pg_dump -U macbook zashboard > backup_before_clerk_migration.sql
   ```

2. **Update .env.local with real Clerk keys**
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   CLERK_WEBHOOK_SECRET=whsec_xxxxx
   ```

3. **Start the app**
   ```bash
   pnpm dev
   ```

4. **Test signup**
   - Go to http://localhost:3000/sign-up
   - Create a test account
   - Verify user appears in database with Clerk ID

5. **Have real users sign up**
   - david@zashboard.ai signs up
   - david@ogenticai.com signs up

6. **Get new Clerk user IDs**
   ```sql
   SELECT id, email FROM users
   WHERE email IN ('david@zashboard.ai', 'david@ogenticai.com')
   ORDER BY created_at DESC;
   ```

7. **Update organization memberships**
   ```sql
   -- Replace USER_ID_1 and USER_ID_2 with actual Clerk IDs from step 6

   UPDATE organization_memberships
   SET user_id = 'USER_ID_1'
   WHERE user_id = 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8';

   UPDATE organization_memberships
   SET user_id = 'USER_ID_2'
   WHERE user_id = '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46';
   ```

8. **Clean up old users**
   ```sql
   DELETE FROM users
   WHERE id IN ('ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8', '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46');
   ```

9. **Test everything**
   - Sign in as both users
   - Check organization access
   - Verify permissions work

## Database Schema Notes

Your `users` table currently uses UUID primary key. Clerk user IDs are strings like `user_xxxxxxxxxxxxx`.

**Good news**: PostgreSQL UUIDs can store any string, so no schema change needed! The column is already flexible enough.

If you get errors, you might need to:
```sql
ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255);
```

But try without it first - the webhook should handle this automatically.

## Rollback Plan

If something goes wrong:

1. **Stop the app**
   ```bash
   # Kill the dev server
   ```

2. **Restore database**
   ```bash
   psql -U macbook zashboard < backup_before_clerk_migration.sql
   ```

3. **Revert code changes** (if needed)
   - Git stash or revert commits
   - Or keep code changes and just restore DB

## Troubleshooting

### Issue: Webhook not creating users
**Solution**: Check webhook URL in Clerk Dashboard, verify it's accessible

### Issue: Users can sign up but not see organizations
**Solution**: Run the UPDATE queries from step 7 above

### Issue: "TypeError: Cannot read property 'id'"
**Solution**: User not authenticated - check Clerk keys in .env.local

### Issue: Database foreign key violations
**Solution**: The updates in step 7 should be done in this order:
1. Update organization_memberships
2. Update other tables (roles, teams, etc.)
3. Delete old UUID users

## Testing Checklist

After migration, verify:
- [ ] Users can sign in via Clerk
- [ ] Users see their organizations
- [ ] Users can switch organizations
- [ ] Users can manage organization members
- [ ] Users can view/edit roles and permissions
- [ ] All admin functions work
- [ ] Sidebar shows correct user info
- [ ] Sign out works

## Next Steps

Once migration is complete:
1. Update production environment variables
2. Set up production webhook endpoint
3. Test thoroughly in production
4. Document new user onboarding process
5. Update any API documentation
