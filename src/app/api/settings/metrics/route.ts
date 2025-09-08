import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, getAllUsers } from '@/lib/auth'
import { analyticsStore } from '@/lib/analytics-store'

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const allUsers = getAllUsers()
    const storeData = analyticsStore.getAnalyticsData()
    const events = storeData.events || []
    
    // Calculate storage metrics from analytics data
    const totalEvents = events.length
    const storageInBytes = JSON.stringify(events).length
    const storageInMB = Math.round(storageInBytes / (1024 * 1024) * 100) / 100
    const storageDisplay = storageInMB > 1024 
      ? `${Math.round(storageInMB / 1024 * 100) / 100}GB`
      : `${storageInMB}MB`

    // Calculate oldest data
    const oldestEvent = events.length > 0 
      ? Math.min(...events.map(e => e.timestamp))
      : Date.now()
    const daysOld = Math.floor((Date.now() - oldestEvent) / (1000 * 60 * 60 * 24))

    // Get active API keys count (placeholder - should come from actual API key storage)
    const activeApiKeys = 1 // Currently we have one demo key
    
    // Notification settings from system (placeholder)
    const enabledNotifications = {
      systemAlerts: true,
      usageAlerts: true,
      weeklyReports: false,
      totalEnabled: 2
    }

    const metrics = {
      admin_users: allUsers.length,
      api_keys: activeApiKeys,
      notifications_enabled: enabledNotifications.totalEnabled,
      data_retention_days: 90,
      storage: {
        total_events: totalEvents,
        storage_used: storageDisplay,
        storage_bytes: storageInBytes,
        oldest_data_days: daysOld
      },
      notifications: enabledNotifications,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Settings metrics API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch settings metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}