import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import { OrganizationService } from '@/lib/database/organization'

/**
 * GET /api/users/me
 *
 * Returns the current authenticated user's information including organization context.
 * Uses Clerk session authentication (no Authorization header required).
 */
export async function GET() {
  try {
    // Get authenticated user via Clerk
    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please sign in.'
        },
        { status: 401 }
      )
    }

    // Get user's organization context
    // Gracefully handle case where organization tables don't exist yet
    let organizationContext = null
    try {
      organizationContext = await OrganizationService.getUserOrganizations(user.id)
    } catch (error) {
      console.warn('Organization tables may not exist yet. Run migration: npm run db:migrate:organizations', error)
      // Continue without organization context
    }

    // Return user info (matching Zing's UserInfo interface)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at.toISOString(),
        // Optional fields
        organizationId: organizationContext?.active_organization_id || undefined,
        role: user.email === 'david@zashboard.ai' ? 'admin' : 'user',
        organization_context: organizationContext || undefined
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get user info error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// Other methods not allowed
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve user info.'
    },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve user info.'
    },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve user info.'
    },
    { status: 405 }
  )
}
