/**
 * useOrgPermissions Hook
 *
 * React hook for checking organization permissions
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  isPlatformSuperAdmin,
  isOrgSuperAdmin,
  isOrgAdmin,
  hasOrgAccess,
  getUserOrgRole,
  canManageOrgMembers,
  canConfigureAI,
  getManageableOrgs,
  type UserInfo
} from '@/lib/auth/check-org-permissions';

export function useOrgPermissions(orgId?: string) {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      loadUser();
    }
  }, [isLoaded, clerkUser]);

  async function loadUser() {
    try {
      if (!clerkUser) {
        console.log('[useOrgPermissions] No Clerk user, skipping fetch');
        setLoading(false);
        return;
      }

      console.log('[useOrgPermissions] Fetching user data from /api/users/me');
      const response = await fetch('/api/users/me');

      // Check if we got redirected to sign-in (HTML response)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.log('[useOrgPermissions] Received HTML response (likely redirected to sign-in), user not authenticated');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        // Try to get error details
        let errorDetails = response.statusText;

        try {
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || response.statusText;
          } else {
            const errorText = await response.text();
            errorDetails = errorText.substring(0, 200); // First 200 chars
          }
        } catch (parseError) {
          console.error('[useOrgPermissions] Could not parse error response:', parseError);
        }

        console.error('[useOrgPermissions] Failed to fetch user:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails
        });
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[useOrgPermissions] Successfully fetched user:', data.user?.email);

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        console.warn('[useOrgPermissions] Response success=false or no user:', data);
      }
    } catch (error) {
      console.error('[useOrgPermissions] Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }

  const permissions = {
    // Platform-level permissions
    isPlatformAdmin: isPlatformSuperAdmin(user),

    // Organization-specific permissions (if orgId provided)
    isOrgSuperAdmin: orgId ? isOrgSuperAdmin(user, orgId) : false,
    isOrgAdmin: orgId ? isOrgAdmin(user, orgId) : false,
    hasOrgAccess: orgId ? hasOrgAccess(user, orgId) : false,
    userOrgRole: orgId ? getUserOrgRole(user, orgId) : null,

    // Action permissions (if orgId provided)
    canManageMembers: orgId ? canManageOrgMembers(user, orgId) : false,
    canConfigureAI: orgId ? canConfigureAI(user, orgId) : false,

    // Utility
    manageableOrgs: getManageableOrgs(user),

    // User info
    user,
    loading
  };

  return permissions;
}
