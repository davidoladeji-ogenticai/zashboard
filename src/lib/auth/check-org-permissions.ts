/**
 * Organization Permission Checking Utilities
 *
 * Helper functions to check user permissions for organization management.
 *
 * IMPORTANT: Platform-level permissions and organization-level permissions
 * are now SEPARATE. Platform super_admin does NOT automatically grant
 * organization-level permissions. Users must be explicitly granted org roles.
 */

import { UserRole } from '@/types/organization';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string; // Platform role (from users.role) - only for platform admin access
  organization_context?: {
    organizations: Array<{
      membership: {
        organization_id: string;
        role: UserRole;
        organization: {
          id: string;
          name: string;
          slug: string;
        };
      };
      // New: organization-specific roles from the RBAC system
      org_roles?: Array<{
        id: string;
        name: string;
        level: number;
      }>;
      // New: organization-specific permissions
      org_permissions?: Array<{
        name: string;
        resource: string;
        action: string;
      }>;
    }>;
    active_organization_id: string | null;
  };
}

/**
 * Check if user is a platform super admin
 * Platform admins can access platform-level features at /admin/*
 * but do NOT automatically have org-level access
 */
export function isPlatformSuperAdmin(user: UserInfo | null): boolean {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

/**
 * Check if user is super admin of a specific organization
 * This checks the organization-scoped RBAC system
 * Platform super_admin does NOT grant org super_admin status
 */
export function isOrgSuperAdmin(user: UserInfo | null, orgId: string): boolean {
  if (!user || !user.organization_context) return false;

  // Check if user has org super_admin role (from organization_user_roles)
  const org = user.organization_context.organizations.find(
    o => o.membership.organization_id === orgId
  );

  if (!org) return false;

  // Check if user has a role with level 100 (super_admin)
  if (org.org_roles) {
    return org.org_roles.some(role => role.level >= 100);
  }

  // Fallback to old simple role system (for backward compatibility during migration)
  return org.membership.role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user is admin (or super admin) of a specific organization
 * Platform super_admin does NOT grant org admin status
 */
export function isOrgAdmin(user: UserInfo | null, orgId: string): boolean {
  if (!user || !user.organization_context) return false;

  const org = user.organization_context.organizations.find(
    o => o.membership.organization_id === orgId
  );

  if (!org) return false;

  // Check if user has a role with level >= 50 (admin or super_admin)
  if (org.org_roles) {
    return org.org_roles.some(role => role.level >= 50);
  }

  // Fallback to old simple role system (for backward compatibility during migration)
  return org.membership.role === UserRole.ADMIN ||
         org.membership.role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user has access to view an organization
 * Both platform admins (for viewing purposes) and org members can view
 */
export function hasOrgAccess(user: UserInfo | null, orgId: string): boolean {
  if (!user || !user.organization_context) return false;

  // Platform super admins can VIEW all orgs (but not manage them)
  if (isPlatformSuperAdmin(user)) return true;

  // Check if user is a member of this org
  return user.organization_context.organizations.some(
    o => o.membership.organization_id === orgId
  );
}

/**
 * Get user's role in a specific organization
 */
export function getUserOrgRole(user: UserInfo | null, orgId: string): UserRole | null {
  if (!user || !user.organization_context) return null;

  const org = user.organization_context.organizations.find(
    o => o.membership.organization_id === orgId
  );

  return org?.membership.role || null;
}

/**
 * Check if user can manage members of an organization
 * Requires org super_admin role (level 100)
 */
export function canManageOrgMembers(user: UserInfo | null, orgId: string): boolean {
  return isOrgSuperAdmin(user, orgId);
}

/**
 * Check if user can configure AI settings for an organization
 * Requires org super_admin role (level 100)
 */
export function canConfigureAI(user: UserInfo | null, orgId: string): boolean {
  return isOrgSuperAdmin(user, orgId);
}

/**
 * Get list of organizations user can manage
 * Platform super_admins can VIEW all orgs but NOT manage them
 * Only users with org super_admin role can manage an org
 */
export function getManageableOrgs(user: UserInfo | null): Array<{ id: string; name: string }> {
  if (!user || !user.organization_context) return [];

  // Platform super admins can NO LONGER automatically manage all orgs
  // They must be explicitly granted org super_admin role

  // Return orgs where user has super_admin role (level >= 100)
  return user.organization_context.organizations
    .filter(o => {
      // Check new RBAC system
      if (o.org_roles) {
        return o.org_roles.some(role => role.level >= 100);
      }
      // Fallback to old system
      return o.membership.role === UserRole.SUPER_ADMIN;
    })
    .map(o => ({
      id: o.membership.organization_id,
      name: o.membership.organization?.name || 'Unknown Organization'
    }));
}
