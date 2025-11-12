/**
 * Unified AI Configuration API Endpoint for Zing Browser
 *
 * GET /api/ai/config - Get AI config for current user
 * Returns org-specific config if available, falls back to system config
 * Includes permission information (can_configure, config_level)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader } from '@/lib/auth';
import { OrganizationService } from '@/lib/database/organization';
import { userHasOrgPermission } from '@/lib/database/organization-rbac';

/**
 * GET /api/ai/config
 * Get AI configuration for current user
 * - If user has an active organization with AI config, return that
 * - Otherwise, return system-wide default config
 * - Include can_configure permission based on user's role/permissions
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const user = await validateAuthHeader(authHeader);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get user's organization context
    let organizationContext = null;
    try {
      organizationContext = await OrganizationService.getUserOrganizations(user.id);
    } catch (error) {
      console.warn('Failed to get organization context:', error);
    }

    // Determine active organization
    let activeOrgId: string | null = null;
    let orgConfig = null;
    let canConfigureOrg = false;

    if (organizationContext?.active_organization_id) {
      activeOrgId = organizationContext.active_organization_id;

      // Try to get organization-specific AI config
      try {
        orgConfig = await OrganizationService.getAIConfig(activeOrgId);

        // Check if user can configure this org's AI settings
        canConfigureOrg = await userHasOrgPermission(
          user.id,
          activeOrgId,
          'org:ai_config:write'
        );

        // Fallback to old role system if RBAC check fails
        if (!canConfigureOrg) {
          const userRole = await OrganizationService.getUserRole(user.id, activeOrgId);
          canConfigureOrg = userRole === 'super_admin';
        }
      } catch (error) {
        console.warn('Failed to get org AI config:', error);
      }
    }

    // If org config exists and is enabled, return it
    if (orgConfig && orgConfig.enabled) {
      return NextResponse.json({
        success: true,
        data: {
          welcome_messages: typeof orgConfig.welcome_messages === 'string'
            ? JSON.parse(orgConfig.welcome_messages)
            : orgConfig.welcome_messages,
          welcome_title: orgConfig.welcome_title,
          welcome_description: orgConfig.welcome_description,
          enabled: orgConfig.enabled
        },
        config_level: 'organization',
        organization_id: activeOrgId,
        can_configure: canConfigureOrg,
        configure_endpoint: `/api/organizations/${activeOrgId}/ai-config`
      });
    }

    // Fall back to system config
    const systemConfig = await OrganizationService.getSystemAIConfig();

    if (!systemConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI configuration found'
        },
        { status: 404 }
      );
    }

    // Check if user is platform admin (can configure system settings)
    const isPlatformAdmin = user.role === 'admin' || user.role === 'super_admin';

    return NextResponse.json({
      success: true,
      data: {
        welcome_messages: typeof systemConfig.welcome_messages === 'string'
          ? JSON.parse(systemConfig.welcome_messages)
          : systemConfig.welcome_messages,
        welcome_title: systemConfig.welcome_title,
        welcome_description: systemConfig.welcome_description,
        enabled: systemConfig.enabled
      },
      config_level: 'system',
      organization_id: activeOrgId, // Include active org even if using system config
      can_configure: canConfigureOrg || isPlatformAdmin,
      configure_endpoint: canConfigureOrg && activeOrgId
        ? `/api/organizations/${activeOrgId}/ai-config`
        : isPlatformAdmin
        ? '/api/ai-config'
        : null
    });
  } catch (error) {
    console.error('Get unified AI config error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve AI configuration'
      },
      { status: 500 }
    );
  }
}
