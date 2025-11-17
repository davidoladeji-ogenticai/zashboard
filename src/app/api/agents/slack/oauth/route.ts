import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      console.error('[Slack OAuth] Error from Slack:', error)
      return new NextResponse(
        `<html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'slack-oauth-error',
                error: '${error}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!code || !state) {
      return new NextResponse(
        `<html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'slack-oauth-error',
                error: 'Missing authorization code or state'
              }, '*');
              window.close();
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Decode state
    const stateData = JSON.parse(atob(state))
    const { deploymentId, organizationId } = stateData

    console.log(`[Slack OAuth] Processing OAuth for deployment: ${deploymentId}`)

    // Exchange code for token
    const slackClientId = process.env.SLACK_CLIENT_ID
    const slackClientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/agents/slack/oauth`

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: slackClientId!,
        client_secret: slackClientSecret!,
        code,
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('[Slack OAuth] Token exchange failed:', tokenData.error)
      return new NextResponse(
        `<html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'slack-oauth-error',
                error: 'Failed to connect to Slack: ${tokenData.error}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const {
      access_token: botToken,
      team: { id: slackTeamId, name: slackTeamName },
      bot_user_id: botUserId,
      scope
    } = tokenData

    console.log(`[Slack OAuth] Connected to workspace: ${slackTeamName} (${slackTeamId})`)

    // Store in agent_slack_workspaces
    await dbQuery(
      `INSERT INTO agent_slack_workspaces (
        id, agent_deployment_id, slack_team_id, slack_team_name,
        bot_token, bot_user_id, scopes, installed_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true)
      ON CONFLICT (agent_deployment_id)
      DO UPDATE SET
        slack_team_id = EXCLUDED.slack_team_id,
        slack_team_name = EXCLUDED.slack_team_name,
        bot_token = EXCLUDED.bot_token,
        bot_user_id = EXCLUDED.bot_user_id,
        scopes = EXCLUDED.scopes,
        is_active = true`,
      [
        `slack_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        deploymentId,
        slackTeamId,
        slackTeamName,
        botToken,
        botUserId,
        scope.split(',')
      ]
    )

    console.log(`[Slack OAuth] Workspace connection saved for deployment: ${deploymentId}`)

    // Return success message to parent window
    return new NextResponse(
      `<html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'slack-oauth-success',
              slackTeamId: '${slackTeamId}',
              slackTeamName: '${slackTeamName}',
              botToken: '${botToken}'
            }, '*');
            window.close();
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('[Slack OAuth] Error:', error)
    return new NextResponse(
      `<html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'slack-oauth-error',
              error: 'An unexpected error occurred'
            }, '*');
            window.close();
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
