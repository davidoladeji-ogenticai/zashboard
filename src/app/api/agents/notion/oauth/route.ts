import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

/**
 * Notion OAuth Callback Handler
 * Handles the OAuth callback from Notion and stores the access token
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }

    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Contains deploymentId
    const error = searchParams.get('error')

    if (error) {
      console.error('[Notion OAuth] Error from Notion:', error)
      return NextResponse.redirect(
        new URL(`/error?message=Notion authorization failed: ${error}`, req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/error?message=Missing authorization code or state', req.url)
      )
    }

    const deploymentId = state

    // Verify user has access to this deployment
    const deploymentResult = await dbQuery(
      `SELECT ad.*, ad.organization_id
       FROM agent_deployments ad
       JOIN organization_memberships om ON ad.organization_id = om.organization_id
       WHERE ad.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [deploymentId, userId]
    )

    if (deploymentResult.rows.length === 0) {
      return NextResponse.redirect(
        new URL('/error?message=Unauthorized access to deployment', req.url)
      )
    }

    const deployment = deploymentResult.rows[0]

    // Exchange code for access token
    const notionClientId = process.env.NOTION_CLIENT_ID
    const notionClientSecret = process.env.NOTION_CLIENT_SECRET

    // Dynamically build redirect URI based on the request origin
    const origin = req.nextUrl.origin
    const redirectUri = `${origin}/api/agents/notion/oauth`

    if (!notionClientId || !notionClientSecret) {
      console.error('[Notion OAuth] Missing Notion credentials')
      return NextResponse.redirect(
        new URL('/error?message=Notion integration not configured', req.url)
      )
    }

    console.log('[Notion OAuth] Exchanging code for token with redirect_uri:', redirectUri)

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${notionClientId}:${notionClientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Notion OAuth] Token exchange failed:', errorText)
      return NextResponse.redirect(
        new URL('/error?message=Failed to exchange authorization code', req.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Store Notion connection in database
    const connectionId = `notion_conn_${Date.now()}_${Math.random().toString(36).substring(7)}`

    await dbQuery(
      `INSERT INTO agent_notion_connections (
        id, agent_deployment_id, organization_id, notion_workspace_id,
        notion_workspace_name, access_token, bot_id, created_at, created_by, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
      ON CONFLICT (agent_deployment_id, notion_workspace_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        bot_id = EXCLUDED.bot_id,
        updated_at = NOW()`,
      [
        connectionId,
        deploymentId,
        deployment.organization_id,
        tokenData.workspace_id || 'unknown',
        tokenData.workspace_name || 'Notion Workspace',
        tokenData.access_token,
        tokenData.bot_id,
        userId,
      ]
    )

    console.log('[Notion OAuth] Successfully connected Notion workspace:', tokenData.workspace_name)

    // Redirect to knowledge base page
    return NextResponse.redirect(
      new URL(`/organizations/${deployment.organization_id}/agents/${deploymentId}/knowledge?notion_connected=true`, req.url)
    )
  } catch (error) {
    console.error('[Notion OAuth] Error:', error)
    return NextResponse.redirect(
      new URL('/error?message=Failed to complete Notion authorization', req.url)
    )
  }
}
