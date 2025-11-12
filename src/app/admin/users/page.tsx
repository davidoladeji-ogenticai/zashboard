'use client'

import { useState, useEffect } from 'react'
import { Users, UserCog, Shield, Clock, Calendar } from 'lucide-react'
import { Header } from '@/components/header'

interface Role {
  id: string
  name: string
  display_name: string
  level: number
}

interface User {
  id: string
  email: string
  name: string
  registration_source: 'zing' | 'web'
  createdAt: string
  lastLogin: string | null
  is_active: boolean
  roles: Role[]
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [assigningRole, setAssigningRole] = useState(false)
  const [filterSource, setFilterSource] = useState<string>('all')

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  async function loadUsers() {
    try {
      const response = await fetch('/api/admin/users', {
        
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRoles() {
    try {
      const response = await fetch('/api/admin/roles', {
        
      })
      const data = await response.json()
      if (data.success) {
        setAllRoles(data.roles)
      }
    } catch (error) {
      console.error('Error loading roles:', error)
    }
  }

  async function assignRole(userId: string, roleId: string) {
    setAssigningRole(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId })
      })

      const data = await response.json()

      if (data.success) {
        await loadUsers()
        setShowRoleModal(false)
        setSelectedUser(null)
      } else {
        alert(data.error || 'Failed to assign role')
      }
    } catch (error) {
      console.error('Error assigning role:', error)
      alert('Failed to assign role')
    } finally {
      setAssigningRole(false)
    }
  }

  async function removeRole(userId: string, roleId: string) {
    if (!confirm('Are you sure you want to remove this role?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/roles?roleId=${roleId}`, {
        method: 'DELETE',
        
      })

      const data = await response.json()

      if (data.success) {
        await loadUsers()
      } else {
        alert(data.error || 'Failed to remove role')
      }
    } catch (error) {
      console.error('Error removing role:', error)
      alert('Failed to remove role')
    }
  }

  function getSourceBadge(source: string) {
    const badges = {
      zing: { emoji: '🦊', label: 'Zing', color: 'bg-orange-100 text-orange-800' },
      web: { emoji: '🌐', label: 'Web', color: 'bg-blue-100 text-blue-800' }
    }
    const badge = badges[source as keyof typeof badges] || { emoji: '❓', label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        <span>{badge.emoji}</span>
        <span>{badge.label}</span>
      </span>
    )
  }

  function canAssignAdminRole(user: User): boolean {
    return user.registration_source !== 'zing'
  }

  const filteredUsers = filterSource === 'all'
    ? users
    : users.filter(u => u.registration_source === filterSource)

  const stats = {
    total: users.length,
    zing: users.filter(u => u.registration_source === 'zing').length,
    web: users.filter(u => u.registration_source === 'web').length,
    activeToday: users.filter(u =>
      u.lastLogin && new Date(u.lastLogin).toDateString() === new Date().toDateString()
    ).length
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage users and assign roles</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦊</span>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.zing}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zing Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.web}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Web Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeToday}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['all', 'zing', 'web'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterSource(filter)}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  filterSource === filter
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {filter === 'all' ? 'All Users' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Registered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSourceBadge(user.registration_source)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium"
                        >
                          <Shield className="w-3 h-3" />
                          {role.display_name}
                          <button
                            onClick={() => removeRole(user.id, role.id)}
                            className="ml-1 hover:text-purple-900"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">No roles assigned</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.lastLogin ? (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedUser(user)
                      setShowRoleModal(true)
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1 ml-auto"
                  >
                    <UserCog className="w-4 h-4" />
                    Manage Roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Assign Role to {selectedUser.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedUser.email}</p>
              {selectedUser.registration_source === 'zing' && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ This user registered via Zing Browser and cannot be assigned administrator roles.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Current roles:</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedUser.roles.length > 0 ? (
                  selectedUser.roles.map((role) => (
                    <span
                      key={role.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      {role.display_name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">No roles assigned</span>
                )}
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Assign new role:</p>
              <div className="space-y-2">
                {allRoles
                  .filter((role) => !selectedUser.roles.some((ur) => ur.id === role.id))
                  .map((role) => {
                    const isAdmin = role.level >= 90
                    const isDisabled = isAdmin && !canAssignAdminRole(selectedUser)

                    return (
                      <button
                        key={role.id}
                        onClick={() => !isDisabled && assignRole(selectedUser.id, role.id)}
                        disabled={isDisabled || assigningRole}
                        className={`w-full text-left p-3 rounded border ${
                          isDisabled
                            ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{role.display_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Level {role.level}</div>
                          </div>
                          {isDisabled && (
                            <span className="text-xs text-orange-600 dark:text-orange-400">Restricted</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false)
                  setSelectedUser(null)
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                disabled={assigningRole}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
