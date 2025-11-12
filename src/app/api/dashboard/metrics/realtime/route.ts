import { NextRequest, NextResponse } from 'next/server'
import { RealtimeMetrics } from '@/types/analytics'
import { analyticsStore } from '@/lib/analytics-store'
import { getAuthenticatedUser } from '@/lib/auth-clerk'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication via Clerk
    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }
    // Get real-time metrics from stored events
    const realtimeMetrics: RealtimeMetrics = analyticsStore.getRealtimeMetrics()

    return NextResponse.json(realtimeMetrics)

  } catch (error) {
    console.error('Realtime metrics error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch realtime metrics',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
