'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Search, Shield, AlertCircle } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  size?: string
  industry?: string
  created_at: string
  member_count?: number
  ai_configured?: boolean
}

export default function AllOrganizationsPage() {
  const router = useRouter()
  const { isPlatformAdmin, loading: permissionsLoading } = useOrgPermissions()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isPlatformAdmin) {
        // Not authorized, redirect to my organizations
        router.push('/organizations')
      } else {
        loadOrganizations()
      }
    }
  }, [permissionsLoading, isPlatformAdmin])

  useEffect(() => {
    // Filter organizations based on search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredOrgs(
        organizations.filter(
          org =>
            org.name.toLowerCase().includes(query) ||
            org.slug.toLowerCase().includes(query) ||
            org.description?.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredOrgs(organizations)
    }
  }, [searchQuery, organizations])

  async function loadOrganizations() {
    try {
      // For platform admin, we need to fetch all organizations
      // This will require a new API endpoint or modifying the existing one
      const response = await fetch('/api/organizations')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/sign-in')
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Transform the data to match our interface
        const orgs = data.data.organizations.map((org: any) => ({
          id: org.membership.organization_id,
          name: org.membership.organization.name,
          slug: org.membership.organization.slug,
          description: org.membership.organization.description,
          logo_url: org.membership.organization.logo_url,
          created_at: org.membership.organization.created_at,
          member_count: 1, // We'll need to get this from API
          ai_configured: org.ai_config?.enabled || false
        }))
        setOrganizations(orgs)
        setFilteredOrgs(orgs)
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

  // Access denied state
  if (!isPlatformAdmin) {
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
                You need platform administrator privileges to view all organizations.
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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center mb-2">
                    <Shield className="h-8 w-8 text-blue-600 mr-3" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      All Organizations
                    </h1>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Platform administrator view of all organizations in the system
                  </p>
                </div>

                <button
                  onClick={() => router.push('/organizations')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                >
                  My Organizations
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search organizations by name, slug, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Total Organizations
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {organizations.length}
                    </p>
                  </div>
                  <Building2 className="h-12 w-12 text-blue-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      With AI Configured
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {organizations.filter(o => o.ai_configured).length}
                    </p>
                  </div>
                  <Shield className="h-12 w-12 text-purple-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Active Search Results
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {filteredOrgs.length}
                    </p>
                  </div>
                  <Search className="h-12 w-12 text-green-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Organizations Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Slug
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        AI Config
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredOrgs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            {searchQuery ? 'No organizations match your search' : 'No organizations found'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredOrgs.map((org) => (
                        <tr
                          key={org.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => router.push(`/organizations/${org.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {org.logo_url ? (
                                <img
                                  src={org.logo_url}
                                  alt={org.name}
                                  className="h-10 w-10 rounded-lg mr-3"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {org.name}
                                </div>
                                {org.description && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {org.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              @{org.slug}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {org.industry || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {org.size || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {org.ai_configured ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                Configured
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                Not Set
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(org.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/organizations/${org.id}/members`)
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                            >
                              Manage
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/organizations/${org.id}/ai-config`)
                              }}
                              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                              AI Config
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
