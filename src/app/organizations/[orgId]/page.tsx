'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Sparkles, Settings, ArrowLeft, Shield, AlertCircle } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  size?: string
  created_at: string
  updated_at: string
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const router = useRouter()
  const { orgId } = use(params)
  const permissions = useOrgPermissions(orgId)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!permissions.loading) {
      if (!permissions.hasOrgAccess) {
        // User doesn't have access to this org
        setError('You do not have access to this organization')
        setLoading(false)
      } else {
        loadOrganization()
      }
    }
  }, [permissions.loading, permissions.hasOrgAccess, orgId])

  async function loadOrganization() {
    try {
      const response = await fetch(`/api/organizations/${orgId}`)

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setOrganization(data.data)
      } else {
        setError(data.error || 'Failed to load organization')
      }
    } catch (err) {
      console.error('Error loading organization:', err)
      setError('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  function getRoleLabel(role: string | null) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'user':
        return 'Member'
      default:
        return 'No Role'
    }
  }

  function getRoleBadgeColor(role: string | null) {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  if (permissions.loading || loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading organization...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Access denied
  if (error || !permissions.hasOrgAccess) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || 'You do not have access to this organization.'}
              </p>
              <button
                onClick={() => router.push('/organizations')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Go to My Organizations
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => router.push('/organizations')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </button>

            {/* Organization Header */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-16 w-16 rounded-lg mr-4"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                      <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}

                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {organization.name}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      @{organization.slug}
                    </p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(permissions.userOrgRole)}`}>
                      <Shield className="h-4 w-4 mr-1" />
                      Your Role: {getRoleLabel(permissions.userOrgRole)}
                      {permissions.isPlatformAdmin && ' (Platform Admin)'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {permissions.canManageMembers && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/organizations/${orgId}/members`)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Members
                    </button>
                    <button
                      onClick={() => router.push(`/organizations/${orgId}/ai-config`)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Configuration
                    </button>
                    {permissions.isOrgSuperAdmin && (
                      <button
                        onClick={() => router.push(`/organizations/${orgId}/roles`)}
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Roles & Permissions
                      </button>
                    )}
                  </div>
                )}
              </div>

              {organization.description && (
                <p className="mt-6 text-gray-700 dark:text-gray-300">
                  {organization.description}
                </p>
              )}
            </div>

            {/* Organization Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Basic Information
                </h2>
                <dl className="space-y-4">
                  {organization.industry && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Industry</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                        {organization.industry}
                      </dd>
                    </div>
                  )}
                  {organization.size && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Organization Size</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 capitalize">
                        {organization.size}
                      </dd>
                    </div>
                  )}
                  {organization.website && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Website</dt>
                      <dd className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-1">
                        <a href={organization.website} target="_blank" rel="noopener noreferrer">
                          {organization.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Created</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(organization.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  {permissions.canManageMembers ? (
                    <>
                      <button
                        onClick={() => router.push(`/organizations/${orgId}/members`)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-3" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              View Members
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Manage organization members and roles
                            </div>
                          </div>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-gray-400 transform rotate-180 group-hover:translate-x-1 transition-transform" />
                      </button>

                      <button
                        onClick={() => router.push(`/organizations/${orgId}/ai-config`)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center">
                          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-3" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              AI Configuration
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Configure AI assistant welcome messages
                            </div>
                          </div>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-gray-400 transform rotate-180 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        You need super admin role to manage this organization
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
