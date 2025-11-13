# Clerk Roles Mapping Strategy

## Overview

This document explains how Zashboard's role-based access control (RBAC) system integrates with Clerk authentication, properly separating **platform-level permissions** from **organization-level permissions**.

## Key Principle

**Platform Super Admin ≠ Organization Super Admin**

- Platform admins have platform-wide access but do NOT automatically control all organizations
- Organization admins have full control within their specific organization(s) only
- Users can have both roles, but they are separate and must be granted explicitly

## Role Hierarchy

### Platform Roles (Stored in `users.role`)

Managed via Clerk user `publicMetadata`:

```json
{
  "platform_role": "super_admin" | "admin" | "user"
}
```

| Role | Level | Permissions |
|------|-------|-------------|
| `super_admin` | 100 | Access `/admin/*` routes, VIEW all organizations, manage platform features |
| `admin` | 90 | Access platform admin features |
| `user` | 10 | Regular user (default) |

**How to Set:**
1. Go to Clerk Dashboard → Users → [Select User]
2. Click "Metadata" tab
3. Add to `publicMetadata`:
   ```json
   {
     "platform_role": "super_admin"
   }
   ```
4. Save

### Organization Roles (Stored in `organization_memberships.role` + RBAC tables)

Managed via Clerk organization membership roles:

| Clerk Role | Local DB Role | Level | Permissions |
|------------|---------------|-------|-------------|
| `org:super_admin` | `super_admin` | 100 | Full control over organization settings, members, roles, permissions |
| `org:admin` | `admin` | 50 | Manage members, teams, view analytics |
| `org:member` | `user` | 10 | Basic organization access |
| `admin` (legacy) | `admin` | 50 | Maps to org admin (NOT platform) |

**How to Set:**
1. Go to Clerk Dashboard → Organizations → [Select Org]
2. Go to Members tab
3. Find user → Change role to `org:super_admin` (or other role)
4. Save

## Implementation Details

### 1. Webhook Handler (`src/app/api/webhooks/clerk/route.ts`)

#### User Events
```typescript
case 'user.created':
case 'user.updated':
  // Extract platform role from Clerk metadata
  const platformRole = public_metadata?.platform_role || 'user'

  // Store in users.role
  await query('INSERT INTO users (..., role) VALUES (..., $4)', [... platformRole])
```

#### Organization Membership Events
```typescript
case 'organizationMembership.created':
case 'organizationMembership.updated':
  // Map Clerk org role to local role
  const roleMapping = {
    'org:super_admin': 'super_admin',  // Org super admin
    'org:admin': 'admin',               // Org admin
    'org:member': 'user',               // Org member
    'admin': 'admin'                    // Legacy → org admin
  }

  // Store in organization_memberships.role
  await query('INSERT INTO organization_memberships (..., role) VALUES (..., $3)', [... mappedRole])

  // Also sync to organization_user_roles for RBAC
  await query('INSERT INTO organization_user_roles (user_id, organization_id, role_id) ...')
```

### 2. Auth Middleware (`src/lib/auth-clerk.ts`)

```typescript
export async function getAuthenticatedUser() {
  const { userId } = await auth()
  const clerkUser = await currentUser()

  // Check platform role from Clerk metadata
  const platformRole = clerkUser?.publicMetadata?.platform_role || 'user'

  // Get user from database
  const dbUser = await query('SELECT ... FROM users WHERE id = $1', [userId])

  // Sync platform role if changed
  if (dbUser.role !== platformRole) {
    await query('UPDATE users SET role = $1 WHERE id = $2', [platformRole, userId])
  }

  return { ...dbUser, role: platformRole }
}
```

### 3. Permission Checking (`src/lib/auth/check-org-permissions.ts`)

```typescript
// Check platform admin (for platform features)
function isPlatformSuperAdmin(user) {
  return user.role === 'super_admin' || user.role === 'admin'
}

// Check org super admin (for org management)
function isOrgSuperAdmin(user, orgId) {
  const org = user.organization_context.organizations.find(o => o.membership.organization_id === orgId)

  // Check RBAC system
  if (org.org_roles) {
    return org.org_roles.some(role => role.level >= 100)
  }

  // Fallback to simple role
  return org.membership.role === 'super_admin'
}
```

## Setup Instructions

### Step 1: Create Custom Org Role in Clerk

1. Go to [Clerk Dashboard → Organizations → Roles](https://dashboard.clerk.com/)
2. Create new role:
   - **Role Key:** `org:super_admin`
   - **Name:** Organization Super Administrator
   - **Description:** Full control over organization settings, members, and permissions
3. Assign all organization permissions or specific ones:
   - `org:sys_memberships:manage`
   - `org:sys_profile:manage`
   - `org:sys_profile:delete`
   - `org:sys_domains:manage`
4. Save

### Step 2: Set Up Platform Admins

Run the setup script:
```bash
node scripts/setup-clerk-custom-roles.js
```

This will print instructions for:
1. Creating the `org:super_admin` role in Clerk Dashboard
2. Setting platform roles via user metadata
3. Assigning users to org roles

### Step 3: Migrate Existing Users

Option A: Manual (Recommended for production)
1. Go to Clerk Dashboard → Users → [user@example.com]
2. Add to public metadata: `{"platform_role": "super_admin"}`
3. Save

Option B: Via Script (For development)
```bash
# Edit scripts/migrate-platform-admins.js to add admin emails
node scripts/migrate-platform-admins.js
```

### Step 4: Assign Organization Roles

1. Go to Clerk Dashboard → Organizations → [Select Org]
2. Members tab → Find user
3. Change role to `org:super_admin`
4. Save

## Testing

### Test Platform Admin Permissions

1. Set user's `publicMetadata.platform_role = "super_admin"`
2. Sign in as that user
3. **Should be able to:**
   - Access `/admin/*` routes
   - View all organizations at `/admin/organizations`
   - View platform analytics
4. **Should NOT be able to:**
   - Manage organization settings (without org role)
   - Add/remove members (without org role)
   - Configure AI settings (without org role)

### Test Org Super Admin Permissions

1. Assign user `org:super_admin` role in Clerk for a specific org
2. Sign in as that user
3. **Should be able to:**
   - Manage organization settings
   - Add/remove/update members
   - Configure AI settings
   - Create/modify roles and permissions
4. **Should NOT be able to:**
   - Access platform admin routes (without platform role)
   - Manage other organizations (without their org role)

### Test Regular User

1. User has no special roles
2. **Should be able to:**
   - View organizations they're a member of
   - Access basic org features
3. **Should NOT be able to:**
   - Access platform admin routes
   - Manage organization settings
   - Modify member roles

## Migration Path

### For Existing Installations

1. **Backup your database** before proceeding
2. Run the Clerk webhook updates (automatic on deploy)
3. Set platform roles for existing admins:
   ```bash
   node scripts/migrate-platform-admins.js
   ```
4. Create `org:super_admin` role in Clerk Dashboard
5. Assign org roles to users who need org management access
6. Test permissions are working correctly
7. Monitor logs for any role sync issues

### Database Changes

No schema migration needed! The existing schema already supports this:
- `users.role` = Platform role
- `organization_memberships.role` = Org membership role
- `organization_user_roles` + `organization_roles` = Fine-grained RBAC

## Troubleshooting

### Platform admin can't access /admin routes
- Check `users.role` in database
- Verify Clerk `publicMetadata.platform_role` is set
- Check auth middleware is syncing the role

### Org super_admin can't manage org
- Verify user has `org:super_admin` role in Clerk
- Check `organization_memberships.role` is `super_admin`
- Verify `organization_user_roles` has level 100 role assigned

### Roles not syncing from Clerk
- Check webhook is configured correctly
- Verify `CLERK_WEBHOOK_SECRET` is set
- Check webhook logs in Clerk Dashboard
- Review server logs for webhook errors

## Benefits of This Approach

✅ **Clear separation** between platform and org permissions
✅ **Principle of least privilege** - users only get access they need
✅ **Granular control** - assign platform and org roles independently
✅ **Scalable** - works for single-tenant and multi-tenant scenarios
✅ **Clerk native** - uses Clerk's built-in features (metadata + org roles)
✅ **Backward compatible** - existing RBAC tables still used and respected

## Security Considerations

1. **Never grant platform super_admin to untrusted users** - they can view all organizations
2. **Org super_admins have full control** over their organization - grant wisely
3. **Regular audits** - review who has platform and org admin roles periodically
4. **Webhook security** - ensure webhook secret is properly configured
5. **Metadata validation** - auth middleware validates role values

## Reference

- **Webhook Handler:** [src/app/api/webhooks/clerk/route.ts](src/app/api/webhooks/clerk/route.ts)
- **Auth Middleware:** [src/lib/auth-clerk.ts](src/lib/auth-clerk.ts)
- **Permission Checks:** [src/lib/auth/check-org-permissions.ts](src/lib/auth/check-org-permissions.ts)
- **Organization RBAC:** [src/lib/database/organization-rbac.ts](src/lib/database/organization-rbac.ts)
- **Setup Script:** [scripts/setup-clerk-custom-roles.js](scripts/setup-clerk-custom-roles.js)
- **Migration Script:** [scripts/migrate-platform-admins.js](scripts/migrate-platform-admins.js)
