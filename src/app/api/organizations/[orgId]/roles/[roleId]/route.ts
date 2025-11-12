import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  getOrgRoleWithPermissions,
  updateOrgRole,
  deleteOrgRole,
  userHasOrgPermission
} from '@/lib/database/organization-rbac'

interface RouteContext {
  params: Promise<{
    orgId: string
    roleId: string
  }>
}

// Get a specific role with its permissions
export async function GET(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, roleId } = await context.params

    // Check if user has permission to view roles in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:read'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const role = await getOrgRoleWithPermissions(roleId)

    if (!role || role.organization_id !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: role
    })
  } catch (error) {
    console.error('Error getting organization role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a role (display name and description only)
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
        { success: false, error: 'Insufficient permissions to update organization roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { displayName, description } = body

    if (!displayName) {
      return NextResponse.json(
        { success: false, error: 'displayName is required' },
        { status: 400 }
      )
    }

    const result = await updateOrgRole(roleId, displayName, description || '')

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.role,
      message: 'Organization role updated successfully'
    })
  } catch (error) {
    console.error('Error updating organization role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a custom role
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId, roleId } = await context.params

    // Check if user has permission to delete roles in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:delete'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete organization roles' },
        { status: 403 }
      )
    }

    const result = await deleteOrgRole(roleId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Organization role deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting organization role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
