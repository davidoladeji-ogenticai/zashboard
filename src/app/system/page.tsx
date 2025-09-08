'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { useSystemMetrics } from '@/hooks/useAnalytics'
import { Loader2 } from 'lucide-react'
import {
  Database,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export default function SystemPage() {
  const { data: systemMetrics, isLoading, error } = useSystemMetrics()

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Loading system metrics...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400 mb-2">Failed to load system metrics</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error.message}</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const systemComponents = systemMetrics?.health_checks || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Health
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Infrastructure monitoring and system performance overview
            </p>
          </div>

          {/* System Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="System Uptime"
              value={systemMetrics?.uptime?.formatted || '0h 0m'}
              change={0}
              changeLabel="since start"
              icon={Server}
              trend="up"
            />
            <MetricCard
              title="API Response"
              value={`${systemMetrics?.performance?.avg_response_time || 0}ms`}
              change={0}
              changeLabel="average"
              icon={Activity}
              trend={systemMetrics?.performance?.avg_response_time < 200 ? 'up' : 'neutral'}
            />
            <MetricCard
              title="Error Rate"
              value={`${systemMetrics?.performance?.error_rate || 0}%`}
              change={0}
              changeLabel="current rate"
              icon={Database}
              trend={systemMetrics?.performance?.error_rate < 1 ? 'up' : 'down'}
            />
            <MetricCard
              title="Events Processed"
              value={systemMetrics?.performance?.events_processed?.toString() || '0'}
              change={0}
              changeLabel="total events"
              icon={HardDrive}
              trend="neutral"
            />
          </div>

          {/* System Components Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              System Components Status
            </h3>
            <div className="space-y-4">
              {systemComponents.length > 0 ? systemComponents.map((component, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(component.status)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{component.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Target: {component.target}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(component.status)}`}>
                      {component.status}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Current: {component.value}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No system components data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resource Utilization
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">CPU Usage</span>
                    <span className="font-medium">{systemMetrics?.resources?.cpu_usage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" style={{ width: `${systemMetrics?.resources?.cpu_usage || 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Memory Usage</span>
                    <span className="font-medium">{systemMetrics?.resources?.memory_usage || 0}MB</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-yellow-600 dark:bg-yellow-400 h-2 rounded-full" style={{ width: `${Math.min(100, (systemMetrics?.resources?.memory_usage || 0) / 5)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Disk Usage</span>
                    <span className="font-medium">{systemMetrics?.resources?.disk_usage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 dark:bg-green-400 h-2 rounded-full" style={{ width: `${systemMetrics?.resources?.disk_usage || 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Network I/O</span>
                    <span className="font-medium">{((systemMetrics?.resources?.network_io?.inbound || 0) + (systemMetrics?.resources?.network_io?.outbound || 0))}MB/s</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full" style={{ width: `${Math.min(100, ((systemMetrics?.resources?.network_io?.inbound || 0) + (systemMetrics?.resources?.network_io?.outbound || 0)) / 10)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Events/min</span>
                  <span className="font-bold text-lg">{Math.round((systemMetrics?.performance?.requests_per_minute || 0) * 60)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Error Rate</span>
                  <span className={`font-bold text-lg ${(systemMetrics?.performance?.error_rate || 0) < 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {systemMetrics?.performance?.error_rate || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Avg Response Time</span>
                  <span className="font-bold text-lg">{systemMetrics?.performance?.avg_response_time || 0}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">System Status</span>
                  <span className={`font-bold text-lg capitalize ${
                    systemMetrics?.overall_status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                    systemMetrics?.overall_status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {systemMetrics?.overall_status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Infrastructure Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Server className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Platform</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">{systemMetrics?.system_info?.platform || 'Unknown'}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 text-xs rounded">
                  {systemMetrics?.system_info?.architecture || 'N/A'}
                </span>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Database className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">Environment</h4>
                <p className="text-sm text-green-600 dark:text-green-400">{systemMetrics?.system_info?.environment || 'Unknown'}</p>
                <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                  systemMetrics?.overall_status === 'healthy' ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200' :
                  systemMetrics?.overall_status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-200' :
                  'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                }`}>
                  {systemMetrics?.overall_status || 'Unknown'}
                </span>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Activity className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">Node.js</h4>
                <p className="text-sm text-purple-600 dark:text-purple-400">{systemMetrics?.system_info?.node_version || 'Unknown'}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 text-xs rounded">
                  Runtime
                </span>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <HardDrive className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">Uptime</h4>
                <p className="text-sm text-orange-600 dark:text-orange-400">{systemMetrics?.uptime?.formatted || '0h 0m'}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 text-xs rounded">
                  {systemMetrics?.uptime?.total_hours || 0}h Total
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}