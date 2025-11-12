import { NextRequest, NextResponse } from 'next/server'

/**
 * Microsoft/Outlook OAuth Initiation Endpoint
 *
 * Generates Microsoft OAuth URL for Zing Browser to redirect users to
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

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Microsoft OAuth credentials not configured')
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

    // Build Microsoft OAuth URL
    const microsoftAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    microsoftAuthUrl.searchParams.append('client_id', clientId)
    microsoftAuthUrl.searchParams.append('redirect_uri', `${request.nextUrl.origin}/api/oauth/outlook/callback`)
    microsoftAuthUrl.searchParams.append('response_type', 'code')
    microsoftAuthUrl.searchParams.append('scope', 'openid email profile User.Read')
    microsoftAuthUrl.searchParams.append('state', state)
    microsoftAuthUrl.searchParams.append('response_mode', 'query')
    microsoftAuthUrl.searchParams.append('prompt', 'consent')

    return NextResponse.json({
      success: true,
      url: microsoftAuthUrl.toString(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Microsoft OAuth initiation error:', error)
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
