# Clerk Migration Guide

This guide documents the migration from custom JWT authentication to Clerk.

## What's Been Done

### 1. Core Infrastructure
- ✅ Installed `@clerk/nextjs` and `svix` packages
- ✅ Added Clerk environment variables to `.env.local`:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
- ✅ Replaced middleware with `clerkMiddleware` in `src/middleware.ts`
- ✅ Wrapped app with `<ClerkProvider>` in `src/app/layout.tsx`

### 2. Authentication Pages
- ✅ Created Clerk sign-in page at `src/app/sign-in/[[...sign-in]]/page.tsx`
- ✅ Created Clerk sign-up page at `src/app/sign-up/[[...sign-up]]/page.tsx`
- ⚠️ Old login page still exists at `src/app/login/page.tsx` (can be deleted or redirected)

### 3. Webhook Integration
- ✅ Created webhook handler at `src/app/api/webhooks/clerk/route.ts`
- ✅ Handles `user.created`, `user.updated`, `user.deleted` events
- ✅ Syncs Clerk users to database `users` table

### 4. Helper Functions
- ✅ Created `src/lib/auth-clerk.ts` with helper functions:
  - `getAuthenticatedUser()` - Get current user from Clerk + DB
  - `requireAuth()` - Throw if not authenticated
  - `validateRequest()` - Compatible with existing API pattern
  - `getClerkUserId()` - Get Clerk user ID

### 5. Sample API Route Updates
- ✅ Updated `src/app/api/auth/profile/route.ts` to use Clerk auth
- ✅ Updated `src/app/api/organizations/route.ts` to use Clerk auth

## What Still Needs to Be Done

### 1. Update Remaining API Routes

All API routes that use `validateAuthHeader` need to be updated to use `getAuthenticatedUser` from `@/lib/auth-clerk`.

**Pattern to replace:**
```typescript
import { validateAuthHeader } from '@/lib/auth'

const authHeader = request.headers.get('authorization')
const user = await validateAuthHeader(authHeader)
```

**Replace with:**
```typescript
import { getAuthenticatedUser } from '@/lib/auth-clerk'

const user = await getAuthenticatedUser()
```

**Files to update:**
- `src/app/api/auth/register/route.ts`
- `src/app/api/privacy/delete-old-data/route.ts`
- `src/app/api/privacy/export/route.ts`
- `src/app/api/privacy/metrics/route.ts`
- `src/app/api/settings/api-keys/route.ts`
- `src/app/api/settings/metrics/route.ts`
- All routes in `src/app/api/admin/**`
- All routes in `src/app/api/organizations/**`
- All routes in `src/app/api/users/**`
- All routes in `src/app/api/ai/**`
- All routes in `src/app/api/oauth/**`

### 2. Update Client-Side Code

Any client-side code that calls APIs with `Authorization` headers needs to be updated to rely on Clerk's automatic session management.

**Old pattern:**
```typescript
const token = localStorage.getItem('token')
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**New pattern:**
```typescript
// Clerk automatically includes session in cookies
fetch('/api/endpoint')
```

### 3. Clean Up Old Auth Code

After all routes are migrated:

- Remove JWT-related functions from `src/lib/auth.ts`:
  - `hashPassword`
  - `verifyPassword`
  - `generateToken`
  - `verifyToken`
  - `authenticateUser`
  - `createUserSession`
  - `validateSessionToken`
  - `revokeSession`
  - `cleanupExpiredSessions`
  - `getUserSessions`
- Remove `validateAuthHeader` (or modify to only handle demo keys if needed)
- Remove `user_sessions` table from database
- Remove password-related columns from `users` table (optional, for security)

### 4. Update Dashboard Components

Components that display user info need to use Clerk hooks:

**Old pattern:**
```typescript
const user = JSON.parse(localStorage.getItem('user'))
```

**New pattern:**
```typescript
import { useUser } from '@clerk/nextjs'

const { user } = useUser()
```

### 5. Database Schema Updates

Consider these database changes:

1. **Remove password-related fields:**
   ```sql
   ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
   ```

2. **Drop user_sessions table:**
   ```sql
   DROP TABLE IF EXISTS user_sessions;
   ```

3. **Update users.id to match Clerk user IDs:**
   - Clerk user IDs are strings like `user_xxxxxxxxxxxxx`
   - Ensure `users.id` column is compatible (VARCHAR or TEXT)
   - The webhook already handles this mapping

## Clerk Dashboard Setup

### 1. Create Clerk Application
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application
3. Copy the API keys to `.env.local`

### 2. Configure Webhook
1. In Clerk Dashboard, go to "Webhooks"
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET` in `.env.local`

### 3. Configure Redirect URLs
Set these in Clerk Dashboard → Paths:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in: `/`
- After sign-up: `/`

### 4. Enable Organizations (Optional)
If using Clerk Organizations for team management:
1. Enable Organizations in Clerk Dashboard
2. Configure organization settings
3. Update webhook to handle organization events

## Testing Checklist

- [ ] User can sign up via Clerk
- [ ] Webhook creates user in database
- [ ] User can sign in via Clerk
- [ ] Protected pages require authentication
- [ ] API routes work with Clerk auth
- [ ] Organization memberships work
- [ ] RBAC permissions still enforced
- [ ] Admin pages accessible to staff
- [ ] User profile updates sync
- [ ] Sign out works correctly

## Migration Script

To find all files that need updating:

```bash
# Find all API routes using validateAuthHeader
grep -r "validateAuthHeader" src/app/api/

# Find all client-side code using localStorage for auth
grep -r "localStorage.getItem('token')" src/

# Find all API calls with Authorization headers
grep -r "Authorization.*Bearer" src/
```

## Rollback Plan

If issues occur, you can rollback by:

1. Revert `src/middleware.ts` to use JWT verification
2. Revert `src/app/layout.tsx` to remove ClerkProvider
3. Restore old login/register pages
4. Remove Clerk-specific API route changes
5. Keep database changes (users table) as they're backward compatible
