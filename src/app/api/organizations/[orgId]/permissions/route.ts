import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  getOrgPermissions,
  createOrgPermission,
  userHasOrgPermission
} from '@/lib/database/organization-rbac'

interface RouteContext {
  params: Promise<{
    orgId: string
  }>
}

// Get all permissions in an organization
export async function GET(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId } = await context.params

    // Check if user has permission to view permissions in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:read'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view organization permissions' },
        { status: 403 }
      )
    }

    const permissions = await getOrgPermissions(orgId)

    return NextResponse.json({
      success: true,
      data: permissions
    })
  } catch (error) {
    console.error('Error getting organization permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new custom permission in organization
export async function POST(request: Request, context: RouteContext) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId } = await context.params

    // Check if user has permission to create permissions in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:write'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create organization permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, displayName, description, category, resource, action } = body

    if (!name || !displayName || !category || !resource || !action) {
      return NextResponse.json(
        { success: false, error: 'name, displayName, category, resource, and action are required' },
        { status: 400 }
      )
    }

    const result = await createOrgPermission(
      orgId,
      name,
      displayName,
      description || '',
      category,
      resource,
      action,
      currentUser.id
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
        data: result.permission,
        message: 'Organization permission created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating organization permission:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
