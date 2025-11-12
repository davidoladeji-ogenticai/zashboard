/**
 * Organization AI Configuration API Routes
 *
 * GET /api/organizations/:orgId/ai-config - Get AI config
 * PUT /api/organizations/:orgId/ai-config - Update AI config (super_admin only)
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-clerk';
import { OrganizationService } from '@/lib/database/organization';
import { userHasOrgPermission } from '@/lib/database/organization-rbac';
import { UserRole } from '@/types/organization';

/**
 * GET /api/organizations/:orgId/ai-config
 * Get AI assistant configuration for organization
 */
export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const { orgId } = params;

    // Check if user is member (or platform admin)
    const isPlatformAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isMember = await OrganizationService.isUserMember(user.id, orgId);

    if (!isMember && !isPlatformAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied'
        },
        { status: 403 }
      );
    }

    // Get AI config
    const aiConfig = await OrganizationService.getAIConfig(orgId);

    if (!aiConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI configuration not found'
        },
        { status: 404 }
      );
    }

    // Check if user can configure (has permission to write)
    let canConfigure = isPlatformAdmin; // Platform admins can always configure

    if (!canConfigure) {
      // Check RBAC permission
      canConfigure = await userHasOrgPermission(user.id, orgId, 'org:ai_config:write');

      // Fallback to old role system
      if (!canConfigure) {
        const userRole = await OrganizationService.getUserRole(user.id, orgId);
        canConfigure = userRole === UserRole.SUPER_ADMIN;
      }
    }

    return NextResponse.json({
      success: true,
      data: aiConfig,
      can_configure: canConfigure
    });
  } catch (error) {
    console.error('Get AI config error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve AI configuration'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/:orgId/ai-config
 * Update AI assistant configuration (super_admin only)
 */
export async function PUT(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const { orgId } = params;

    // Platform admins can configure any org's AI settings
    const isPlatformAdmin = user.role === 'admin' || user.role === 'super_admin';
    let hasPermission = isPlatformAdmin;

    // If not platform admin, check org-specific permission
    if (!hasPermission) {
      // Check RBAC permission (org:ai_config:write permission required)
      hasPermission = await userHasOrgPermission(user.id, orgId, 'org:ai_config:write');

      // Fallback to old role system for backward compatibility
      if (!hasPermission) {
        const userRole = await OrganizationService.getUserRole(user.id, orgId);
        hasPermission = userRole === UserRole.SUPER_ADMIN;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Super admin role required.'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { welcome_messages, welcome_title, welcome_description, enabled } = body;

    // Validate welcome_messages
    if (!Array.isArray(welcome_messages) || welcome_messages.length !== 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide exactly 3 welcome messages'
        },
        { status: 400 }
      );
    }

    // Validate all messages are non-empty strings
    if (welcome_messages.some(msg => typeof msg !== 'string' || msg.trim().length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'All welcome messages must be non-empty strings'
        },
        { status: 400 }
      );
    }

    // Validate enabled is boolean
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'enabled must be a boolean'
        },
        { status: 400 }
      );
    }

    // Update AI config
    const aiConfig = await OrganizationService.updateAIConfig(orgId, {
      welcome_messages,
      welcome_title,
      welcome_description,
      enabled,
      created_by: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'AI configuration updated successfully',
      data: aiConfig
    });
  } catch (error) {
    console.error('Update AI config error:', error);

    if (error instanceof Error && error.message.includes('exactly 3 welcome messages')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide exactly 3 welcome messages'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update AI configuration'
      },
      { status: 500 }
    );
  }
}
