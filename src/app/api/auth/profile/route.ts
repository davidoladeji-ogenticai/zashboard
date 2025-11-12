import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please sign in.'
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