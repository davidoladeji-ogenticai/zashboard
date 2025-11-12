import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import { getAllPermissions, createPermission, userHasPermission } from '@/lib/database/rbac'

// Get all permissions
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to view permissions
    const hasPermission = await userHasPermission(currentUser.id, 'permissions:read')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const permissions = await getAllPermissions()

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = []
      }
      acc[perm.category].push(perm)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      success: true,
      permissions,
      grouped: groupedPermissions
    })
  } catch (error) {
    console.error('Error getting permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new custom permission
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to create permissions
    // Note: We're checking for permissions:manage since permissions:write doesn't exist by default
    const hasPermission = await userHasPermission(currentUser.id, 'permissions:manage')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, displayName, description, category, resource, action } = body

    // Validate required fields
    if (!name || !displayName || !category || !resource || !action) {
      return NextResponse.json(
        { success: false, error: 'name, displayName, category, resource, and action are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['users', 'analytics', 'roles', 'permissions', 'system', 'settings']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['read', 'write', 'delete', 'manage', 'export', 'assign']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await createPermission(
      name,
      displayName,
      description || '',
      category,
      resource,
      action
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      permission: result.permission,
      message: 'Permission created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating permission:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
