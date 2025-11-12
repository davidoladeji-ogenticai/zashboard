/**
 * Organization Member Management API Routes
 *
 * PUT    /api/organizations/:orgId/members/:userId - Update member role
 * DELETE /api/organizations/:orgId/members/:userId - Remove member
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-clerk';
import { OrganizationService } from '@/lib/database/organization';
import { UserRole } from '@/types/organization';

/**
 * PUT /api/organizations/:orgId/members/:userId
 * Update a member's role (super_admin only)
 */
export async function PUT(
  request: Request,
  { params }: { params: { orgId: string; userId: string } }
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

    const { orgId, userId } = params;

    // Check user role (super_admin only)
    const userRole = await OrganizationService.getUserRole(user.id, orgId);
    if (userRole !== UserRole.SUPER_ADMIN) {
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
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role is required'
        },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role. Must be user, admin, or super_admin'
        },
        { status: 400 }
      );
    }

    // Prevent user from demoting themselves
    if (userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot change your own role'
        },
        { status: 400 }
      );
    }

    // Update member role
    await OrganizationService.updateMemberRole(orgId, userId, role);

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    console.error('Update member role error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update member role'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/:orgId/members/:userId
 * Remove a member from the organization (super_admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { orgId: string; userId: string } }
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

    const { orgId, userId } = params;

    // Check user role (super_admin only)
    const userRole = await OrganizationService.getUserRole(user.id, orgId);
    if (userRole !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Super admin role required.'
        },
        { status: 403 }
      );
    }

    // Prevent user from removing themselves
    if (userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot remove yourself from the organization'
        },
        { status: 400 }
      );
    }

    // Remove member
    await OrganizationService.removeMember(orgId, userId);

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove member'
      },
      { status: 500 }
    );
  }
}
