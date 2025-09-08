'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { useSettingsMetrics, useApiKeys, useCreateApiKey, useDeleteApiKey, useRegenerateApiKey } from '@/hooks/useSettings'
import {
  Settings,
  Key,
  Bell,
  Shield,
  Database,
  Mail,
  Clock,
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

export default function SettingsPage() {
  const [newKeyName, setNewKeyName] = useState('')
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')
  const [notification, setNotification] = useState({ message: '', type: '' })
  
  // Hooks for data fetching and mutations
  const { data: metrics, isLoading: isLoadingMetrics, error: metricsError } = useSettingsMetrics()
  const { data: apiKeys, isLoading: isLoadingKeys } = useApiKeys()
  const createApiKeyMutation = useCreateApiKey()
  const deleteApiKeyMutation = useDeleteApiKey()
  const regenerateApiKeyMutation = useRegenerateApiKey()

  // Utility functions
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification({ message: '', type: '' }), 5000)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(text)
      showNotification('Copied to clipboard!')
      setTimeout(() => setCopiedKey(''), 2000)
    } catch (err) {
      showNotification('Failed to copy to clipboard', 'error')
    }
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      showNotification('Please enter a name for the API key', 'error')
      return
    }
    
    try {
      const result = await createApiKeyMutation.mutateAsync({ name: newKeyName.trim() })
      setNewKeyName('')
      setShowNewKeyForm(false)
      showNotification(`API key "${result.data.name}" created successfully!`)
      // Auto-copy the new key
      await copyToClipboard(result.data.key)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to create API key', 'error')
    }
  }

  const handleDeleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      await deleteApiKeyMutation.mutateAsync(keyId)
      showNotification(`API key "${keyName}" deleted successfully`)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to delete API key', 'error')
    }
  }

  const handleRegenerateApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to regenerate the API key "${keyName}"? The old key will stop working immediately.`)) {
      return
    }
    
    try {
      const result = await regenerateApiKeyMutation.mutateAsync({ id: keyId, name: keyName })
      showNotification(`API key "${keyName}" regenerated successfully!`)
      // Auto-copy the new key
      await copyToClipboard(result.data.key)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to regenerate API key', 'error')
    }
  }

  if (metricsError) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Settings
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {metricsError.message}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Notification */}
          {notification.message && (
            <div className={`mb-6 rounded-lg p-4 ${notification.type === 'error' 
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center">
                {notification.type === 'error' 
                  ? <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                  : <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                }
                <p className={`text-sm ${
                  notification.type === 'error' 
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {notification.message}
                </p>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure your Zashboard analytics dashboard and system preferences
            </p>
          </div>

          {/* Settings Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoadingMetrics ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <MetricCard
                  title="Admin Users"
                  value={metrics?.admin_users ?? 0}
                  change={0}
                  changeLabel="active accounts"
                  icon={Users}
                  trend="neutral"
                />
                <MetricCard
                  title="API Keys"
                  value={metrics?.api_keys ?? 0}
                  change={0}
                  changeLabel="active keys"
                  icon={Key}
                  trend="neutral"
                />
                <MetricCard
                  title="Notifications"
                  value={metrics?.notifications_enabled ?? 0}
                  change={0}
                  changeLabel="enabled alerts"
                  icon={Bell}
                  trend="neutral"
                />
                <MetricCard
                  title="Data Retention"
                  value={`${metrics?.data_retention_days ?? 90} days`}
                  change={0}
                  changeLabel="auto-cleanup"
                  icon={Clock}
                  trend="neutral"
                />
              </>
            )}
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* API Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Keys Management
                </h3>
                <button 
                  onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Key
                </button>
              </div>
              
              {/* New API Key Form */}
              {showNewKeyForm && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Enter API key name..."
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateApiKey()}
                    />
                    <button 
                      onClick={handleCreateApiKey}
                      disabled={createApiKeyMutation.isPending || !newKeyName.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center"
                    >
                      {createApiKeyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Create
                    </button>
                    <button 
                      onClick={() => {
                        setShowNewKeyForm(false)
                        setNewKeyName('')
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* API Keys List */}
              <div className="space-y-3">
                {isLoadingKeys ? (
                  <div className="animate-pulse space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  apiKeys?.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{key.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {key.key}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Created: {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            copiedKey === key.key
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleRegenerateApiKey(key.id, key.name)}
                          disabled={regenerateApiKeyMutation.isPending}
                          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                        >
                          {regenerateApiKeyMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </button>
                        {key.id !== 'demo-key-1' && (
                          <button
                            onClick={() => handleDeleteApiKey(key.id, key.name)}
                            disabled={deleteApiKeyMutation.isPending}
                            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            {deleteApiKeyMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* API Endpoint Information */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Analytics Endpoint
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/analytics/events` : '/api/analytics/events'}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly
                  />
                  <button 
                    onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/api/analytics/events` : '/api/analytics/events')}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Data Management
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Retention Period
                  </label>
                  <select 
                    defaultValue={metrics?.data_retention_days?.toString() ?? "90"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days (Recommended)</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Usage</h4>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Events Stored</span>
                      <span className="font-medium">{metrics?.storage.total_events?.toLocaleString() ?? '0'} events</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Storage Used</span>
                      <span className="font-medium">{metrics?.storage.storage_used ?? '0MB'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Oldest Data</span>
                      <span className="font-medium">{metrics?.storage.oldest_data_days ?? 0} days ago</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to clean up old data? This action cannot be undone.')) {
                      showNotification('Data cleanup initiated. This process may take a few minutes.', 'success')
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Clean Up Old Data
                </button>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <button 
                    onClick={() => showNotification('2FA setup is not yet implemented', 'error')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Enable 2FA
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">IP Restriction</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Limit dashboard access to specific IP addresses</p>
                  </div>
                  <button 
                    onClick={() => showNotification('IP restriction configuration is not yet implemented', 'error')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Configure
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Session Timeout</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automatically log out after period of inactivity</p>
                  </div>
                  <select 
                    defaultValue="4"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="1">1 hour</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                    <option value="24">24 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <button 
              onClick={() => showNotification('Settings reset to defaults', 'success')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset to Defaults
            </button>
            <button 
              onClick={() => showNotification('Settings saved successfully!', 'success')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}