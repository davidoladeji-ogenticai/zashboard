import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import { userHasPermission, getUserRoles } from '@/lib/database/rbac'
import { query } from '@/lib/database'

// Get all users with roles
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to view users
    const hasPermission = await userHasPermission(currentUser.id, 'users:read')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get all users
    const result = await query(`
      SELECT
        id,
        email,
        name,
        registration_source,
        created_at,
        last_login,
        is_active
      FROM users
      ORDER BY created_at DESC
    `)

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      result.rows.map(async (user) => {
        const roles = await getUserRoles(user.id)
        return {
          ...user,
          roles,
          createdAt: user.created_at.toISOString(),
          lastLogin: user.last_login?.toISOString() || null
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithRoles,
      count: usersWithRoles.length
    })
  } catch (error) {
    console.error('Error getting users:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
