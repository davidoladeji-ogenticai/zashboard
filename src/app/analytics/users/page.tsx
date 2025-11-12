'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { useUserMetrics } from '@/hooks/useAnalytics'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  TrendingUp,
  Globe,
  AlertCircle,
  Loader2
} from 'lucide-react'

export default function UsersPage() {
  const router = useRouter()
  const { isPlatformAdmin, loading: permissionsLoading } = useOrgPermissions()
  const { data: userMetrics, isLoading, error } = useUserMetrics()

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

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load User Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message}
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
              User Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed insights into Zing browser user behavior and demographics
            </p>
          </div>

          {/* User Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoading ? (
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
                  title="Total Users"
                  value={userMetrics?.total_users ?? 0}
                  change={userMetrics?.growth_metrics?.total_user_growth_percent ?? 0}
                  changeLabel="vs last month"
                  icon={Users}
                  trend={userMetrics?.growth_metrics?.total_user_growth_percent > 0 ? "up" : "down"}
                />
                <MetricCard
                  title="New Users"
                  value={userMetrics?.new_users_this_week ?? 0}
                  change={userMetrics?.growth_metrics?.new_user_growth_percent ?? 0}
                  changeLabel="this week"
                  icon={UserPlus}
                  trend={userMetrics?.growth_metrics?.new_user_growth_percent > 0 ? "up" : "down"}
                />
                <MetricCard
                  title="Active Users"
                  value={userMetrics?.active_users_this_week ?? 0}
                  change={userMetrics?.growth_metrics?.active_user_growth_percent ?? 0}
                  changeLabel="vs last week"
                  icon={UserCheck}
                  trend={userMetrics?.growth_metrics?.active_user_growth_percent > 0 ? "up" : "down"}
                />
                <MetricCard
                  title="Avg Session Time"
                  value={userMetrics?.avg_session_duration_formatted ?? "0m 0s"}
                  change={15.4}
                  changeLabel="vs last month"
                  icon={Clock}
                  trend="up"
                />
              </>
            )}
          </div>

          {/* User Engagement Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Growth Trend
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>User growth chart will be implemented with real data</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Distribution
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Geographic distribution chart coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Activity Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent User Activity
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3">User ID</th>
                    <th className="text-left py-3">First Seen</th>
                    <th className="text-left py-3">Last Active</th>
                    <th className="text-left py-3">Sessions</th>
                    <th className="text-left py-3">Platform</th>
                    <th className="text-left py-3">Version</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-gray-100">
                  {isLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div></td>
                        <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div></td>
                        <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div></td>
                        <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div></td>
                        <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div></td>
                        <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div></td>
                      </tr>
                    ))
                  ) : userMetrics?.user_activity && userMetrics.user_activity.length > 0 ? (
                    userMetrics.user_activity.map((user, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3">{user.user_id}</td>
                        <td className="py-3">{user.first_seen_formatted}</td>
                        <td className="py-3">{user.last_active_formatted}</td>
                        <td className="py-3">{user.sessions}</td>
                        <td className="py-3">{user.platform}</td>
                        <td className="py-3">{user.version}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No user activity data available yet. Users will appear here once analytics events are received.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
    </div>
  )
}