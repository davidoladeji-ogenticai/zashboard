import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import { updateRolePermissions, userHasPermission } from '@/lib/database/rbac'

// Update role permissions
export async function PUT(
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

    // Check if user has permission to manage permissions
    const hasPermission = await userHasPermission(currentUser.id, 'permissions:manage')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to manage permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { permissionIds } = body

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { success: false, error: 'permissionIds must be an array' },
        { status: 400 }
      )
    }

    const result = await updateRolePermissions(id, permissionIds, currentUser.id)

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
