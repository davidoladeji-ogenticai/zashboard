import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

interface RouteContext {
  params: Promise<{ orgId: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await params

    // Verify user has access to this organization
    const membershipResult = await dbQuery(
      `SELECT om.* FROM organization_memberships om
       WHERE om.user_id = $1 AND om.organization_id = $2
       LIMIT 1`,
      [userId, orgId]
    )

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch all agent deployments for this organization
    const agentsResult = await dbQuery(
      `SELECT ad.id, ad.agent_type, ad.status, ad.deployed_at, ad.created_at,
              asw.slack_team_name, asw.slack_team_id
       FROM agent_deployments ad
       LEFT JOIN agent_slack_workspaces asw ON ad.id = asw.agent_deployment_id
       WHERE ad.organization_id = $1
       ORDER BY ad.created_at DESC`,
      [orgId]
    )

    return NextResponse.json({
      success: true,
      agents: agentsResult.rows
    })
  } catch (error) {
    console.error('[Organizations Agents API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
