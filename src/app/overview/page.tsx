'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { useUserMetrics } from '@/hooks/useAnalytics'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'
import {
  Users,
  Building2,
  Activity,
  TrendingUp,
  Globe,
  AlertCircle,
  Loader2,
  ArrowRight,
  BarChart3,
  Shield,
  Sparkles,
  ChevronRight
} from 'lucide-react'

interface Organization {
  membership: {
    organization_id: string
    role: 'user' | 'admin' | 'super_admin'
    title?: string
    organization: {
      id: string
      name: string
      slug: string
      description?: string
      logo_url?: string
    }
  }
  ai_config: {
    welcome_messages: string[]
    enabled: boolean
  } | null
  spaces: any[]
  teams: any[]
}

export default function OverviewPage() {
  const router = useRouter()
  const { isPlatformAdmin, loading: permissionsLoading, user } = useOrgPermissions()
  const { data: userMetrics, isLoading: metricsLoading, error: metricsError } = useUserMetrics()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load organizations for regular users
  useEffect(() => {
    if (!permissionsLoading && !isPlatformAdmin && user) {
      loadOrganizations()
    } else if (!permissionsLoading) {
      setLoading(false)
    }
  }, [permissionsLoading, isPlatformAdmin, user])

  async function loadOrganizations() {
    try {
      const response = await fetch('/api/organizations')

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setOrganizations(data.data.organizations || [])
      } else {
        setError(data.error || 'Failed to load organizations')
      }
    } catch (err) {
      console.error('Error loading organizations:', err)
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      default:
        return 'Member'
    }
  }

  // Show loading while checking permissions
  if (permissionsLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Platform Admin Overview
  if (isPlatformAdmin) {
    if (metricsError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Overview Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {metricsError.message}
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
              Platform Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              High-level insights and metrics for the Zashboard platform
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsLoading ? (
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
                  value={userMetrics?.totalUsers?.toLocaleString() || '0'}
                  change={userMetrics?.userGrowth || 0}
                  icon={Users}
                  trend={userMetrics?.userGrowth && userMetrics.userGrowth > 0 ? 'up' : 'down'}
                />
                <MetricCard
                  title="Active Users"
                  value={userMetrics?.activeUsers?.toLocaleString() || '0'}
                  subtitle="Last 30 days"
                  icon={Activity}
                />
                <MetricCard
                  title="Organizations"
                  value={userMetrics?.totalOrganizations?.toLocaleString() || '0'}
                  icon={Building2}
                />
                <MetricCard
                  title="Countries"
                  value={userMetrics?.totalCountries?.toString() || '0'}
                  subtitle="Global reach"
                  icon={Globe}
                />
              </>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Analytics Card */}
            <Link
              href="/analytics/users"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                User Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Detailed insights into user behavior and demographics
              </p>
            </Link>

            {/* Organizations Card */}
            <Link
              href="/admin/organizations"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Manage Organizations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage all organizations on the platform
              </p>
            </Link>

            {/* Geographic Card */}
            <Link
              href="/analytics/geographic"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geographic Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View user distribution and regional insights
              </p>
            </Link>

            {/* Performance Card */}
            <Link
              href="/analytics/performance"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Performance Metrics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor system performance and uptime
              </p>
            </Link>

            {/* System Card */}
            <Link
              href="/system"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-red-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                System Health
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View system status and health metrics
              </p>
            </Link>

            {/* Users Admin Card */}
            <Link
              href="/admin/users"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                User Management
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage users, roles, and permissions
              </p>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Regular User Overview
  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome Back!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your dashboard overview and quick access to organizations
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">My Organizations</span>
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {organizations.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Admin Roles</span>
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {organizations.filter(org => org.membership.role === 'super_admin' || org.membership.role === 'admin').length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Enabled</span>
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {organizations.filter(org => org.ai_config?.enabled).length}
            </div>
          </div>
        </div>

        {/* Organizations Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your Organizations
            </h2>
            <Link
              href="/organizations"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {organizations.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No organizations yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You haven't been added to any organizations yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {organizations.slice(0, 4).map((org) => {
                const role = org.membership.role

                return (
                  <div
                    key={org.membership.organization_id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => router.push(`/organizations/${org.membership.organization_id}`)}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            {org.membership.organization.logo_url ? (
                              <img
                                src={org.membership.organization.logo_url}
                                alt={org.membership.organization.name}
                                className="h-10 w-10 rounded-lg mr-3"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                                {org.membership.organization.name}
                              </h3>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                @{org.membership.organization.slug}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>

                      {/* Description */}
                      {org.membership.organization.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {org.membership.organization.description}
                        </p>
                      )}

                      {/* Role Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {getRoleLabel(role)}
                        </span>

                        {org.ai_config?.enabled && (
                          <div className="flex items-center text-sm text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-4 w-4 mr-1" />
                            <span>AI</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/organizations"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Browse Organizations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View all organizations you're a member of
            </p>
          </Link>

          <Link
            href="/profile"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              My Profile
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your account settings and preferences
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}
