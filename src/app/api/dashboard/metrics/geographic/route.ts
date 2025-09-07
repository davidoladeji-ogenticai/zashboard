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

    // Get real geographic metrics from stored events
    const geographicMetrics = analyticsStore.getGeographicMetrics()

    return NextResponse.json({
      regions: geographicMetrics,
      total_countries: geographicMetrics.length,
      last_updated: new Date().toISOString()
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