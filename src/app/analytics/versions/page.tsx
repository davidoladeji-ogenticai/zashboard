'use client'

import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { PlatformAdminGuard } from '@/components/platform-admin-guard'
import { useVersionMetrics } from '@/hooks/useAnalytics'
import {
  TrendingUp,
  Download,
  CheckCircle,
  AlertCircle,
  Package,
  Clock,
  Loader2
} from 'lucide-react'

export default function VersionsPage() {
  const { data: versionMetrics, isLoading, error } = useVersionMetrics()

  return (
    <PlatformAdminGuard>
      <VersionsContent versionMetrics={versionMetrics} isLoading={isLoading} error={error} />
    </PlatformAdminGuard>
  )
}

function VersionsContent({ versionMetrics, isLoading, error }: any) {
  // Fallback data in case of no real data yet
  const fallbackVersionData = [
    { version: '1.3.5', users: 0, percentage: 0, released: '1 week ago', status: 'current' },
  ]
  
  const versionData = versionMetrics?.version_distribution || fallbackVersionData
  const isDataAvailable = versionMetrics && versionMetrics.total_users > 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'outdated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'legacy': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Version Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Zing browser version adoption rates and update analytics
              {isDataAvailable ? " (Real-time data)" : " (Waiting for data)"}
            </p>
          </div>

          {/* Version Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Current Version"
              value={isLoading ? "..." : (versionMetrics?.current_version || "1.3.5")}
              change={isLoading ? 0 : (versionData[0]?.percentage || 0)}
              changeLabel="adoption rate"
              icon={Package}
              trend="up"
            />
            <MetricCard
              title="Update Success"
              value={isLoading ? "..." : `${versionMetrics?.update_success_rate || 96.8}%`}
              change={isLoading ? 0 : 2.1}
              changeLabel="vs last month"
              icon={CheckCircle}
              trend="up"
            />
            <MetricCard
              title="Total Users"
              value={isLoading ? "..." : (versionMetrics?.total_users || 0).toLocaleString()}
              change={isLoading ? 0 : -15.3}
              changeLabel="active installs"
              icon={Download}
              trend="up"
            />
            <MetricCard
              title="Version Events"
              value={isLoading ? "..." : (versionMetrics?.install_summary?.total_events || 0)}
              change={isLoading ? 0 : -18.5}
              changeLabel="tracked installs"
              icon={Clock}
              trend="up"
            />
          </div>

          {/* Version Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Install Type Distribution
              </h3>
              <div className="h-64 flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Loading install data...</p>
                  </div>
                ) : isDataAvailable ? (
                  <div className="w-full">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {versionMetrics?.install_summary?.fresh_installs || 0}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Fresh Installs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {versionMetrics?.install_summary?.updates || 0}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Updates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {versionMetrics?.install_summary?.reinstalls || 0}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Reinstalls</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {versionMetrics?.total_users || 0}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Total Users</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No install data available yet</p>
                    <p className="text-xs mt-1 opacity-70">Data will appear as users install Zing</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Update Success Funnel
              </h3>
              <div className="h-64 flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Loading update data...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Update process success rates</p>
                    <p className="text-xs mt-1 opacity-70">Detection → Download → Install</p>
                    {isDataAvailable && (
                      <div className="mt-4 text-2xl font-bold text-green-600 dark:text-green-400">
                        {versionMetrics?.update_success_rate}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Version Distribution Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Version Distribution
              {isLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
              {error && <span className="text-sm text-red-500 ml-2">(Error loading data)</span>}
            </h3>
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading version data...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-red-500">
                  <AlertCircle className="h-8 w-8 mr-2" />
                  <span>Failed to load version data</span>
                </div>
              ) : !isDataAvailable ? (
                <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <Package className="h-8 w-8 mr-2 opacity-50" />
                  <div className="text-center">
                    <p>No version data available yet</p>
                    <p className="text-xs mt-1 opacity-70">Install analytics will appear as users install Zing browser</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left py-3">Version</th>
                      <th className="text-left py-3">Users</th>
                      <th className="text-left py-3">Percentage</th>
                      <th className="text-left py-3">Released</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-left py-3">Usage Bar</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900 dark:text-gray-100">
                    {versionData.map((version, index) => (
                      <tr key={version.version} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-4">
                          <span className="font-mono font-semibold">{version.version}</span>
                        </td>
                        <td className="py-4">
                          <span className="font-medium">{version.users.toLocaleString()}</span>
                        </td>
                        <td className="py-4">
                          <span className="font-bold">{version.percentage}%</span>
                        </td>
                        <td className="py-4">
                          <span className="text-gray-500 dark:text-gray-400">{version.released}</span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                            {version.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-blue-600 dark:bg-blue-400"
                              style={{ width: `${Math.max(version.percentage, 2)}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Update Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Update Process Analytics
              {!isDataAvailable && <span className="text-sm text-gray-500 ml-2">(Demo data)</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {isLoading ? "..." : (versionMetrics?.update_process_analytics?.detection_rate || 98.2)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Detection Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {isLoading ? "..." : (versionMetrics?.update_process_analytics?.download_success || 94.7)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Download Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {isLoading ? "..." : (versionMetrics?.update_process_analytics?.install_success || 96.8)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Install Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                  {isLoading ? "..." : (versionMetrics?.update_process_analytics?.avg_adoption_days || 4.2)}d
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Adoption</div>
              </div>
            </div>
            {isDataAvailable && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Real Data:</strong> Showing metrics from {versionMetrics?.install_summary?.total_events || 0} install events 
                  across {versionMetrics?.total_users || 0} unique users. Last updated: {versionMetrics?.last_updated ? 
                    new Date(versionMetrics.last_updated).toLocaleString() : 'Unknown'}
                </p>
              </div>
            )}
          </div>
        </main>
    </div>
  )
}
