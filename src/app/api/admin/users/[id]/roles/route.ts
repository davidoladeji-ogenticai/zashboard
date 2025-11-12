import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  userHasPermission
} from '@/lib/database/rbac'

// Get user's roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const roles = await getUserRoles(id)

    return NextResponse.json({
      success: true,
      roles
    })
  } catch (error) {
    console.error('Error getting user roles:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to assign roles
    const hasPermission = await userHasPermission(currentUser.id, 'roles:assign')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to assign roles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { roleId, expiresAt } = body

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: 'roleId is required' },
        { status: 400 }
      )
    }

    const result = await assignRoleToUser(
      id,
      roleId,
      currentUser.id,
      expiresAt ? new Date(expiresAt) : undefined
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role assigned successfully'
    })
  } catch (error) {
    console.error('Error assigning role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to manage roles
    const hasPermission = await userHasPermission(currentUser.id, 'roles:assign')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to remove roles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: 'roleId parameter is required' },
        { status: 400 }
      )
    }

    const result = await removeRoleFromUser(id, roleId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role removed successfully'
    })
  } catch (error) {
    console.error('Error removing role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
