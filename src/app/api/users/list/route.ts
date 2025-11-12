import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, getAllUsers } from '@/lib/auth'

/**
 * GET /api/users/list
 *
 * Returns list of all registered users (admin only).
 * Requires Bearer token in Authorization header.
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authHeader = request.headers.get('Authorization')
    const user = await validateAuthHeader(authHeader)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.'
        },
        { status: 401 }
      )
    }

    // Get all users
    const users = await getAllUsers()

    // Map database fields to camelCase for frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at.toISOString(),
      lastLogin: user.last_login?.toISOString() || null
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length,
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (error) {
    console.error('List users error:', error)
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
      error: 'Method not allowed. Use GET to list users.'
    },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to list users.'
    },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to list users.'
    },
    { status: 405 }
  )
}
