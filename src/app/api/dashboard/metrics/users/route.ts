import { NextRequest, NextResponse } from 'next/server'
import { analyticsStore } from '@/lib/analytics-store'

// GET /api/dashboard/metrics/users
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    // For now, accept demo-key for backwards compatibility
    // TODO: Replace with proper JWT authentication
    if (!authHeader || (!authHeader.includes('demo-key') && !authHeader.startsWith('Bearer '))) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    // Get comprehensive user metrics from analytics store
    const userMetrics = analyticsStore.getUserMetrics()
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: userMetrics,
      // Additional metadata for the frontend
      metadata: {
        endpoint: 'users',
        version: '1.0.0',
        cache_duration: 300 // 5 minutes
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json',
        'X-API-Version': '1.0.0'
      }
    })

  } catch (error) {
    console.error('Error fetching user metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch user metrics', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}