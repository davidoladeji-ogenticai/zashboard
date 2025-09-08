import { NextRequest, NextResponse } from 'next/server'
import { analyticsStore } from '@/lib/analytics-store'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ZING_ANALYTICS_KEY || 'demo-key'
    
    if (!authHeader || authHeader.replace('Bearer ', '') !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }

    // Get enhanced geographic metrics from stored events
    const geographicMetrics = analyticsStore.getEnhancedGeographicMetrics()

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: geographicMetrics,
      // Legacy compatibility
      regions: geographicMetrics.countries_data,
      total_countries: geographicMetrics.summary.total_countries,
      // Additional metadata for the frontend
      metadata: {
        endpoint: 'geographic',
        version: '1.0.0',
        cache_duration: 600 // 10 minutes
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
        'Content-Type': 'application/json',
        'X-API-Version': '1.0.0'
      }
    })

  } catch (error) {
    console.error('Geographic metrics error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch geographic metrics',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}