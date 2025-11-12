# OgenticAI Ecosystem Architecture

## Overview

This document outlines the authentication and user management architecture for the OgenticAI ecosystem, which consists of three main applications:

1. **Zashboard** - Next.js admin dashboard for OgenticAI staff
2. **Zing-flow** - Electron-based browser application
3. **Ogents-market** - Marketplace application (planned)

## Authentication Strategy: Single Clerk Instance

### Architecture Decision

**✅ RECOMMENDED: Use a single Clerk instance across all applications**

This approach provides:
- **Unified user experience**: Users sign in once, access all apps
- **Shared authentication sessions**: Seamless switching between applications
- **Single source of truth**: One database for all user data
- **Simplified management**: One Clerk dashboard to manage everything
- **Cost effective**: One subscription instead of multiple

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Clerk Instance                           │
│                  (Primary Domain)                            │
│                                                              │
│  Users: All users across OgenticAI ecosystem                │
│  Organizations: All orgs (OgenticAI, customer orgs, etc)    │
│  Sessions: Shared across all subdomains                     │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Zashboard   │  │  Zing-flow   │  │    Market    │
│  (Next.js)   │  │  (Electron)  │  │  (Next.js)   │
│              │  │              │  │              │
│ :3000        │  │  Desktop App │  │  :3001       │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Clerk Configuration

### API Keys (Shared Across All Apps)

All three applications use the **same Clerk API keys**:

```bash
# .env.local (in all projects)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y29uY2lzZS1ncm91cGVyLTk0...
CLERK_SECRET_KEY=sk_test_u6auz5QAhfr9WzmKxPKfyaJCSXREPIeHvoRdMk7KUC
CLERK_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

### Domain Configuration

#### Development

- **Zashboard**: `localhost:3000`
- **Zing-flow**: Electron app (custom protocol or embedded browser)
- **Market**: `localhost:3001`

Clerk supports multiple localhost ports simultaneously.

#### Production

Configure these domains in Clerk Dashboard:

- **Primary Domain**: `dashboard.ogenticai.com` (Zashboard)
- **Satellite Domain 1**: `zing.ogenticai.com` (Zing-flow web interface)
- **Satellite Domain 2**: `market.ogenticai.com` (Ogents Market)

**Setup in Clerk:**
1. Go to Clerk Dashboard → Settings → Domains
2. Add primary domain: `dashboard.ogenticai.com`
3. Add satellite domains:
   - `zing.ogenticai.com`
   - `market.ogenticai.com`
4. Sessions will be automatically shared across all subdomains

## Application-Specific Integration

### 1. Zashboard (Next.js)

**Status**: ✅ Fully Integrated

**Implementation**:
```typescript
// src/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  // Route protection logic...
})

// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}

// API routes
import { getAuthenticatedUser } from '@/lib/auth-clerk'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

**Features**:
- Clerk middleware for route protection
- HTTP-only cookie-based sessions (XSS-safe)
- Webhook integration for user sync
- Auto-creation of users in local database
- Organization and RBAC integration

### 2. Zing-flow (Electron)

**Status**: ⚠️ Integration Needed

**Challenge**: Electron apps require special handling for OAuth flows

**Recommended Approach**:

#### Option A: Embedded Browser View (Recommended)

```javascript
// main.js (Electron main process)
const { BrowserWindow } = require('electron')

function createAuthWindow() {
  const authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Load Clerk sign-in page
  authWindow.loadURL('https://dashboard.ogenticai.com/sign-in')

  // Listen for successful authentication
  authWindow.webContents.on('did-navigate', (event, url) => {
    if (url.startsWith('zing-flow://callback')) {
      // Extract session from callback
      // Store session in Electron secure storage
      authWindow.close()
    }
  })
}
```

#### Option B: OAuth Flow with Loopback Server

```javascript
// Alternative: OAuth with localhost callback
const express = require('express')
const app = express()

app.get('/callback', (req, res) => {
  const { code } = req.query
  // Exchange code for session token
  // Store in Electron secure storage
  res.send('Authentication successful! You can close this window.')
})

const server = app.listen(0) // Random port
const port = server.address().port

// Open system browser with Clerk OAuth URL
const authUrl = `https://accounts.clerk.dev/oauth/authorize?...&redirect_uri=http://localhost:${port}/callback`
shell.openExternal(authUrl)
```

#### Session Storage in Electron

Use Electron's `safeStorage` API to securely store the Clerk session:

```javascript
const { safeStorage } = require('electron')

// Store session
const encryptedSession = safeStorage.encryptString(sessionToken)
// Save to disk or Electron store

// Retrieve session
const sessionToken = safeStorage.decryptString(encryptedSession)
```

### 3. Ogents Market (Next.js)

**Status**: 🔜 Not Yet Created

**Implementation**: Same as Zashboard

```bash
# When creating the project
cd ogents-market
npm install @clerk/nextjs svix

# Copy .env.local from zashboard (same keys!)
cp ../zashboard/.env.local .env.local

# Follow same integration pattern as zashboard
```

## Database Schema

### User ID Format

After Clerk migration, user IDs use Clerk's format:

- **Old Format**: UUID (`ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8`)
- **New Format**: Clerk ID (`user_35LhrTOIU7dvGD4k7p9oGzynQd8`)

All `user_id` columns in the database have been converted to `TEXT` type to accommodate Clerk IDs.

### Current Users

| Email | Clerk ID | Organization | Roles |
|-------|----------|--------------|-------|
| david@zashboard.ai | `user_35LhrTOIU7dvGD4k7p9oGzynQd8` | OgenticAI | super_admin (platform), super_admin (org) |
| david@ogenticai.com | `user_35LRNK8bPg7vbaiEOWzY6qulevz` | OgenticAI | user (platform), super_admin (org) |

## Webhooks

### Webhook Configuration

Create a single webhook in Clerk Dashboard that syncs user data to Zashboard's database:

1. Go to Clerk Dashboard → Webhooks
2. Create endpoint: `https://dashboard.ogenticai.com/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

### Webhook Handler

Located at `src/app/api/webhooks/clerk/route.ts`:

```typescript
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const evt: WebhookEvent = verifyWebhook(req)

  switch (evt.type) {
    case 'user.created':
      await createUserInDatabase(evt.data)
      break
    case 'user.updated':
      await updateUserInDatabase(evt.data)
      break
    case 'user.deleted':
      await softDeleteUserInDatabase(evt.data.id)
      break
  }
}
```

## Migration Summary

### Completed

✅ Database schema migrated (UUID → TEXT for all user_id columns)
✅ 2 users migrated to Clerk
✅ Organization memberships preserved
✅ RBAC roles preserved (platform + org-level)
✅ Foreign key constraints recreated
✅ Zashboard fully integrated with Clerk
✅ Authentication working with new Clerk IDs

### Test Credentials

Both users can now sign in at `http://localhost:3000/sign-in`:

- **Email**: david@zashboard.ai
- **Password**: TempPassword123!

OR

- **Email**: david@ogenticai.com
- **Password**: TempPassword123!

Users can reset passwords through Clerk's password reset flow.

## Next Steps

### 1. Zing-flow Integration

- [ ] Research Clerk + Electron best practices
- [ ] Implement OAuth flow with embedded browser view
- [ ] Test session storage with Electron `safeStorage`
- [ ] Verify cross-app session sharing

### 2. Ogents Market Setup

- [ ] Create Next.js project
- [ ] Install @clerk/nextjs
- [ ] Copy Clerk keys from Zashboard
- [ ] Follow same integration pattern

### 3. Production Deployment

- [ ] Set up domains (dashboard, zing, market)
- [ ] Configure satellite domains in Clerk
- [ ] Test cross-domain session sharing
- [ ] Set up SSL certificates
- [ ] Update webhook URL to production

## Security Considerations

### HTTP-Only Cookies

Clerk uses HTTP-only cookies by default, which are:
- ✅ Safe from XSS attacks
- ✅ Automatically sent with requests
- ✅ Cannot be accessed by JavaScript
- ✅ Work seamlessly with Next.js middleware

### Session Management

- Sessions automatically expire after inactivity
- Refresh tokens handled by Clerk SDK
- No manual token management required

### RBAC Integration

The existing RBAC system is preserved:

- **Platform-level roles**: Stored in `user_roles` table
- **Organization-level roles**: Stored in `organization_user_roles` table
- **Permissions**: Checked via `check-org-permissions.ts` utilities

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js App Router](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk + Electron (Community Guide)](https://github.com/clerk/clerk-electron-example)
- [Satellite Domains](https://clerk.com/docs/deployments/set-up-satellite-domain)

## Support

For issues or questions about the Clerk integration:
1. Check logs in `dev.log`
2. Review [AUTH-CLERK] and [useOrgPermissions] console logs
3. Verify Clerk API keys in `.env.local`
4. Test webhook deliveries in Clerk Dashboard
