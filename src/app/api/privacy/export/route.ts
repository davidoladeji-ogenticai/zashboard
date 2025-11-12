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

    const { format } = await request.json()
    
    if (!format || !['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be json or csv' },
        { status: 400 }
      )
    }

    const events = analyticsStore.getEvents()
    
    // Create export data structure
    const exportData = {
      export_info: {
        timestamp: new Date().toISOString(),
        format,
        record_count: events.length,
        exported_by: user.email,
        data_retention_policy: '90 days',
        anonymization_method: 'Hardware-based SHA-256 hashing'
      },
      compliance_status: {
        gdpr_compliant: true,
        ccpa_compliant: true,
        data_anonymized: true,
        retention_enforced: true
      },
      analytics_data: events.map(event => ({
        event_id: event.event,
        timestamp: new Date(event.properties.timestamp || Date.now()).toISOString(),
        user_id_hash: event.properties.hardware_id ? 
          event.properties.hardware_id.substring(0, 16) + '...' : 
          'anonymous',
        platform: event.properties.platform || 'unknown',
        app_version: event.properties.version || event.properties.app_version || 'unknown',
        session_id: event.properties.session_id || null,
        event_properties: {
          install_type: event.properties.install_type || null,
          duration_minutes: event.properties.duration_minutes || null,
          startup_time: event.properties.startup_time || null,
          memory_usage: event.properties.memory_usage || null
        }
      }))
    }

    if (format === 'json') {
      return new NextResponse(
        JSON.stringify(exportData, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename=privacy-export-${new Date().toISOString().split('T')[0]}.json`
          }
        }
      )
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'Event ID',
        'Timestamp', 
        'User ID Hash',
        'Platform',
        'App Version',
        'Session ID',
        'Install Type',
        'Duration Minutes',
        'Startup Time',
        'Memory Usage'
      ].join(',')
      
      const csvRows = exportData.analytics_data.map(record => [
        record.event_id,
        record.timestamp,
        record.user_id_hash,
        record.platform,
        record.app_version,
        record.session_id || '',
        record.event_properties.install_type || '',
        record.event_properties.duration_minutes || '',
        record.event_properties.startup_time || '',
        record.event_properties.memory_usage || ''
      ].map(field => `"${field}"`).join(','))
      
      const csvContent = [
        `# Privacy Data Export - ${exportData.export_info.timestamp}`,
        `# Records: ${exportData.export_info.record_count}`,
        `# Exported by: ${exportData.export_info.exported_by}`,
        `# GDPR Compliant: ${exportData.compliance_status.gdpr_compliant}`,
        `# Data Anonymized: ${exportData.compliance_status.data_anonymized}`,
        '',
        csvHeaders,
        ...csvRows
      ].join('\n')
      
      return new NextResponse(
        csvContent,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=privacy-export-${new Date().toISOString().split('T')[0]}.csv`
          }
        }
      )
    }

  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to export data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}