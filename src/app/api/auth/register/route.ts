import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate request body
    if (!email || !password || !name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email, password, and name are required' 
        }, 
        { status: 400 }
      )
    }

    // Create user
    const result = await createUser(email, password, name)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        }, 
        { status: 400 }
      )
    }

    // Return success response with token and user data
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      token: result.token,
      user: result.user,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Registration API error:', error)
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
      error: 'Method not allowed. Use POST to register a user.' 
    }, 
    { status: 405 }
  )
}