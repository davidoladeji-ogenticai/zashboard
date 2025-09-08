import { NextRequest, NextResponse } from 'next/server'
import { analyticsStore } from '@/lib/analytics-store'

export async function GET(request: NextRequest) {
  try {
    // Simple API authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || (!authHeader.includes('demo-key') && !authHeader.startsWith('Bearer '))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get system health metrics from analytics store
    const systemMetrics = getSystemHealthMetrics()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: systemMetrics,
      metadata: {
        endpoint: 'system',
        version: '1.0.0',
        cache_duration: 60 // seconds
      }
    })

  } catch (error) {
    console.error('System metrics API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch system metrics',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Get comprehensive system health metrics
function getSystemHealthMetrics() {
  const now = Date.now()
  const events = analyticsStore.getEvents()
  
  // Calculate uptime based on events (since we don't have real server uptime)
  const oldestEvent = events.length > 0 
    ? Math.min(...events.map(e => e.properties.timestamp || now).filter(Boolean))
    : now
  const uptimeMs = now - oldestEvent
  const uptimeHours = Math.max(0, uptimeMs / (1000 * 60 * 60))
  const uptimeDays = Math.floor(uptimeHours / 24)
  const remainingHours = Math.floor(uptimeHours % 24)

  // Get current system load from events 
  const recentEvents = events.filter(event => 
    event.properties.timestamp && event.properties.timestamp > now - (5 * 60 * 1000)
  )
  const eventsPerMinute = recentEvents.length / 5

  // Calculate response times from events
  const responseTimes = events
    .filter(event => event.properties.response_time)
    .map(event => event.properties.response_time)
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((acc, time) => acc + time, 0) / responseTimes.length 
    : 0

  // Calculate error rates
  const totalRequests = events.filter(event => 
    event.event === 'api_request' || event.event.includes('session')
  ).length
  const errorEvents = events.filter(event => 
    event.event.includes('error') || event.properties.error
  ).length
  const errorRate = totalRequests > 0 ? (errorEvents / totalRequests) * 100 : 0

  // System health status indicators
  const healthChecks = [
    {
      name: 'API Response Time',
      status: avgResponseTime < 200 ? 'healthy' : avgResponseTime < 500 ? 'warning' : 'critical',
      value: `${Math.round(avgResponseTime)}ms`,
      target: '< 200ms',
      last_check: new Date().toISOString()
    },
    {
      name: 'Error Rate',
      status: errorRate < 1 ? 'healthy' : errorRate < 5 ? 'warning' : 'critical',
      value: `${errorRate.toFixed(2)}%`,
      target: '< 1%',
      last_check: new Date().toISOString()
    },
    {
      name: 'Event Processing',
      status: eventsPerMinute < 1000 ? 'healthy' : eventsPerMinute < 5000 ? 'warning' : 'critical',
      value: `${Math.round(eventsPerMinute * 60)}/hr`,
      target: '< 60k/hr',
      last_check: new Date().toISOString()
    },
    {
      name: 'Database Connection',
      status: 'healthy', // Placeholder since we're using in-memory store
      value: 'Connected',
      target: 'Connected',
      last_check: new Date().toISOString()
    },
    {
      name: 'Memory Usage',
      status: 'healthy',
      value: '0MB', // Will be real when we have actual metrics
      target: '< 512MB',
      last_check: new Date().toISOString()
    }
  ]

  // Calculate overall system health
  const healthyCount = healthChecks.filter(check => check.status === 'healthy').length
  const warningCount = healthChecks.filter(check => check.status === 'warning').length
  const criticalCount = healthChecks.filter(check => check.status === 'critical').length
  
  let overallStatus = 'healthy'
  if (criticalCount > 0) {
    overallStatus = 'critical'
  } else if (warningCount > healthyCount) {
    overallStatus = 'warning'
  }

  return {
    overall_status: overallStatus,
    uptime: {
      total_hours: Math.round(uptimeHours * 10) / 10,
      formatted: uptimeDays > 0 
        ? `${uptimeDays}d ${remainingHours}h`
        : `${remainingHours}h ${Math.floor((uptimeHours % 1) * 60)}m`,
      since: new Date(oldestEvent).toISOString()
    },
    performance: {
      avg_response_time: Math.round(avgResponseTime),
      requests_per_minute: Math.round(eventsPerMinute),
      error_rate: Math.round(errorRate * 100) / 100,
      events_processed: events.length
    },
    resources: {
      memory_usage: 0, // Will be populated with real metrics
      cpu_usage: 0,    // Will be populated with real metrics  
      disk_usage: 0,   // Will be populated with real metrics
      network_io: {
        inbound: 0,
        outbound: 0
      }
    },
    health_checks: healthChecks,
    system_info: {
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    alerts: criticalCount > 0 || warningCount > 2 ? [
      {
        level: criticalCount > 0 ? 'critical' : 'warning',
        message: criticalCount > 0 
          ? `${criticalCount} critical system health issues detected`
          : `${warningCount} system health warnings detected`,
        timestamp: new Date().toISOString()
      }
    ] : [],
    last_updated: new Date().toISOString()
  }
}