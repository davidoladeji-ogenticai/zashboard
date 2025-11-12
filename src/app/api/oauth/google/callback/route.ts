import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { generateToken } from '@/lib/auth'

/**
 * Google OAuth Callback Endpoint
 *
 * Handles OAuth callback from Google, exchanges code for tokens,
 * and redirects back to Zing Browser with JWT
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent(error)}`
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

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured')
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent('OAuth not configured')}`
      )
    }

    // Exchange authorization code for tokens
    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      `${request.nextUrl.origin}/api/oauth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info from Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: clientId
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return NextResponse.redirect(
        `zing://oauth/callback?error=${encodeURIComponent('Failed to get user info')}`
      )
    }

    const { sub: googleId, email, name, picture } = payload

    // TODO: Store user in database if not exists
    // For now, use in-memory temporary user with google: prefix
    const userId = `google:${googleId}`

    // Generate JWT token (7 days expiry)
    const jwtToken = generateToken(userId)

    // Build user info for response
    const userInfo = {
      id: userId,
      email: email || '',
      name: name || 'Google User',
      avatar: picture,
      provider: 'google'
    }

    // Redirect back to Zing with JWT token
    const redirectUrl = new URL(stateData.redirectUri)
    redirectUrl.searchParams.append('token', jwtToken)
    redirectUrl.searchParams.append('user', Buffer.from(JSON.stringify(userInfo)).toString('base64'))

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('Google OAuth callback error:', error)
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
