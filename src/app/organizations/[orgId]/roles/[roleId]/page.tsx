'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Save, AlertCircle, Info } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  level: number
  is_system: boolean
  permissions: Permission[]
}

export default function EditRolePage({ params }: { params: Promise<{ orgId: string; roleId: string }> }) {
  const router = useRouter()
  const { orgId, roleId } = use(params)
  const permissions = useOrgPermissions(orgId)

  const [role, setRole] = useState<Role | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!permissions.loading) {
      if (!permissions.isOrgSuperAdmin) {
        router.push(`/organizations/${orgId}`)
      } else {
        loadRole()
        loadPermissions()
      }
    }
  }, [permissions.loading, permissions.isOrgSuperAdmin, orgId, roleId])

  async function loadRole() {
    try {
      const response = await fetch(`/api/organizations/${orgId}/roles/${roleId}`)

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()
      if (data.success) {
        setRole(data.data)
        setDisplayName(data.data.display_name)
        setDescription(data.data.description || '')
        setSelectedPermissions(new Set(data.data.permissions.map((p: Permission) => p.id)))
      } else {
        setError(data.error || 'Failed to load role')
      }
    } catch (err) {
      console.error('Error loading role:', err)
      setError('Failed to load role')
    } finally {
      setLoading(false)
    }
  }

  async function loadPermissions() {
    try {
      const response = await fetch(`/api/organizations/${orgId}/permissions`)

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()
      if (data.success) {
        setAvailablePermissions(data.data)
      }
    } catch (err) {
      console.error('Error loading permissions:', err)
    }
  }

  function togglePermission(permId: string) {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permId)) {
      newSelected.delete(permId)
    } else {
      newSelected.add(permId)
    }
    setSelectedPermissions(newSelected)
  }

  function toggleCategory(category: string) {
    const categoryPerms = availablePermissions
      .filter(p => p.category === category)
      .map(p => p.id)

    const allSelected = categoryPerms.every(id => selectedPermissions.has(id))
    const newSelected = new Set(selectedPermissions)

    if (allSelected) {
      categoryPerms.forEach(id => newSelected.delete(id))
    } else {
      categoryPerms.forEach(id => newSelected.add(id))
    }

    setSelectedPermissions(newSelected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Update role basic info
      const roleResponse = await fetch(`/api/organizations/${orgId}/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName,
          description
        })
      })

      if (roleResponse.status === 401) {
        router.push('/sign-in')
        return
      }

      const roleData = await roleResponse.json()
      if (!roleData.success) {
        setError(roleData.error || 'Failed to update role')
        setSaving(false)
        return
      }

      // Update permissions
      const permResponse = await fetch(`/api/organizations/${orgId}/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissionIds: Array.from(selectedPermissions)
        })
      })

      if (permResponse.status === 401) {
        router.push('/sign-in')
        return
      }

      const permData = await permResponse.json()
      if (permData.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/organizations/${orgId}/roles`)
        }, 1500)
      } else {
        setError(permData.error || 'Failed to update permissions')
      }
    } catch (err) {
      console.error('Error updating role:', err)
      setError('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !role) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading role...</p>
          </div>
        </div>
      </div>
    )
  }

  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/organizations/${orgId}/roles`)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Edit Role
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {role.name} {role.is_system && '(System Role)'}
                </p>
              </div>
            </div>

            {role.is_system && (
              <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                System Role
              </span>
            )}
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">
              ✓ Role updated successfully! Redirecting...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* System Role Info */}
        {role.is_system && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This is a system role. You can update the display name, description, and permissions, but you cannot change the internal name or level.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Level (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Level
                </label>
                <div className="flex items-center space-x-4">
                  <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium">
                    {role.level}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {role.is_system ? 'System roles have fixed levels' : 'Role level cannot be changed'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Permissions
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Selected {selectedPermissions.size} of {availablePermissions.length} permissions
            </p>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, perms]) => {
                const allSelected = perms.every(p => selectedPermissions.has(p.id))
                const someSelected = perms.some(p => selectedPermissions.has(p.id))

                return (
                  <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {category}
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${
                          allSelected
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : someSelected
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Permissions List */}
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {perm.display_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {perm.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push(`/organizations/${orgId}/roles`)}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !displayName}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
