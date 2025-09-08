import { query, transaction } from './index'
import { EventPayload } from '@/types/analytics'

export class PostgreSQLAnalyticsStore {
  
  // Add analytics event to database
  async addEvent(event: EventPayload): Promise<void> {
    try {
      await query(`
        INSERT INTO analytics_events (
          event, user_id, hardware_id, installation_id, session_id, 
          app_version, platform, timestamp, properties
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        event.event,
        event.properties.user_id || event.properties.userId || null,
        event.properties.hardware_id || null,
        event.properties.installation_id || null,
        event.properties.session_id || null,
        event.properties.app_version || event.properties.version || null,
        event.properties.platform || null,
        event.properties.timestamp || Date.now(),
        JSON.stringify(event.properties || {})
      ])
    } catch (error) {
      console.error('Failed to add analytics event:', error)
      throw error
    }
  }

  // Get recent events with limit
  async getRecentEvents(limit: number = 50): Promise<EventPayload[]> {
    try {
      const result = await query(`
        SELECT event, user_id, hardware_id, installation_id, session_id,
               app_version, platform, timestamp, properties
        FROM analytics_events 
        ORDER BY created_at DESC 
        LIMIT $1
      `, [limit])

      return result.rows.map(this.mapRowToEvent)
    } catch (error) {
      console.error('Failed to get recent events:', error)
      return []
    }
  }

  // Get all events (with pagination for large datasets)
  async getEvents(offset: number = 0, limit: number = 1000): Promise<EventPayload[]> {
    try {
      const result = await query(`
        SELECT event, user_id, hardware_id, installation_id, session_id,
               app_version, platform, timestamp, properties
        FROM analytics_events 
        ORDER BY timestamp DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset])

      return result.rows.map(this.mapRowToEvent)
    } catch (error) {
      console.error('Failed to get events:', error)
      return []
    }
  }

  // Get realtime metrics
  async getRealtimeMetrics() {
    try {
      const now = Date.now()
      const oneHourAgo = now - (60 * 60 * 1000)
      const fiveMinutesAgo = now - (5 * 60 * 1000)

      const [recentEvents, activeEvents, sessionEvents, versionEvents] = await Promise.all([
        query('SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > $1', [oneHourAgo]),
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as count FROM analytics_events WHERE timestamp > $1', [fiveMinutesAgo]),
        query('SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > $1 AND (event = $2 OR event = $3)', [oneHourAgo, 'session_start', 'session_heartbeat']),
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as count FROM analytics_events WHERE timestamp > $1 AND app_version IS NOT NULL', [oneHourAgo])
      ])

      return {
        active_users_now: parseInt(activeEvents.rows[0].count) || 0,
        users_last_hour: parseInt(recentEvents.rows[0].count) || 0,
        active_sessions: parseInt(sessionEvents.rows[0].count) || 0,
        current_version_users: parseInt(versionEvents.rows[0].count) || 0,
        pending_updates: 0, // Will calculate based on version data
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get realtime metrics:', error)
      return {
        active_users_now: 0,
        users_last_hour: 0,
        active_sessions: 0,
        current_version_users: 0,
        pending_updates: 0,
        last_updated: new Date().toISOString()
      }
    }
  }

  // Get comprehensive user metrics
  async getUserMetrics() {
    try {
      const now = Date.now()
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000)
      const previousWeekAgo = oneWeekAgo - (7 * 24 * 60 * 60 * 1000)

      const [allTimeUsers, weeklyUsers, newUsers, activeUsers, previousActiveUsers, sessionData] = await Promise.all([
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as count FROM analytics_events'),
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as count FROM analytics_events WHERE timestamp > $1', [oneWeekAgo]),
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id)) as count FROM analytics_events WHERE timestamp > $1 AND event = $2 AND properties->>\'install_type\' = $3', [oneWeekAgo, 'zing_version_install_complete', 'fresh_install']),
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as count FROM analytics_events WHERE timestamp > $1', [oneWeekAgo]),
        query('SELECT COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as count FROM analytics_events WHERE timestamp > $1 AND timestamp <= $2', [previousWeekAgo, oneWeekAgo]),
        query(`
          SELECT 
            COUNT(*) as total_sessions,
            AVG(CASE WHEN properties->>'duration_minutes' IS NOT NULL THEN (properties->>'duration_minutes')::NUMERIC END) as avg_duration
          FROM analytics_events 
          WHERE timestamp > $1 AND (event = 'zing_session_start' OR event = 'zing_session_end')
        `, [oneWeekAgo])
      ])

      const totalUsers = parseInt(allTimeUsers.rows[0].count) || 0
      const activeThisWeek = parseInt(activeUsers.rows[0].count) || 0
      const newThisWeek = parseInt(newUsers.rows[0].count) || 0
      const previousActive = parseInt(previousActiveUsers.rows[0].count) || 0
      const avgSessionDuration = sessionData.rows[0].avg_duration || 0
      const totalSessions = parseInt(sessionData.rows[0].total_sessions) || 0

      // Calculate growth percentages
      const activeUserGrowth = previousActive > 0 ? ((activeThisWeek - previousActive) / previousActive) * 100 : 0
      const retentionRate = previousActive > 0 ? Math.min(100, (activeThisWeek / previousActive) * 100) : 0

      return {
        total_users: totalUsers,
        new_users_this_week: newThisWeek,
        active_users_this_week: activeThisWeek,
        avg_session_duration_minutes: Math.round(avgSessionDuration * 10) / 10,
        avg_session_duration_formatted: `${Math.floor(avgSessionDuration)}m ${Math.round((avgSessionDuration % 1) * 60)}s`,
        total_sessions_this_week: totalSessions,
        retention_rate: Math.round(retentionRate * 10) / 10,
        growth_metrics: {
          active_user_growth_percent: Math.round(activeUserGrowth * 10) / 10,
          new_user_growth_percent: 0, // Will calculate with historical data
          total_user_growth_percent: 0 // Will calculate with historical data
        },
        user_activity: await this.getUserActivityData(),
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get user metrics:', error)
      return {
        total_users: 0,
        new_users_this_week: 0,
        active_users_this_week: 0,
        avg_session_duration_minutes: 0,
        avg_session_duration_formatted: "0m 0s",
        total_sessions_this_week: 0,
        retention_rate: 0,
        growth_metrics: {
          active_user_growth_percent: 0,
          new_user_growth_percent: 0,
          total_user_growth_percent: 0
        },
        user_activity: [],
        last_updated: new Date().toISOString()
      }
    }
  }

  // Get performance metrics
  async getPerformanceMetrics() {
    try {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

      const [performanceData, crashData] = await Promise.all([
        query(`
          SELECT 
            AVG(CASE WHEN properties->>'startup_time' IS NOT NULL THEN (properties->>'startup_time')::NUMERIC END) as avg_startup_time,
            AVG(CASE WHEN properties->>'memory_usage' IS NOT NULL THEN (properties->>'memory_usage')::NUMERIC END) as avg_memory_usage,
            AVG(CASE WHEN properties->>'response_time' IS NOT NULL THEN (properties->>'response_time')::NUMERIC END) as avg_response_time,
            COUNT(*) as total_events
          FROM analytics_events 
          WHERE timestamp > $1
        `, [oneWeekAgo]),
        query(`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN event = 'zing_app_crash' OR properties->>'crash_type' IS NOT NULL THEN 1 END) as crash_events
          FROM analytics_events 
          WHERE timestamp > $1 AND (event = 'zing_session_start' OR event = 'zing_app_crash')
        `, [oneWeekAgo])
      ])

      const startupTime = performanceData.rows[0].avg_startup_time ? 
        Number(performanceData.rows[0].avg_startup_time) / 1000 : 0
      const memoryUsage = Number(performanceData.rows[0].avg_memory_usage) || 0
      const responseTime = Number(performanceData.rows[0].avg_response_time) || 0
      const totalSessions = parseInt(crashData.rows[0].total_sessions) || 0
      const crashEvents = parseInt(crashData.rows[0].crash_events) || 0
      const crashRate = totalSessions > 0 ? (crashEvents / totalSessions) * 100 : 0

      return {
        avg_startup_time: startupTime,
        avg_startup_time_formatted: `${startupTime.toFixed(1)}s`,
        avg_memory_usage: Math.round(memoryUsage),
        avg_memory_usage_formatted: `${Math.round(memoryUsage)}MB`,
        avg_response_time: Math.round(responseTime),
        avg_response_time_formatted: `${Math.round(responseTime)}ms`,
        crash_rate: Math.round(crashRate * 100) / 100,
        crash_rate_formatted: `${crashRate.toFixed(2)}%`,
        performance_benchmarks: this.generatePerformanceBenchmarks(startupTime, memoryUsage, responseTime, crashRate),
        overall_health: this.calculateOverallHealth(startupTime, memoryUsage, responseTime, crashRate),
        metrics_summary: {
          startup_time_improvement: 0, // Will calculate with historical data
          memory_usage_change: 0,
          response_time_improvement: 0,
          crash_rate_reduction: 0
        },
        last_updated: new Date().toISOString(),
        data_points: parseInt(performanceData.rows[0].total_events) || 0
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return this.getEmptyPerformanceMetrics()
    }
  }

  // Get system health metrics
  async getSystemMetrics() {
    try {
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)

      const [recentEvents, dailyEvents, systemStats] = await Promise.all([
        query('SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > $1', [oneHourAgo]),
        query('SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > $1', [oneDayAgo]),
        query('SELECT COUNT(*) as total_events, MIN(timestamp) as oldest_event FROM analytics_events')
      ])

      const recentCount = parseInt(recentEvents.rows[0].count) || 0
      const dailyCount = parseInt(dailyEvents.rows[0].count) || 0
      const totalEvents = parseInt(systemStats.rows[0].total_events) || 0
      const oldestEvent = systemStats.rows[0].oldest_event || Date.now()

      return {
        uptime_ms: Date.now() - Number(oldestEvent),
        events_per_minute: Math.round((recentCount / 60) * 10) / 10,
        avg_events_per_hour: Math.round((dailyCount / 24) * 10) / 10,
        avg_response_time: 0, // Will get from recent API calls
        error_rate: 0, // Will calculate from error events
        total_events: totalEvents,
        recent_events_count: recentCount,
        error_count: 0,
        oldest_event_timestamp: Number(oldestEvent),
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get system metrics:', error)
      return {
        uptime_ms: 0,
        events_per_minute: 0,
        avg_events_per_hour: 0,
        avg_response_time: 0,
        error_rate: 0,
        total_events: 0,
        recent_events_count: 0,
        error_count: 0,
        oldest_event_timestamp: Date.now(),
        last_updated: new Date().toISOString()
      }
    }
  }

  // Get total event count
  async getTotalEvents(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as count FROM analytics_events')
      return parseInt(result.rows[0].count) || 0
    } catch (error) {
      console.error('Failed to get total events:', error)
      return 0
    }
  }

  // Helper methods
  private mapRowToEvent(row: any): EventPayload {
    return {
      event: row.event,
      properties: {
        user_id: row.user_id,
        hardware_id: row.hardware_id,
        installation_id: row.installation_id,
        session_id: row.session_id,
        app_version: row.app_version,
        platform: row.platform,
        timestamp: Number(row.timestamp),
        ...(typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties)
      }
    }
  }

  private async getUserActivityData() {
    try {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      
      const result = await query(`
        SELECT 
          COALESCE(hardware_id, installation_id, user_id) as user_id,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_active,
          COUNT(CASE WHEN event = 'zing_session_start' THEN 1 END) as sessions,
          MAX(platform) as platform,
          MAX(app_version) as version
        FROM analytics_events 
        WHERE timestamp > $1
        GROUP BY COALESCE(hardware_id, installation_id, user_id)
        ORDER BY last_active DESC
        LIMIT 10
      `, [oneWeekAgo])

      return result.rows.map(row => ({
        user_id: (row.user_id || '').substring(0, 10) + '...',
        first_seen: Number(row.first_seen),
        last_active: Number(row.last_active),
        sessions: parseInt(row.sessions) || 0,
        platform: row.platform || 'unknown',
        version: row.version || '1.3.5',
        first_seen_formatted: this.formatTimeAgo(Number(row.first_seen)),
        last_active_formatted: this.formatTimeAgo(Number(row.last_active))
      }))
    } catch (error) {
      console.error('Failed to get user activity data:', error)
      return []
    }
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes} minutes ago`
    } else if (hours < 24) {
      return `${hours} hours ago`
    } else {
      return `${days} days ago`
    }
  }

  private generatePerformanceBenchmarks(startupTime: number, memoryUsage: number, responseTime: number, crashRate: number) {
    return [
      {
        name: 'Startup Time',
        value: `${startupTime.toFixed(1)}s`,
        current_value: startupTime,
        target_value: 3.0,
        target: '< 3s',
        status: startupTime < 3.0 ? (startupTime < 2.0 ? 'excellent' : 'good') : 'warning',
        improvement_percent: 0
      },
      {
        name: 'Memory Usage',
        value: `${Math.round(memoryUsage)}MB`,
        current_value: memoryUsage,
        target_value: 200,
        target: '< 200MB',
        status: memoryUsage < 200 ? 'good' : 'warning',
        improvement_percent: 0
      },
      {
        name: 'Response Time',
        value: `${Math.round(responseTime)}ms`,
        current_value: responseTime,
        target_value: 200,
        target: '< 200ms',
        status: responseTime < 100 ? 'excellent' : responseTime < 200 ? 'good' : 'warning',
        improvement_percent: 0
      },
      {
        name: 'Crash Rate',
        value: `${crashRate.toFixed(2)}%`,
        current_value: crashRate,
        target_value: 0.1,
        target: '< 0.1%',
        status: crashRate < 0.1 ? 'excellent' : crashRate < 0.5 ? 'good' : 'warning',
        improvement_percent: 0
      }
    ]
  }

  private calculateOverallHealth(startupTime: number, memoryUsage: number, responseTime: number, crashRate: number): string {
    const benchmarks = this.generatePerformanceBenchmarks(startupTime, memoryUsage, responseTime, crashRate)
    const excellentCount = benchmarks.filter(b => b.status === 'excellent').length
    const goodCount = benchmarks.filter(b => b.status === 'good').length
    const warningCount = benchmarks.filter(b => b.status === 'warning').length
    
    if (excellentCount > goodCount + warningCount) {
      return 'excellent'
    } else if (warningCount > excellentCount + goodCount) {
      return 'warning'
    }
    return 'good'
  }

  private getEmptyPerformanceMetrics() {
    return {
      avg_startup_time: 0,
      avg_startup_time_formatted: "0.0s",
      avg_memory_usage: 0,
      avg_memory_usage_formatted: "0MB",
      avg_response_time: 0,
      avg_response_time_formatted: "0ms",
      crash_rate: 0,
      crash_rate_formatted: "0.00%",
      performance_benchmarks: [],
      overall_health: "good",
      metrics_summary: {
        startup_time_improvement: 0,
        memory_usage_change: 0,
        response_time_improvement: 0,
        crash_rate_reduction: 0
      },
      last_updated: new Date().toISOString(),
      data_points: 0
    }
  }
}

// Create global singleton
const globalForAnalytics = globalThis as unknown as {
  postgresAnalyticsStore: PostgreSQLAnalyticsStore | undefined
}

export const postgresAnalyticsStore = 
  globalForAnalytics.postgresAnalyticsStore ?? 
  (globalForAnalytics.postgresAnalyticsStore = new PostgreSQLAnalyticsStore())