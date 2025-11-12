'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Shield, Sparkles, ChevronRight } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

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

export default function MyOrganizationsPage() {
  const router = useRouter()
  const { user, loading: permissionsLoading, isPlatformAdmin } = useOrgPermissions()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!permissionsLoading && user) {
      loadOrganizations()
    }
  }, [permissionsLoading, user])

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

  function canManage(role: string) {
    return role === 'super_admin'
  }

  if (permissionsLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading organizations...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                My Organizations
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Organizations you belong to and your role in each
              </p>

              {isPlatformAdmin && (
                <button
                  onClick={() => router.push('/admin/organizations')}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  View All Organizations (Admin)
                </button>
              )}
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Organizations Grid */}
            {organizations.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No organizations yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  You haven't been added to any organizations yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => {
                  const role = org.membership.role
                  const canManageOrg = canManage(role) || isPlatformAdmin

                  return (
                    <div
                      key={org.membership.organization_id}
                      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer group"
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
                        <div className="mb-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(role)}
                            {org.membership.title && ` · ${org.membership.title}`}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{org.teams?.length || 0} teams</span>
                          </div>

                          {org.ai_config?.enabled && (
                            <div className="flex items-center text-sm text-purple-600 dark:text-purple-400">
                              <Sparkles className="h-4 w-4 mr-1" />
                              <span>AI Configured</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {canManageOrg && (
                          <div className="mt-4 space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/organizations/${org.membership.organization_id}/members`)
                              }}
                              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors text-sm font-medium"
                            >
                              Manage Organization
                            </button>
                            {canManage(role) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/organizations/${org.membership.organization_id}/roles`)
                                }}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Roles & Permissions
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
