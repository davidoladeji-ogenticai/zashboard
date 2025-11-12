import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  removeOrgRoleFromUser,
  userHasOrgPermission,
  canAssignOrgRole
} from '@/lib/database/organization-rbac'

interface RouteContext {
  params: Promise<{
    orgId: string
    userId: string
    roleId: string
  }>
}

// Remove a role from a user
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, userId, roleId } = await context.params

    // Check if user has permission to manage members in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:members:write'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to remove roles' },
        { status: 403 }
      )
    }

    // Check if current user can manage this specific role
    const canManage = await canAssignOrgRole(currentUser.id, orgId, roleId)

    if (!canManage) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only remove roles with a level lower than your highest role'
        },
        { status: 403 }
      )
    }

    const result = await removeOrgRoleFromUser(userId, orgId, roleId)

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
