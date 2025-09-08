import { NextRequest, NextResponse } from 'next/server'
import { analyticsStore } from '@/lib/analytics-store'
import { EventPayload } from '@/types/analytics'

export async function POST(request: NextRequest) {
  try {
    // Simple API authentication 
    const authHeader = request.headers.get('authorization')
    if (!authHeader || (!authHeader.includes('demo-key') && !authHeader.startsWith('Bearer '))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, country_code, country_name } = body

    if (action === 'clear') {
      // Clear existing test data
      analyticsStore.clearOldEvents(Date.now()) // Clear all events
      console.log('Cleared all analytics data')
      
      return NextResponse.json({
        success: true,
        message: 'All analytics data cleared',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'add_sample' && country_code && country_name) {
      // Create sample events with real location data - using SAME hardware_id for same user
      const singleHardwareId = 'hw-nigeria-user-001' // Consistent hardware ID for deduplication
      const sampleEvents: EventPayload[] = [
        {
          event: 'zing_version_install_complete',
          properties: {
            user_id: 'user-ng-001',
            hardware_id: singleHardwareId, // Same hardware ID for all events from this user
            app_version: '1.3.5',
            platform: 'darwin',
            install_type: 'fresh_install',
            timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
            country_code: country_code,
            country_name: country_name,
            location_source: 'manual'
          }
        },
        {
          event: 'zing_session_start',
          properties: {
            user_id: 'user-ng-001',
            hardware_id: singleHardwareId, // Same hardware ID
            app_version: '1.3.5',
            platform: 'darwin',
            session_id: 'session-' + Math.random().toString(36).substr(2, 8),
            timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
            country_code: country_code,
            country_name: country_name,
            location_source: 'manual'
          }
        },
        {
          event: 'zing_app_launch',
          properties: {
            user_id: 'user-ng-001', 
            hardware_id: singleHardwareId, // Same hardware ID
            app_version: '1.3.5',
            platform: 'darwin',
            startup_time: 1250,
            memory_usage: 145,
            timestamp: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
            country_code: country_code,
            country_name: country_name,
            location_source: 'manual'
          }
        },
        {
          event: 'zing_session_end',
          properties: {
            user_id: 'user-ng-001',
            hardware_id: singleHardwareId, // Same hardware ID
            app_version: '1.3.5',
            platform: 'darwin',
            session_id: 'session-' + Math.random().toString(36).substr(2, 8),
            duration_minutes: 45,
            timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
            country_code: country_code,
            country_name: country_name,
            location_source: 'manual'
          }
        }
      ]

      // Add all sample events
      sampleEvents.forEach(event => {
        analyticsStore.addEvent(event)
      })

      console.log(`Added ${sampleEvents.length} sample events for ${country_name} (${country_code})`)

      return NextResponse.json({
        success: true,
        message: `Added ${sampleEvents.length} sample events for ${country_name}`,
        events_added: sampleEvents.length,
        country: { code: country_code, name: country_name },
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "clear" or "add_sample" with country_code and country_name' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Test data error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process test data request',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check current data
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || (!authHeader.includes('demo-key') && !authHeader.startsWith('Bearer '))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = analyticsStore.getEvents()
    const countries = new Map<string, number>()
    
    events.forEach(event => {
      const country = event.properties.country_name || 'Unknown'
      countries.set(country, (countries.get(country) || 0) + 1)
    })

    return NextResponse.json({
      success: true,
      total_events: events.length,
      countries: Object.fromEntries(countries),
      sample_events: events.slice(0, 3).map(event => ({
        event: event.event,
        country: event.properties.country_name,
        country_code: event.properties.country_code,
        location_source: event.properties.location_source,
        timestamp: new Date(event.properties.timestamp || Date.now()).toISOString()
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test data status error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get test data status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}