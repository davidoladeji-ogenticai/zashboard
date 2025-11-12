/**
 * Organization Members API Routes
 *
 * GET  /api/organizations/:orgId/members - Get organization members
 * POST /api/organizations/:orgId/members - Add member (super_admin only)
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-clerk';
import { OrganizationService } from '@/lib/database/organization';
import { UserRole } from '@/types/organization';

/**
 * GET /api/organizations/:orgId/members
 * Get all organization members (admin or super_admin only)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
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

    const { orgId } = await params;

    // Check user role
    const userRole = await OrganizationService.getUserRole(user.id, orgId);
    if (!userRole || (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Admin or super_admin role required.'
        },
        { status: 403 }
      );
    }

    // Get members
    const members = await OrganizationService.getMembers(orgId);

    return NextResponse.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve members'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/:orgId/members
 * Add a new member to the organization (super_admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
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

    const { orgId } = await params;

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
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and role are required'
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

    // Add member
    const membership = await OrganizationService.addMember(orgId, email, role);

    return NextResponse.json({
      success: true,
      message: 'Member added successfully',
      data: membership
    });
  } catch (error) {
    console.error('Add member error:', error);

    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found with this email'
          },
          { status: 404 }
        );
      }

      if (error.message.includes('already a member')) {
        return NextResponse.json(
          {
            success: false,
            error: 'User is already a member of this organization'
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add member'
      },
      { status: 500 }
    );
  }
}
