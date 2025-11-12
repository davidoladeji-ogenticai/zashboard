'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { PlatformAdminGuard } from '@/components/platform-admin-guard'
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Globe, Shield } from 'lucide-react'

interface SystemAIConfig {
  id: string
  welcome_messages: [string, string, string]
  welcome_title: string | null
  welcome_description: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export default function SystemAIConfigPage() {
  return (
    <PlatformAdminGuard>
      <SystemAIConfigContent />
    </PlatformAdminGuard>
  )
}

function SystemAIConfigContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState<SystemAIConfig | null>(null)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Form state
  const [welcomeTitle, setWelcomeTitle] = useState('')
  const [welcomeDescription, setWelcomeDescription] = useState('')
  const [welcomeMessages, setWelcomeMessages] = useState<[string, string, string]>(['', '', ''])
  const [enabled, setEnabled] = useState(true)

  // Load current system config
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setIsLoading(true)
    try {

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/ai-config`)

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load system AI configuration')
      }

      const systemConfig = data.data as SystemAIConfig
      setConfig(systemConfig)

      // Set form values
      setWelcomeTitle(systemConfig.welcome_title || '')
      setWelcomeDescription(systemConfig.welcome_description || '')
      setWelcomeMessages(systemConfig.welcome_messages)
      setEnabled(systemConfig.enabled)

    } catch (error) {
      console.error('Failed to load system AI config:', error)
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load configuration'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate messages
    if (welcomeMessages.some(msg => !msg.trim())) {
      setSaveStatus({ type: 'error', message: 'All welcome messages must be non-empty' })
      return
    }

    setIsSaving(true)
    setSaveStatus(null)

    try {

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/ai-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          welcome_title: welcomeTitle.trim() || undefined,
          welcome_description: welcomeDescription.trim() || undefined,
          welcome_messages: welcomeMessages.map(m => m.trim()),
          enabled
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update system AI configuration')
      }

      setSaveStatus({ type: 'success', message: 'System AI configuration saved successfully!' })

      // Reload config to show updated values
      await loadConfig()

    } catch (error) {
      console.error('Failed to save system AI config:', error)
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save configuration'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (config) {
      setWelcomeTitle(config.welcome_title || '')
      setWelcomeDescription(config.welcome_description || '')
      setWelcomeMessages(config.welcome_messages)
      setEnabled(config.enabled)
      setSaveStatus(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Loading system AI configuration...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System AI Configuration
            </h1>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              <Shield className="h-3 w-3" />
              Platform Admin Only
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Configure global AI Assistant settings that apply to all organizations by default
          </p>
        </div>

        {/* Info Alert */}
        <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            These settings serve as the default configuration for all organizations. Organizations can override these settings with their own custom configuration.
          </p>
        </div>

        {/* Configuration Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Global Welcome Configuration
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customize the default welcome screen shown to all users across all organizations
            </p>
          </div>

          {/* Card Content */}
          <div className="p-6 space-y-6">
            {/* Welcome Title */}
            <div className="space-y-2">
              <label htmlFor="welcome-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Welcome Title (Optional)
              </label>
              <input
                type="text"
                id="welcome-title"
                value={welcomeTitle}
                onChange={(e) => setWelcomeTitle(e.target.value)}
                placeholder="Welcome to AI Assistant"
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave empty to use default: &quot;Welcome to AI Assistant&quot;
              </p>
            </div>

            {/* Welcome Description */}
            <div className="space-y-2">
              <label htmlFor="welcome-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Welcome Description (Optional)
              </label>
              <input
                type="text"
                id="welcome-description"
                value={welcomeDescription}
                onChange={(e) => setWelcomeDescription(e.target.value)}
                placeholder="Your intelligent productivity companion"
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave empty to use default description
              </p>
            </div>

            {/* Welcome Messages */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Welcome Messages (Required)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configure exactly 3 suggested prompts shown to users by default
                </p>
              </div>

              {([0, 1, 2] as const).map((index) => (
                <div key={index} className="space-y-2">
                  <label htmlFor={`message-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Message {index + 1}
                  </label>
                  <input
                    type="text"
                    id={`message-${index}`}
                    value={welcomeMessages[index]}
                    onChange={(e) => {
                      const newMessages = [...welcomeMessages] as [string, string, string]
                      newMessages[index] = e.target.value
                      setWelcomeMessages(newMessages)
                    }}
                    placeholder={`Enter welcome message ${index + 1}...`}
                    disabled={isSaving}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Enable system-wide AI configuration
              </label>
            </div>

            {/* Status Messages */}
            {saveStatus && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                saveStatus.type === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              }`}>
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <p className={`text-sm ${
                  saveStatus.type === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-green-800 dark:text-green-200'
                }`}>
                  {saveStatus.message}
                </p>
              </div>
            )}

            {/* Current Config Info */}
            {config && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {new Date(config.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset Changes
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save System Configuration
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
