import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate request body
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and password are required' 
        }, 
        { status: 400 }
      )
    }

    // Authenticate user
    const result = await authenticateUser(email, password)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        }, 
        { status: 401 }
      )
    }

    // Set HTTP-only cookie for security
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
      timestamp: new Date().toISOString()
    })

    // Set secure cookie
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Login API error:', error)
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

// GET method not allowed
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to login.' 
    }, 
    { status: 405 }
  )
}