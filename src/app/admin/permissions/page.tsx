'use client'

import { useState, useEffect } from 'react'
import { Lock, Shield, CheckCircle, XCircle, Plus, X } from 'lucide-react'
import { Header } from '@/components/header'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string | null
  category: string
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  display_name: string
  level: number
  permissions?: Permission[]
}

interface RolePermissionMatrix {
  [roleId: string]: {
    [permissionId: string]: boolean
  }
}

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<RolePermissionMatrix>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPermission, setNewPermission] = useState({
    name: '',
    displayName: '',
    description: '',
    category: 'users',
    resource: '',
    action: 'read'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {

      // Load roles
      const rolesResponse = await fetch('/api/admin/roles', {
        
      })
      const rolesData = await rolesResponse.json()

      // Load permissions
      const permsResponse = await fetch('/api/admin/permissions', {
        
      })
      const permsData = await permsResponse.json()

      if (rolesData.success && permsData.success) {
        setRoles(rolesData.roles)
        setPermissions(permsData.permissions)

        // Load detailed role permissions
        const detailedRoles = await Promise.all(
          rolesData.roles.map(async (role: Role) => {
            const response = await fetch(`/api/admin/roles/${role.id}`, {
              
            })
            const data = await response.json()
            return data.success ? data.role : role
          })
        )

        // Build matrix
        const newMatrix: RolePermissionMatrix = {}
        detailedRoles.forEach((role) => {
          newMatrix[role.id] = {}
          permsData.permissions.forEach((perm: Permission) => {
            newMatrix[role.id][perm.id] =
              role.permissions?.some((p: Permission) => p.id === perm.id) || false
          })
        })

        setMatrix(newMatrix)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(permissions.map((p) => p.category)))]

  const filteredPermissions =
    selectedCategory === 'all'
      ? permissions
      : permissions.filter((p) => p.category === selectedCategory)

  // Group permissions by category
  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Auto-update name when resource or action changes
  useEffect(() => {
    if (newPermission.resource && newPermission.action) {
      setNewPermission(prev => ({
        ...prev,
        name: `${prev.resource}:${prev.action}`
      }))
    }
  }, [newPermission.resource, newPermission.action])

  async function createNewPermission() {
    setCreating(true)
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPermission)
      })

      const data = await response.json()

      if (data.success) {
        await loadData()
        setShowCreateModal(false)
        setNewPermission({
          name: '',
          displayName: '',
          description: '',
          category: 'users',
          resource: '',
          action: 'read'
        })
      } else {
        alert(data.error || 'Failed to create permission')
      }
    } catch (error) {
      console.error('Error creating permission:', error)
      alert('Failed to create permission')
    } finally {
      setCreating(false)
    }
  }

  function getLevelColor(level: number): string {
    if (level >= 100) return 'bg-red-600'
    if (level >= 90) return 'bg-orange-600'
    if (level >= 50) return 'bg-yellow-600'
    if (level >= 30) return 'bg-green-600'
    return 'bg-blue-600'
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading permissions matrix...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Permissions Matrix</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of role permissions across the system</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Permission
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Roles</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{permissions.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length - 1}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Permission Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedCategory === category
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="px-4 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getLevelColor(role.level)}`}></div>
                      <div className="whitespace-nowrap text-gray-900 dark:text-white">{role.display_name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">Level {role.level}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <>
                  <tr key={`category-${category}`} className="bg-gray-100 dark:bg-gray-900">
                    <td
                      colSpan={roles.length + 1}
                      className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white uppercase sticky left-0 bg-gray-100 dark:bg-gray-900"
                    >
                      {category}
                    </td>
                  </tr>
                  {perms.map((permission) => (
                    <tr key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {permission.display_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{permission.name}</div>
                      </td>
                      {roles.map((role) => (
                        <td key={role.id} className="px-4 py-4 text-center">
                          {matrix[role.id]?.[permission.id] ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Super Admin (100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Admin (90)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Analyst (50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Viewer (30)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">User (10)</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Has Permission</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">No Permission</span>
          </div>
        </div>
      </div>

      {/* Create Permission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Permission
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewPermission({
                    name: '',
                    displayName: '',
                    description: '',
                    category: 'users',
                    resource: '',
                    action: 'read'
                  })
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resource
                  </label>
                  <input
                    type="text"
                    value={newPermission.resource}
                    onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                    placeholder="e.g., reports"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Action
                  </label>
                  <select
                    value={newPermission.action}
                    onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="read">read</option>
                    <option value="write">write</option>
                    <option value="delete">delete</option>
                    <option value="manage">manage</option>
                    <option value="export">export</option>
                    <option value="assign">assign</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name (auto-generated)
                </label>
                <input
                  type="text"
                  value={newPermission.name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Auto-generated from resource:action
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newPermission.displayName}
                  onChange={(e) => setNewPermission({ ...newPermission, displayName: e.target.value })}
                  placeholder="e.g., View Reports"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newPermission.category}
                  onChange={(e) => setNewPermission({ ...newPermission, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="users">Users</option>
                  <option value="analytics">Analytics</option>
                  <option value="roles">Roles</option>
                  <option value="permissions">Permissions</option>
                  <option value="system">System</option>
                  <option value="settings">Settings</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  placeholder="Describe this permission..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewPermission({
                    name: '',
                    displayName: '',
                    description: '',
                    category: 'users',
                    resource: '',
                    action: 'read'
                  })
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createNewPermission}
                disabled={creating || !newPermission.resource || !newPermission.displayName}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {creating ? 'Creating...' : 'Create Permission'}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
