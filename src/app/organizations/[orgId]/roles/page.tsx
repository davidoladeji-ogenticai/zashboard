'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Plus, Edit2, Trash2, Users, AlertCircle, Key } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  level: number
  is_system: boolean
  is_active: boolean
  created_at: string
}

interface RoleWithCount extends Role {
  user_count?: number
  permission_count?: number
}

export default function OrganizationRolesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const router = useRouter()
  const { orgId } = use(params)
  const permissions = useOrgPermissions(orgId)
  const [roles, setRoles] = useState<RoleWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!permissions.loading) {
      // Check if user has permission to view roles
      if (!permissions.isOrgSuperAdmin) {
        router.push(`/organizations/${orgId}`)
      } else {
        loadRoles()
      }
    }
  }, [permissions.loading, permissions.isOrgSuperAdmin, orgId])

  async function loadRoles() {
    try {
      const response = await fetch(`/api/organizations/${orgId}/roles`)

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setRoles(data.data)
      } else {
        setError(data.error || 'Failed to load roles')
      }
    } catch (err) {
      console.error('Error loading roles:', err)
      setError('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteRole(roleId: string) {
    try {
      const response = await fetch(`/api/organizations/${orgId}/roles/${roleId}`, {
        method: 'DELETE'
      })

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setRoles(roles.filter(r => r.id !== roleId))
        setDeleteConfirm(null)
      } else {
        setError(data.error || 'Failed to delete role')
      }
    } catch (err) {
      console.error('Error deleting role:', err)
      setError('Failed to delete role')
    }
  }

  if (permissions.loading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading roles...</p>
          </div>
        </div>
      </div>
    )
  }

  const getLevelBadgeColor = (level: number) => {
    if (level >= 100) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    if (level >= 50) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/organizations/${orgId}`)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organization
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Roles & Permissions
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage access control for your organization
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/organizations/${orgId}/roles/new`)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Role</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Role Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {role.display_name}
                    </h3>
                    {role.is_system && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                        System
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(role.level)}`}>
                    Level {role.level}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {role.description || 'No description'}
              </p>

              {/* Stats */}
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Key className="h-4 w-4" />
                  <span>{role.permission_count || 0} permissions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{role.user_count || 0} users</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => router.push(`/organizations/${orgId}/roles/${role.id}`)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit</span>
                </button>

                {!role.is_system && (
                  <button
                    onClick={() => setDeleteConfirm(role.id)}
                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === role.id && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    Are you sure you want to delete this role?
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {roles.length === 0 && !loading && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No roles found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first custom role
            </p>
            <button
              onClick={() => router.push(`/organizations/${orgId}/roles/new`)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Role</span>
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Roles & Permissions
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• System roles cannot be deleted, but permissions can be modified</li>
            <li>• Role level determines hierarchy - higher levels have more authority</li>
            <li>• Users can have multiple roles in an organization</li>
            <li>• Permissions are cumulative across all assigned roles</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
