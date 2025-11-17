import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deploymentId } = await params
    const body = await req.json()
    const { systemPrompt, responseTone, enableEmoji, escalationChannel } = body

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

    // Update configuration
    await dbQuery(
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
        systemPrompt || null,
        responseTone || 'professional',
        enableEmoji !== undefined ? enableEmoji : true,
        escalationChannel || null
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('[Settings Update] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
