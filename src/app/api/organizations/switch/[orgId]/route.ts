/**
 * Organization Switching API
 *
 * POST /api/organizations/switch/:orgId - Set active organization
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-clerk';
import { OrganizationService } from '@/lib/database/organization';

/**
 * POST /api/organizations/switch/:orgId
 * Set the active organization for the user
 */
export async function POST(
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

    // Set active organization (will verify membership)
    await OrganizationService.setActiveOrganization(user.id, orgId);

    // Get updated organization context
    const orgContext = await OrganizationService.getUserOrganizations(user.id);

    return NextResponse.json({
      success: true,
      message: 'Organization switched successfully',
      data: orgContext
    });
  } catch (error) {
    console.error('Switch organization error:', error);

    if (error instanceof Error && error.message.includes('not a member')) {
      return NextResponse.json(
        {
          success: false,
          error: 'You are not a member of this organization'
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to switch organization'
      },
      { status: 500 }
    );
  }
}
