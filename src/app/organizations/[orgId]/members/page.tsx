'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Mail, Shield, Trash2, AlertCircle, Plus, X } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface Member {
  id: string
  user_id: string
  email: string
  name: string
  role: 'user' | 'admin' | 'super_admin'
  title?: string
  department?: string
  joined_at: string
}

export default function MembersManagementPage({ params }: { params: Promise<{ orgId: string }> }) {
  const router = useRouter()
  const { orgId } = use(params)
  const permissions = useOrgPermissions(orgId)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'user' | 'admin' | 'super_admin'>('user')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (!permissions.loading) {
      if (!permissions.canManageMembers) {
        router.push(`/organizations/${orgId}`)
      } else {
        loadMembers()
      }
    }
  }, [permissions.loading, permissions.canManageMembers, orgId])

  async function loadMembers() {
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`)

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setMembers(data.data)
      } else {
        setError(data.error || 'Failed to load members')
      }
    } catch (err) {
      console.error('Error loading members:', err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMember() {
    if (!newMemberEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    setIsAdding(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole
        })
      })

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('Member added successfully')
        setShowAddModal(false)
        setNewMemberEmail('')
        setNewMemberRole('user')
        await loadMembers()
      } else {
        setError(data.error || 'Failed to add member')
      }
    } catch (err) {
      console.error('Error adding member:', err)
      setError('Failed to add member')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleUpdateRole(userId: string, newRole: 'user' | 'admin' | 'super_admin') {
    if (userId === permissions.user?.id) {
      setError('You cannot change your own role')
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('Role updated successfully')
        await loadMembers()
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch (err) {
      console.error('Error updating role:', err)
      setError('Failed to update role')
    }
  }

  async function handleRemoveMember(userId: string, memberName: string) {
    if (userId === permissions.user?.id) {
      setError('You cannot remove yourself from the organization')
      return
    }

    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE'
      })

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('Member removed successfully')
        await loadMembers()
      } else {
        setError(data.error || 'Failed to remove member')
      }
    } catch (err) {
      console.error('Error removing member:', err)
      setError('Failed to remove member')
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

  if (permissions.loading || loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading members...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!permissions.canManageMembers) {
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
                You need super admin privileges to manage members.
              </p>
              <button
                onClick={() => router.push(`/organizations/${orgId}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Organization
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
            {/* Back Button */}
            <button
              onClick={() => router.push(`/organizations/${orgId}`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organization
            </button>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Manage Members
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Add, remove, and manage roles for organization members
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {/* Members Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {members.map((member) => {
                      const isCurrentUser = member.user_id === permissions.user?.id

                      return (
                        <tr key={member.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {member.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.user_id, e.target.value as any)}
                              disabled={isCurrentUser}
                              className={`${getRoleBadgeColor(member.role)} inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border-0 ${
                                isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <option value="user">Member</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                            {member.department || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveMember(member.user_id, member.name)}
                              disabled={isCurrentUser}
                              className={`text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ${
                                isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title={isCurrentUser ? 'Cannot remove yourself' : 'Remove member'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}

                    {members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">No members found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Add New Member
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    User must already have a Zashboard account
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Member</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={isAdding}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
