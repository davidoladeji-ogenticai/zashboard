'use client'

import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { PlatformAdminGuard } from '@/components/platform-admin-guard'
import { usePrivacyMetrics } from '@/hooks/usePrivacy'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Settings
} from 'lucide-react'

export default function PrivacyPage() {
  const { data: privacyData, isLoading, error } = usePrivacyMetrics()

  return (
    <PlatformAdminGuard>
      <PrivacyContent privacyData={privacyData} isLoading={isLoading} error={error} />
    </PlatformAdminGuard>
  )
}

function PrivacyContent({ privacyData, isLoading, error }: any) {
  const [notification, setNotification] = useState({ message: '', type: '' })

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification({ message: '', type: '' }), 3000)
  }

  const handleDataExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key'
        },
        body: JSON.stringify({ format }),
        credentials: 'include'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `privacy-data-${new Date().toISOString().split('T')[0]}.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
        showNotification(`Data exported successfully as ${format.toUpperCase()}`, 'success')
      } else {
        showNotification('Failed to export data', 'error')
      }
    } catch (error) {
      console.error('Export error:', error)
      showNotification('Failed to export data', 'error')
    }
  }

  const handleDataDeletion = async (ageInDays: number) => {
    if (!confirm(`Are you sure you want to delete data older than ${ageInDays} days?`)) {
      return
    }
    
    try {
      const response = await fetch('/api/privacy/delete-old-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-key'
        },
        body: JSON.stringify({ ageInDays }),
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        showNotification(`Deleted ${result.deletedCount || 0} old records`, 'success')
      } else {
        showNotification('Failed to delete old data', 'error')
      }
    } catch (error) {
      console.error('Deletion error:', error)
      showNotification('Failed to delete old data', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Loading privacy metrics...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600 dark:text-red-400" />
            <p className="text-red-600 dark:text-red-400 mb-2">Failed to load privacy metrics</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{error.message}</p>
          </div>
        </main>
      </div>
    )
  }

  const privacyMetrics = privacyData?.privacy_metrics || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'secure':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case 'violation':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'secure':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'violation':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Privacy & Compliance
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Data protection, user privacy, and regulatory compliance status
            </p>
          </div>

          {/* Privacy Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Anonymous Users"
              value={`${privacyData?.anonymous_users_percent || 0}%`}
              change={0}
              changeLabel="privacy compliant"
              icon={UserCheck}
              trend="neutral"
            />
            <MetricCard
              title="Data Retention"
              value={`${privacyData?.data_retention_days || 0} days`}
              change={0}
              changeLabel="auto-deletion"
              icon={Clock}
              trend="neutral"
            />
            <MetricCard
              title="Opt-out Rate"
              value={`${privacyData?.opt_out_rate_percent || 0}%`}
              change={0}
              changeLabel="current rate"
              icon={Eye}
              trend={privacyData?.opt_out_rate_percent && privacyData.opt_out_rate_percent < 3 ? 'up' : 'neutral'}
            />
            <MetricCard
              title="Compliance Score"
              value={`${privacyData?.compliance_score_percent || 0}%`}
              change={0}
              changeLabel="overall score"
              icon={Shield}
              trend={privacyData?.compliance_score_percent && privacyData.compliance_score_percent > 95 ? 'up' : 'neutral'}
            />
          </div>

          {/* Privacy Compliance Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Privacy Compliance Status
            </h3>
            <div className="space-y-4">
              {privacyMetrics.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.category}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.details}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Collection Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Data We Collect
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Anonymous User ID ({privacyData?.data_collection.types_collected.anonymous_user_id || 0} users)
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    App Version ({privacyData?.data_collection.types_collected.app_version || 0} versions)
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Platform Type ({privacyData?.data_collection.types_collected.platform_type || 0} platforms)
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Usage Metrics ({privacyData?.data_collection.types_collected.usage_metrics || 0} events)
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Session Data ({privacyData?.data_collection.types_collected.session_data || 0} sessions)
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Data We DON'T Collect
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Personal Identifiers</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IP Addresses (stored)</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">URLs Visited</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Search Queries</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Browsing History</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Data Management Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Data Management & Controls
            </h3>
            
            {/* Notification */}
            {notification.message && (
              <div className={`mb-4 p-3 rounded-lg ${
                notification.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}>
                {notification.message}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Data Export */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center mb-3">
                  <Download className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Data Export</h4>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  Export compliance and analytics data for auditing
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleDataExport('json')}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleDataExport('csv')}
                    className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-700/30 transition-colors"
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
              
              {/* Data Retention */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center mb-3">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Data Retention</h4>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                  Current retention: {privacyData?.data_retention_days || 90} days
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleDataDeletion(90)}
                    className="w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
                  >
                    Delete &gt;90 days
                  </button>
                  <button
                    onClick={() => handleDataDeletion(30)}
                    className="w-full px-3 py-2 bg-yellow-100 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-200 rounded text-sm hover:bg-yellow-200 dark:hover:bg-yellow-700/30 transition-colors"
                  >
                    Delete &gt;30 days
                  </button>
                </div>
              </div>
              
              {/* Compliance Settings */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center mb-3">
                  <Settings className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Compliance</h4>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                  Score: {privacyData?.compliance_score_percent || 0}%
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Auto-deletion</span>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Data encryption</span>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Access controls</span>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regulatory Compliance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Regulatory Compliance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {privacyData?.regulatory_compliance.map((regulation, index) => {
                const getRegulationIcon = (name: string) => {
                  switch (name) {
                    case 'GDPR':
                      return <Shield className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    case 'CCPA':
                      return <Database className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    case 'SOC 2':
                      return <Lock className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    default:
                      return <Shield className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  }
                }
                
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'compliant':
                      return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    case 'warning':
                      return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                    case 'violation':
                      return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    default:
                      return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                  }
                }
                
                return (
                  <div key={index} className={`text-center p-4 rounded-lg ${
                    regulation.status === 'compliant' ? 'bg-green-50 dark:bg-green-900/20' :
                    regulation.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {getRegulationIcon(regulation.name)}
                    <h4 className={`font-semibold mb-1 ${
                      regulation.status === 'compliant' ? 'text-green-800 dark:text-green-200' :
                      regulation.status === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                      'text-red-800 dark:text-red-200'
                    }`}>
                      {regulation.name}
                    </h4>
                    <p className={`text-sm mb-2 ${
                      regulation.status === 'compliant' ? 'text-green-600 dark:text-green-400' :
                      regulation.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {regulation.full_name}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded capitalize ${
                      regulation.status === 'compliant' ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200' :
                      regulation.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                    }`}>
                      {regulation.status} ({regulation.score}%)
                    </span>
                  </div>
                )
              }) || [
                // Fallback if no data
                <div key="fallback" className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <Shield className="h-12 w-12 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">No Data</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Compliance data loading</p>
                </div>
              ]}
            </div>
          </div>
        </main>
    </div>
  )
}