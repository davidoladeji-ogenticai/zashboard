import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-clerk'
import { analyticsStore } from '@/lib/analytics-store'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const { ageInDays } = await request.json()
    
    if (!ageInDays || typeof ageInDays !== 'number' || ageInDays < 1) {
      return NextResponse.json(
        { error: 'Invalid age parameter. Must be a positive number' },
        { status: 400 }
      )
    }

    const now = Date.now()
    const cutoffTime = now - (ageInDays * 24 * 60 * 60 * 1000)
    
    // Get events before deletion for counting
    const allEvents = analyticsStore.getEvents()
    const eventsToDelete = allEvents.filter(event => 
      event.properties.timestamp && event.properties.timestamp < cutoffTime
    )
    
    const deletedCount = eventsToDelete.length
    
    // Use the clearOldEvents method to remove old data
    analyticsStore.clearOldEvents(cutoffTime)
    
    // Log the deletion for audit purposes
    console.log(`Data deletion completed by ${user.email}: ${deletedCount} records older than ${ageInDays} days deleted`)

    return NextResponse.json({
      success: true,
      deletedCount,
      cutoffDate: new Date(cutoffTime).toISOString(),
      ageInDays,
      deletedBy: user.email,
      timestamp: new Date().toISOString(),
      message: `Successfully deleted ${deletedCount} records older than ${ageInDays} days`
    })

  } catch (error) {
    console.error('Data deletion error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete old data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}