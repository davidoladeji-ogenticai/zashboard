import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized. Please provide a valid token.' 
        }, 
        { status: 401 }
      )
    }

    // Return user profile
    return NextResponse.json({
      success: true,
      user,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Profile API error:', error)
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