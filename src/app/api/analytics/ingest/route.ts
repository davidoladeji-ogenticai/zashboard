import { NextRequest, NextResponse } from 'next/server'
import { analyticsStore } from '@/lib/analytics-store'
import { getLocationFromRequest } from '@/lib/geolocation'
import { EventPayload } from '@/types/analytics'

export async function POST(request: NextRequest) {
  try {
    // Simple API authentication 
    const authHeader = request.headers.get('authorization')
    if (!authHeader || (!authHeader.includes('demo-key') && !authHeader.startsWith('Bearer '))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event, properties } = body

    if (!event || !properties) {
      return NextResponse.json(
        { error: 'Missing required fields: event and properties' },
        { status: 400 }
      )
    }

    // Get real location data from the request IP
    const locationData = getLocationFromRequest(request)

    // Enrich the event with real location data
    const enrichedEvent: EventPayload = {
      event,
      properties: {
        ...properties,
        timestamp: properties.timestamp || Date.now(),
        // Add real geographic data
        country_code: locationData.country_code,
        country_name: locationData.country_name,
        region: locationData.region,
        city: locationData.city,
        location_source: locationData.source
      }
    }

    // Store the enriched event
    analyticsStore.addEvent(enrichedEvent)

    console.log(`Analytics event stored: ${event} from ${locationData.country_name} (${locationData.country_code})`)

    return NextResponse.json({
      success: true,
      event_id: `${event}_${Date.now()}`,
      location: {
        country: locationData.country_name,
        country_code: locationData.country_code,
        source: locationData.source
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics ingestion error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process analytics event',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check the service status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || (!authHeader.includes('demo-key') && !authHeader.startsWith('Bearer '))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get location data for testing
    const locationData = getLocationFromRequest(request)
    const totalEvents = analyticsStore.getTotalEvents()

    return NextResponse.json({
      success: true,
      service: 'Analytics Ingestion API',
      status: 'operational',
      total_events: totalEvents,
      detected_location: {
        country: locationData.country_name,
        country_code: locationData.country_code,
        source: locationData.source
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics service status error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get service status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}