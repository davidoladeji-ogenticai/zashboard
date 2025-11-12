'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, Lock, Plus, Edit, X } from 'lucide-react'
import { Header } from '@/components/header'

interface Permission {
  id: string
  name: string
  display_name: string
  category: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string | null
  level: number
  is_system: boolean
  permissions?: Permission[]
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingPermissions, setUpdatingPermissions] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
    level: 10
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [])

  async function loadRoles() {
    try {
      const response = await fetch('/api/admin/roles')
      const data = await response.json()
      if (data.success) {
        setRoles(data.roles)
      }
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadPermissions() {
    try {
      const response = await fetch('/api/admin/permissions')
      const data = await response.json()
      if (data.success) {
        setPermissions(data.permissions)
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    }
  }

  async function loadRoleWithPermissions(roleId: string) {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        
      })
      const data = await response.json()
      if (data.success) {
        setSelectedRole(data.role)
        setSelectedPermissions(data.role.permissions.map((p: Permission) => p.id))
        setShowPermissionsModal(true)
      }
    } catch (error) {
      console.error('Error loading role details:', error)
    }
  }

  async function updateRolePermissions() {
    if (!selectedRole) return

    setUpdatingPermissions(true)
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: {
          
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissionIds: selectedPermissions })
      })

      const data = await response.json()

      if (data.success) {
        await loadRoles()
        setShowPermissionsModal(false)
        setSelectedRole(null)
      } else {
        alert(data.error || 'Failed to update permissions')
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      alert('Failed to update permissions')
    } finally {
      setUpdatingPermissions(false)
    }
  }

  function togglePermission(permissionId: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  async function createRole() {
    setCreating(true)
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRole)
      })

      const data = await response.json()

      if (data.success) {
        await loadRoles()
        setShowCreateModal(false)
        setNewRole({ name: '', display_name: '', description: '', level: 10 })
      } else {
        alert(data.error || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      alert('Failed to create role')
    } finally {
      setCreating(false)
    }
  }

  function getLevelBadgeColor(level: number): string {
    if (level >= 100) return 'bg-red-100 text-red-800'
    if (level >= 90) return 'bg-orange-100 text-orange-800'
    if (level >= 50) return 'bg-yellow-100 text-yellow-800'
    if (level >= 30) return 'bg-green-100 text-green-800'
    return 'bg-blue-100 text-blue-800'
  }

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading roles...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Roles Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage roles and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Role
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.filter((r) => r.is_system).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">System Roles</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.filter((r) => !r.is_system).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Custom Roles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.display_name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {role.description || 'No description provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelBadgeColor(role.level)}`}>
                  Level {role.level}
                </span>
                {role.is_system && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                    <Lock className="w-3 h-3" />
                    System
                  </span>
                )}
              </div>

              <button
                onClick={() => loadRoleWithPermissions(role.id)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Manage Permissions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Manage Permissions for {selectedRole.display_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Level {selectedRole.level} {selectedRole.is_system && '• System Role'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 capitalize">
                      {category} Permissions
                    </h4>
                    <div className="space-y-2">
                      {perms.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {permission.display_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {permission.name}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPermissions.length} of {permissions.length} permissions selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPermissionsModal(false)
                    setSelectedRole(null)
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={updatingPermissions}
                >
                  Cancel
                </button>
                <button
                  onClick={updateRolePermissions}
                  disabled={updatingPermissions}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {updatingPermissions ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Role
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewRole({ name: '', display_name: '', description: '', level: 10 })
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name (internal)
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., custom_role"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newRole.display_name}
                  onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                  placeholder="e.g., Custom Role"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Describe this role..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Level (10-100)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={newRole.level}
                  onChange={(e) => setNewRole({ ...newRole, level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Higher levels have more authority. Avoid 90-100 for non-admin roles.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewRole({ name: '', display_name: '', description: '', level: 10 })
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                disabled={creating || !newRole.name || !newRole.display_name}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {creating ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
