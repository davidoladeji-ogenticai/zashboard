import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  updateOrgRolePermissions,
  userHasOrgPermission
} from '@/lib/database/organization-rbac'

interface RouteContext {
  params: Promise<{
    orgId: string
    roleId: string
  }>
}

// Update permissions for a role
export async function PUT(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, roleId } = await context.params

    // Check if user has permission to manage roles in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:write'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update role permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { permissionIds } = body

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { success: false, error: 'permissionIds must be an array' },
        { status: 400 }
      )
    }

    const result = await updateOrgRolePermissions(roleId, permissionIds, currentUser.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully'
    })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
