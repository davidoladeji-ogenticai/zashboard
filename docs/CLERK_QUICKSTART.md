# Clerk Quick Start Guide

## Getting Started with Clerk Authentication

### Step 1: Set Up Clerk Account (5 minutes)

1. **Create Clerk Application**
   - Go to [dashboard.clerk.com](https://dashboard.clerk.com)
   - Sign up or sign in
   - Click "Add application"
   - Name it "Zashboard" or similar
   - Choose your authentication options (Email/Password, Google, etc.)

2. **Copy API Keys**
   - In Clerk Dashboard, go to "API Keys"
   - Copy the **Publishable Key** and **Secret Key**
   - Paste them into `.env.local`:
     ```bash
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
     CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
     ```

3. **Configure Paths**
   - In Clerk Dashboard, go to "Paths"
   - Set these URLs:
     - **Sign-in page**: `/sign-in`
     - **Sign-up page**: `/sign-up`
     - **Home URL**: `/`
     - **After sign-in**: `/`
     - **After sign-up**: `/`

### Step 2: Set Up Webhook (5 minutes)

1. **Create Webhook Endpoint**
   - In Clerk Dashboard, go to "Webhooks"
   - Click "Add Endpoint"
   - Enter your webhook URL:
     - **Development**: Use [ngrok](https://ngrok.com) or [localhost.run](https://localhost.run)
       ```bash
       # Example with ngrok
       ngrok http 3000
       # Use: https://xxxxx.ngrok.io/api/webhooks/clerk
       ```
     - **Production**: `https://yourdomain.com/api/webhooks/clerk`

2. **Subscribe to Events**
   - Select these events:
     - ✅ `user.created`
     - ✅ `user.updated`
     - ✅ `user.deleted`

3. **Copy Signing Secret**
   - Click on your webhook
   - Copy the **Signing Secret**
   - Add to `.env.local`:
     ```bash
     CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
     ```

### Step 3: Test the Integration (10 minutes)

1. **Start the Development Server**
   ```bash
   pnpm dev
   ```

2. **Test Sign Up**
   - Go to `http://localhost:3000`
   - Should redirect to `/sign-in`
   - Click "Sign up" and create an account
   - Check database:
     ```sql
     SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
     ```
   - Should see your new user

3. **Test Sign In**
   - Sign out if signed in
   - Go to `http://localhost:3000/sign-in`
   - Sign in with your credentials
   - Should redirect to dashboard

4. **Test Protected Routes**
   - Try accessing `/settings` or `/profile`
   - Should work when signed in
   - Sign out and try again
   - Should redirect to `/sign-in`

5. **Test Webhook**
   - In Clerk Dashboard, go to "Webhooks"
   - Click on your webhook endpoint
   - View "Recent Events"
   - Should see `user.created` event
   - Check if status is 200 (success)

### Step 4: Verify Everything Works

**Checklist:**
- [ ] Sign up creates user in database
- [ ] Sign in works and redirects to dashboard
- [ ] Protected routes require authentication
- [ ] User info displays in sidebar
- [ ] Sign out works
- [ ] Webhook events show success (200)

### Common Issues & Solutions

#### Issue: Webhook returns 401/403
**Solution**: Check that `CLERK_WEBHOOK_SECRET` in `.env.local` matches Clerk Dashboard

#### Issue: User not created in database
**Solution**:
1. Check webhook endpoint is accessible (use ngrok for local dev)
2. View webhook logs in Clerk Dashboard
3. Check server console for errors

#### Issue: Sign in doesn't work
**Solution**:
1. Verify Clerk keys are correct in `.env.local`
2. Check middleware.ts is using `clerkMiddleware`
3. Verify layout.tsx has `<ClerkProvider>`

#### Issue: API routes return 401
**Solution**: API routes need to be updated to use `getAuthenticatedUser()` from `@/lib/auth-clerk`

### Next Steps

After basic authentication works:

1. **Update Remaining API Routes**
   - Run: `./scripts/find-auth-migrations.sh`
   - Update routes one by one to use Clerk auth

2. **Configure Social Login** (Optional)
   - In Clerk Dashboard, go to "Social Connections"
   - Enable Google, GitHub, Microsoft, etc.

3. **Enable Organizations** (Optional)
   - In Clerk Dashboard, enable "Organizations"
   - Use for team management features

4. **Customize Appearance**
   - In Clerk Dashboard, go to "Customization"
   - Match your brand colors and logo

5. **Production Deployment**
   - Update webhook URL to production domain
   - Use production Clerk keys
   - Test thoroughly in production

### Development Workflow

```bash
# 1. Start dev server
pnpm dev

# 2. In another terminal, start ngrok (for webhook testing)
ngrok http 3000

# 3. Update webhook URL in Clerk Dashboard with ngrok URL

# 4. Make changes and test

# 5. Check for remaining migrations
./scripts/find-auth-migrations.sh
```

### Useful Commands

```bash
# Find files still using old auth
grep -r "validateAuthHeader" src/app/api/

# Find localStorage token usage
grep -r "localStorage.getItem('token')" src/

# Check webhook endpoint locally
curl -X POST http://localhost:3000/api/webhooks/clerk

# View database users
psql -U macbook -d zashboard -c "SELECT id, email, name, created_at FROM users;"
```

### Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Clerk Quickstart**: https://clerk.com/docs/quickstarts/nextjs
- **Migration Guide**: `CLERK_MIGRATION_GUIDE.md`
- **Integration Summary**: `CLERK_INTEGRATION_SUMMARY.md`

### Support

If you encounter issues:

1. Check Clerk Dashboard webhook logs
2. Check server console for errors
3. Review `CLERK_MIGRATION_GUIDE.md`
4. Check Clerk's documentation
5. Ask in Clerk's Discord community

## You're All Set! 🎉

The core Clerk integration is complete. Follow the checklist above to verify everything works, then proceed with migrating remaining API routes.
