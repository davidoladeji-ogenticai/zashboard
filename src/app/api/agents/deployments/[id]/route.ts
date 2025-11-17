import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deploymentId } = await params

    // Fetch deployment with organization membership verification
    const deploymentResult = await dbQuery(
      `SELECT ad.*, o.name as organization_name
       FROM agent_deployments ad
       JOIN organizations o ON ad.organization_id = o.id
       JOIN organization_memberships om ON ad.organization_id = om.organization_id
       WHERE ad.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [deploymentId, userId]
    )

    if (deploymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Deployment not found or access denied' },
        { status: 404 }
      )
    }

    const deployment = deploymentResult.rows[0]

    // Fetch Slack workspace connection
    const slackResult = await dbQuery(
      `SELECT slack_team_id, slack_team_name, bot_user_id, is_active
       FROM agent_slack_workspaces
       WHERE agent_deployment_id = $1
       LIMIT 1`,
      [deploymentId]
    )

    const slackConnection = slackResult.rows.length > 0 ? slackResult.rows[0] : null

    // Fetch configuration
    const configResult = await dbQuery(
      `SELECT system_prompt, response_tone, enable_emoji, escalation_channel
       FROM agent_configurations
       WHERE agent_deployment_id = $1
       LIMIT 1`,
      [deploymentId]
    )

    const configuration = configResult.rows.length > 0 ? configResult.rows[0] : null

    // Fetch knowledge base stats
    const kbStatsResult = await dbQuery(
      `SELECT COUNT(*) as document_count
       FROM agent_knowledge_base
       WHERE agent_deployment_id = $1`,
      [deploymentId]
    )

    const documentCount = parseInt(kbStatsResult.rows[0]?.document_count || '0')

    return NextResponse.json({
      id: deployment.id,
      organizationId: deployment.organization_id,
      organizationName: deployment.organization_name,
      employedAgentId: deployment.employed_agent_id,
      agentType: deployment.agent_type,
      agentName: 'Slack Knowledge Agent', // In production, fetch from Ogents Market
      status: deployment.status,
      config: deployment.config,
      deployedAt: deployment.deployed_at,
      createdAt: deployment.created_at,
      slackConnection,
      configuration,
      documentCount
    })
  } catch (error) {
    console.error('[Deployment Get] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deployment' },
      { status: 500 }
    )
  }
}
