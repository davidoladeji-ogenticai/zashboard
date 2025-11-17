import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deploymentId } = await params
    const body = await req.json()
    const { slackConnection, knowledgeBase, configuration } = body

    console.log(`[Deployment Activate] Activating deployment: ${deploymentId}`)

    // Verify deployment belongs to user's organization
    const deploymentResult = await dbQuery(
      `SELECT ad.*, om.user_id
       FROM agent_deployments ad
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

    // Update agent_configurations
    const configResult = await dbQuery(
      `INSERT INTO agent_configurations (
        id, agent_deployment_id, system_prompt, response_tone, enable_emoji,
        escalation_channel, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (agent_deployment_id)
      DO UPDATE SET
        system_prompt = EXCLUDED.system_prompt,
        response_tone = EXCLUDED.response_tone,
        enable_emoji = EXCLUDED.enable_emoji,
        escalation_channel = EXCLUDED.escalation_channel,
        updated_at = NOW()
      RETURNING *`,
      [
        `config_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        deploymentId,
        configuration.systemPrompt || null,
        configuration.responseTone || 'professional',
        configuration.enableEmoji !== undefined ? configuration.enableEmoji : true,
        configuration.escalationChannel || null
      ]
    )

    console.log(`[Deployment Activate] Configuration saved: ${configResult.rows[0].id}`)

    // Update deployment status and config
    const updatedConfig = {
      slackTeamId: slackConnection?.slackTeamId,
      slackTeamName: slackConnection?.slackTeamName,
      documentCount: knowledgeBase?.documentCount || 0,
      knowledgeSources: knowledgeBase?.sources || []
    }

    await dbQuery(
      `UPDATE agent_deployments
       SET status = $1, config = $2, deployed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      ['active', JSON.stringify(updatedConfig), deploymentId]
    )

    console.log(`[Deployment Activate] Deployment activated: ${deploymentId}`)

    // Notify Ogents Market
    try {
      const ogentsMarketUrl = process.env.NEXT_PUBLIC_OGENTS_MARKET_URL || 'http://localhost:3002'
      const response = await fetch(
        `${ogentsMarketUrl}/api/employed-agents/${deployment.employed_agent_id}/deployed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OGENTS_INTERNAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            deploymentId,
            status: 'active',
            slackTeamId: slackConnection?.slackTeamId,
            slackTeamName: slackConnection?.slackTeamName,
            deployedAt: new Date().toISOString()
          })
        }
      )

      if (!response.ok) {
        console.error('[Deployment Activate] Failed to notify Ogents Market:', await response.text())
      } else {
        console.log('[Deployment Activate] Notified Ogents Market successfully')
      }
    } catch (error) {
      console.error('[Deployment Activate] Error notifying Ogents Market:', error)
      // Don't fail the activation if notification fails
    }

    return NextResponse.json({
      success: true,
      deploymentId,
      status: 'active'
    })
  } catch (error) {
    console.error('[Deployment Activate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to activate deployment' },
      { status: 500 }
    )
  }
}
