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

export default function NewRolePage({ params }: { params: Promise<{ orgId: string }> }) {
  const router = useRouter()
  const { orgId } = use(params)
  const permissions = useOrgPermissions(orgId)

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState(30)
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!permissions.loading) {
      if (!permissions.isOrgSuperAdmin) {
        router.push(`/organizations/${orgId}`)
      } else {
        loadPermissions()
      }
    }
  }, [permissions.loading, permissions.isOrgSuperAdmin, orgId])

  // Auto-generate name from display name
  useEffect(() => {
    if (displayName && !name) {
      const generatedName = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
      setName(generatedName)
    }
  }, [displayName])

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
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          displayName,
          description,
          level
        })
      })

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        // Assign permissions to the new role
        if (selectedPermissions.size > 0) {
          const permResponse = await fetch(`/api/organizations/${orgId}/roles/${data.data.id}/permissions`, {
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
        }

        setSuccess(true)
        setTimeout(() => {
          router.push(`/organizations/${orgId}/roles`)
        }, 1500)
      } else {
        setError(data.error || 'Failed to create role')
      }
    } catch (err) {
      console.error('Error creating role:', err)
      setError('Failed to create role')
    } finally {
      setLoading(false)
    }
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

          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create New Role
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Define a custom role with specific permissions
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">
              ✓ Role created successfully! Redirecting...
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
                  placeholder="e.g., Content Manager"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Internal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Internal Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., content_manager"
                  required
                  pattern="[a-z0-9_]+"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Lowercase letters, numbers, and underscores only
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this role can do..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Level: {level}
                </label>
                <input
                  type="range"
                  min="11"
                  max="99"
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>11 (Lowest)</span>
                  <span>99 (Highest, below Super Admin)</span>
                </div>
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Level determines hierarchy. Users can only assign roles with levels lower than their highest role. Level 100 is reserved for Super Admin.
                    </p>
                  </div>
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
              Select {selectedPermissions.size} of {availablePermissions.length} permissions
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
              disabled={loading || !displayName || !name}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Creating...' : 'Create Role'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
