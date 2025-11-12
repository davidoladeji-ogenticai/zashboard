import { NextRequest, NextResponse } from 'next/server'

/**
 * Google OAuth Initiation Endpoint
 *
 * Generates Google OAuth URL for Zing Browser to redirect users to
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const redirectUri = searchParams.get('redirect_uri')

    if (!redirectUri) {
      return NextResponse.json(
        {
          success: false,
          error: 'redirect_uri parameter is required'
        },
        { status: 400 }
      )
    }

    // Validate redirect URI (must be zing:// protocol)
    if (!redirectUri.startsWith('zing://')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid redirect_uri - must use zing:// protocol'
        },
        { status: 400 }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'OAuth not configured on server'
        },
        { status: 500 }
      )
    }

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      redirectUri
    })).toString('base64')

    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.append('client_id', clientId)
    googleAuthUrl.searchParams.append('redirect_uri', `${request.nextUrl.origin}/api/oauth/google/callback`)
    googleAuthUrl.searchParams.append('response_type', 'code')
    googleAuthUrl.searchParams.append('scope', 'openid email profile')
    googleAuthUrl.searchParams.append('state', state)
    googleAuthUrl.searchParams.append('access_type', 'offline')
    googleAuthUrl.searchParams.append('prompt', 'consent')

    return NextResponse.json({
      success: true,
      url: googleAuthUrl.toString(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST method not allowed
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to initiate OAuth.'
    },
    { status: 405 }
  )
}
