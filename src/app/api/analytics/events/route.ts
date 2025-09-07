import { NextRequest, NextResponse } from 'next/server'
import { EventPayload } from '@/types/analytics'

// In-memory storage for demo (replace with database in production)
const events: EventPayload[] = []

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ZING_ANALYTICS_KEY || 'demo-key'
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }

    // Parse and validate event data
    const eventData: EventPayload = await request.json()
    
    if (!eventData.event || !eventData.properties) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          message: 'Missing required fields: event, properties',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    if (!eventData.properties.user_id) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Missing required field: user_id',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Store event (in production, save to database)
    const event: EventPayload = {
      ...eventData,
      properties: {
        ...eventData.properties,
        received_at: Date.now(),
        ip_address: request.ip || 'unknown'
      }
    }

    events.push(event)

    // Log event for debugging
    console.log('Analytics event received:', {
      event: event.event,
      user_id: event.properties.user_id,
      app_version: event.properties.app_version,
      timestamp: event.properties.timestamp
    })

    return NextResponse.json({
      success: true,
      message: 'Event recorded',
      event_id: crypto.randomUUID()
    })

  } catch (error) {
    console.error('Analytics event error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process event',
        code: 'INTERNAL_ERROR',
        request_id: crypto.randomUUID()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/debugging (admin only)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.ZING_ANALYTICS_KEY || 'demo-key'
  
  if (!authHeader || authHeader.replace('Bearer ', '') !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  // Return recent events for debugging
  const recentEvents = events.slice(-50).map(event => ({
    event: event.event,
    user_id: event.properties.user_id,
    app_version: event.properties.app_version,
    platform: event.properties.platform,
    timestamp: event.properties.timestamp
  }))

  return NextResponse.json({
    total_events: events.length,
    recent_events: recentEvents
  })
}