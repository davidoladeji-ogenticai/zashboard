'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { useRealtimeMetrics, useAnalyticsHealth, useVersionMetrics, useUserMetrics } from '@/hooks/useAnalytics'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'
import {
  Users,
  Activity,
  Globe,
  TrendingUp,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { isPlatformAdmin, loading: permissionsLoading } = useOrgPermissions()
  const { data: realtimeData, isLoading: isLoadingRealtime, error: realtimeError } = useRealtimeMetrics()
  const { data: healthData, isLoading: isLoadingHealth } = useAnalyticsHealth()
  const { data: versionData } = useVersionMetrics()
  const { data: userData } = useUserMetrics()

  // Redirect non-platform-admins to organizations page
  useEffect(() => {
    if (!permissionsLoading && !isPlatformAdmin) {
      router.push('/organizations')
    }
  }, [permissionsLoading, isPlatformAdmin, router])

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render content for non-admins (will redirect)
  if (!isPlatformAdmin) {
    return null
  }

  if (realtimeError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Analytics Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {realtimeError.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col h-full">
      <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Global Zing browser usage metrics and insights
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoadingRealtime ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <MetricCard
                  title="Active Users Now"
                  value={realtimeData?.active_users_now ?? 0}
                  change={8.2}
                  changeLabel="vs last week"
                  icon={Users}
                  trend="up"
                />
                <MetricCard
                  title="Active Sessions"
                  value={realtimeData?.active_sessions ?? 0}
                  change={-2.1}
                  changeLabel="vs yesterday"
                  icon={Activity}
                  trend="down"
                />
                <MetricCard
                  title="Users Last Hour"
                  value={realtimeData?.users_last_hour ?? 0}
                  change={3}
                  changeLabel="hourly growth"
                  icon={Globe}
                  trend="up"
                />
                <MetricCard
                  title="Current Version"
                  value={realtimeData?.current_version_users ?? 0}
                  change={12.5}
                  changeLabel="users updated"
                  icon={TrendingUp}
                  trend="up"
                />
              </>
            )}
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoadingRealtime ? (
              // Loading skeleton for additional metrics
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <MetricCard
                  title="Total Users"
                  value={userData?.total_users ?? 0}
                  change={userData?.growth_metrics?.total_user_growth_percent ?? 0}
                  changeLabel="vs last month"
                  icon={Download}
                  trend="up"
                />
                <MetricCard
                  title="Avg Session"
                  value={userData?.avg_session_duration_formatted ?? "0m 0s"}
                  change={userData?.growth_metrics?.active_user_growth_percent ?? 0}
                  changeLabel="vs last week"
                  icon={Clock}
                  trend={userData?.growth_metrics?.active_user_growth_percent > 0 ? "up" : "down"}
                />
                <MetricCard
                  title="Update Success"
                  value={`${versionData?.update_success_rate ?? 96.8}%`}
                  change={2.1}
                  changeLabel="success rate"
                  icon={CheckCircle}
                  trend="up"
                />
                <MetricCard
                  title="Active Users"
                  value={userData?.active_users_this_week ?? 0}
                  change={userData?.growth_metrics?.active_user_growth_percent ?? 0}
                  changeLabel="this week"
                  icon={AlertCircle}
                  trend={userData?.growth_metrics?.active_user_growth_percent > 0 ? "up" : "down"}
                />
              </>
            )}
          </div>

          {/* Charts and Additional Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Chart Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Daily Active Users
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chart integration coming soon</p>
                </div>
              </div>
            </div>

            {/* Geographic Distribution Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Global Distribution
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>World map visualization coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              System Status
            </h3>
            {isLoadingHealth ? (
              <div className="animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 ${healthData?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Analytics API: {healthData?.status === 'healthy' ? 'Operational' : 'Down'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 ${healthData?.database === 'connected' ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Database: {healthData?.database === 'connected' ? 'Healthy' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Dashboard: Online ({healthData?.uptime ? Math.round(healthData.uptime) : 0}s uptime)
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
    </div>
  )
}
