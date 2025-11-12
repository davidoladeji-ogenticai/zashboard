/**
 * Organization API Routes
 *
 * GET  /api/organizations - Get user's organizations with full context
 * POST /api/organizations - Create new organization (future)
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-clerk';
import { OrganizationService } from '@/lib/database/organization';

console.log('[API Organizations] Route loaded and initialized');

/**
 * GET /api/organizations
 * Returns all organizations the user belongs to with full context
 */
export async function GET() {
  console.log('[API Organizations] GET request received');
  try {
    // Authenticate user via Clerk
    console.log('[API Organizations] Authenticating user...');
    const user = await getAuthenticatedUser();
    console.log('[API Organizations] User authenticated:', user?.id);

    if (!user) {
      console.log('[API Organizations] No user found - returning 401');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get user's organizations
    console.log('[API Organizations] Fetching organizations for user:', user.id);
    const orgContext = await OrganizationService.getUserOrganizations(user.id);
    console.log('[API Organizations] Organizations fetched successfully');

    return NextResponse.json({
      success: true,
      data: orgContext
    });
  } catch (error) {
    console.error('❌ [API Organizations] ERROR:', error);
    console.error('❌ [API Organizations] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [API Organizations] Error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve organizations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
