import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  getUserOrgRoles,
  assignOrgRoleToUser,
  removeOrgRoleFromUser,
  userHasOrgPermission,
  canAssignOrgRole
} from '@/lib/database/organization-rbac'

interface RouteContext {
  params: Promise<{
    orgId: string
    userId: string
  }>
}

// Get roles for a specific user in the organization
export async function GET(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, userId } = await context.params

    // Check if user has permission to view members in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:members:read'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const roles = await getUserOrgRoles(userId, orgId)

    return NextResponse.json({
      success: true,
      data: roles
    })
  } catch (error) {
    console.error('Error getting user org roles:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Assign a role to a user
export async function POST(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, userId } = await context.params

    // Check if user has permission to manage members in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:members:write'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to assign roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { roleId, expiresAt } = body

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: 'roleId is required' },
        { status: 400 }
      )
    }

    // Check if current user can assign this specific role
    const canAssign = await canAssignOrgRole(currentUser.id, orgId, roleId)

    if (!canAssign) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only assign roles with a level lower than your highest role'
        },
        { status: 403 }
      )
    }

    const result = await assignOrgRoleToUser(
      userId,
      orgId,
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

    return NextResponse.json(
      {
        success: true,
        message: 'Role assigned successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error assigning role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
