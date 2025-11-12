import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import { getAllRoles, createRole, userHasPermission } from '@/lib/database/rbac'

// Get all roles
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to view roles
    const hasPermission = await userHasPermission(currentUser.id, 'roles:read')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const roles = await getAllRoles()

    return NextResponse.json({
      success: true,
      roles
    })
  } catch (error) {
    console.error('Error getting roles:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new custom role
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to create roles
    const hasPermission = await userHasPermission(currentUser.id, 'roles:write')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, displayName, description, level } = body

    if (!name || !displayName || !level) {
      return NextResponse.json(
        { success: false, error: 'name, displayName, and level are required' },
        { status: 400 }
      )
    }

    const result = await createRole(name, displayName, description, level, currentUser.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      role: result.role,
      message: 'Role created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
