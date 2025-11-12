/**
 * Organization Detail API Routes
 *
 * GET /api/organizations/:orgId - Get organization details
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-clerk';
import { OrganizationService } from '@/lib/database/organization';

/**
 * GET /api/organizations/:orgId
 * Get organization details (must be a member)
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

    // Check if user is member
    const isMember = await OrganizationService.isUserMember(user.id, orgId);
    if (!isMember) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied'
        },
        { status: 403 }
      );
    }

    // Get organization details
    const organization = await OrganizationService.getById(orgId);

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Get organization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve organization'
      },
      { status: 500 }
    );
  }
}
