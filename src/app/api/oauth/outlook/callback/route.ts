import { NextRequest, NextResponse } from 'next/server'
import { ConfidentialClientApplication } from '@azure/msal-node'
import { generateToken } from '@/lib/auth'

/**
 * Microsoft/Outlook OAuth Callback Endpoint
 *
 * Handles OAuth callback from Microsoft, exchanges code for tokens,
 * and redirects back to Zing Browser with JWT
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent('Missing authorization code or state')}`
      )
    }

    // Decode and validate state
    let stateData: { timestamp: number; redirectUri: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())

      // Check state freshness (15 minutes)
      if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
        throw new Error('State expired')
      }
    } catch (error) {
      console.error('Invalid state parameter:', error)
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent('Invalid or expired state')}`
      )
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Microsoft OAuth credentials not configured')
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent('OAuth not configured')}`
      )
    }

    // Initialize MSAL confidential client
    const msalConfig = {
      auth: {
        clientId,
        clientSecret,
        authority: 'https://login.microsoftonline.com/common'
      }
    }

    const pca = new ConfidentialClientApplication(msalConfig)

    // Exchange authorization code for tokens
    const tokenRequest = {
      code,
      scopes: ['openid', 'email', 'profile', 'User.Read'],
      redirectUri: `${request.nextUrl.origin}/api/oauth/outlook/callback`
    }

    const response = await pca.acquireTokenByCode(tokenRequest)

    if (!response || !response.account) {
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent('Failed to get user info')}`
      )
    }

    const { homeAccountId, username, name } = response.account

    // TODO: Store user in database if not exists
    // For now, use in-memory temporary user with microsoft: prefix
    const userId = `microsoft:${homeAccountId}`

    // Generate JWT token (7 days expiry)
    const jwtToken = generateToken(userId)

    // Build user info for response
    const userInfo = {
      id: userId,
      email: username || '',
      name: name || 'Microsoft User',
      provider: 'microsoft'
    }

    // Redirect back to Zing with JWT token
    const redirectUrl = new URL(stateData.redirectUri)
    redirectUrl.searchParams.append('token', jwtToken)
    redirectUrl.searchParams.append('user', Buffer.from(JSON.stringify(userInfo)).toString('base64'))

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('Microsoft OAuth callback error:', error)
    return NextResponse.redirect(
      `zing://oauth/callback?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed'
      )}`
    )
  }
}

// POST method not allowed
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. This endpoint handles GET callbacks only.'
    },
    { status: 405 }
  )
}
