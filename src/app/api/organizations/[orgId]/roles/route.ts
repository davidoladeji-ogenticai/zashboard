import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import {
  getOrgRoles,
  createOrgRole,
  userHasOrgPermission
} from '@/lib/database/organization-rbac'

interface RouteContext {
  params: Promise<{
    orgId: string
  }>
}

// Get all roles in an organization
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

    // Check if user has permission to view roles in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:read'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view organization roles' },
        { status: 403 }
      )
    }

    const roles = await getOrgRoles(orgId)

    return NextResponse.json({
      success: true,
      data: roles
    })
  } catch (error) {
    console.error('Error getting organization roles:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new custom role in organization
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

    // Check if user has permission to create roles in this org
    const hasPermission = await userHasOrgPermission(
      currentUser.id,
      orgId,
      'org:roles:write'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create organization roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, displayName, description, level } = body

    if (!name || !displayName || level === undefined) {
      return NextResponse.json(
        { success: false, error: 'name, displayName, and level are required' },
        { status: 400 }
      )
    }

    const result = await createOrgRole(
      orgId,
      name,
      displayName,
      description || '',
      level,
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
        data: result.role,
        message: 'Organization role created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating organization role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
