'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Header } from '@/components/header'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface AIConfig {
  id: string
  organization_id: string
  welcome_messages: [string, string, string]
  welcome_title?: string
  welcome_description?: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export default function AIConfigurationPage({ params }: { params: Promise<{ orgId: string }> }) {
  const router = useRouter()
  const { orgId } = use(params)
  const permissions = useOrgPermissions(orgId)
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [welcomeTitle, setWelcomeTitle] = useState('')
  const [welcomeDescription, setWelcomeDescription] = useState('')
  const [message1, setMessage1] = useState('')
  const [message2, setMessage2] = useState('')
  const [message3, setMessage3] = useState('')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!permissions.loading) {
      if (!permissions.canConfigureAI) {
        router.push(`/organizations/${orgId}`)
      } else {
        loadAIConfig()
      }
    }
  }, [permissions.loading, permissions.canConfigureAI, orgId])

  async function loadAIConfig() {
    try {
      const response = await fetch(`/api/organizations/${orgId}/ai-config`)

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success && data.data) {
        const cfg = data.data
        setConfig(cfg)
        setWelcomeTitle(cfg.welcome_title || '')
        setWelcomeDescription(cfg.welcome_description || '')
        setMessage1(cfg.welcome_messages[0] || '')
        setMessage2(cfg.welcome_messages[1] || '')
        setMessage3(cfg.welcome_messages[2] || '')
        setEnabled(cfg.enabled)
      } else {
        // No config exists yet, use defaults
        setWelcomeTitle('')
        setWelcomeDescription('')
        setMessage1("What's the most urgent thing I should handle now?")
        setMessage2('Summarize the last team Slack thread')
        setMessage3('What\'s one task in my mail I can finish in 10 minutes?')
        setEnabled(true)
      }
    } catch (err) {
      console.error('Error loading AI config:', err)
      setError('Failed to load AI configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    // Validation
    if (!message1.trim() || !message2.trim() || !message3.trim()) {
      setError('All three welcome messages are required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/ai-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          welcome_title: welcomeTitle.trim() || undefined,
          welcome_description: welcomeDescription.trim() || undefined,
          welcome_messages: [
            message1.trim(),
            message2.trim(),
            message3.trim()
          ],
          enabled
        })
      })

      if (response.status === 401) {
        router.push('/sign-in')
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('AI configuration saved successfully! Changes will apply immediately in Zing Browser.')
        setConfig(data.data)
      } else {
        setError(data.error || 'Failed to save AI configuration')
      }
    } catch (err) {
      console.error('Error saving AI config:', err)
      setError('Failed to save AI configuration')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (!confirm('Reset to default welcome messages?')) {
      return
    }

    setWelcomeTitle('')
    setWelcomeDescription('')
    setMessage1("What's the most urgent thing I should handle now?")
    setMessage2('Summarize the last team Slack thread')
    setMessage3('What\'s one task in my mail I can finish in 10 minutes?')
    setEnabled(true)
    setSuccess(null)
    setError(null)
  }

  if (permissions.loading || loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading AI configuration...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!permissions.canConfigureAI) {
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
                You need super admin privileges to configure AI settings.
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
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => router.push(`/organizations/${orgId}`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organization
            </button>

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center mb-2">
                <Sparkles className="h-8 w-8 text-purple-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  AI Assistant Configuration
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Customize the welcome messages shown to organization members when they open the AI Assistant in Zing Browser
              </p>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {/* Configuration Form */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Enable Custom Welcome Messages
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    When disabled, users will see the default Zing welcome messages
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Welcome Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Welcome Title <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={welcomeTitle}
                  onChange={(e) => setWelcomeTitle(e.target.value)}
                  placeholder="Welcome to Zing! Your AI chat assistant"
                  disabled={!enabled}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to use the default title
                </p>
              </div>

              {/* Welcome Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Welcome Description <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  value={welcomeDescription}
                  onChange={(e) => setWelcomeDescription(e.target.value)}
                  placeholder="Zing is your AI browser that acts, not just shows data..."
                  disabled={!enabled}
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to use the default description
                </p>
              </div>

              {/* Welcome Messages */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Welcome Messages <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    These three suggested prompts will be shown to users. Make them relevant to your organization's use cases.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message 1
                  </label>
                  <input
                    type="text"
                    value={message1}
                    onChange={(e) => setMessage1(e.target.value)}
                    placeholder="Enter first welcome message..."
                    disabled={!enabled}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message 2
                  </label>
                  <input
                    type="text"
                    value={message2}
                    onChange={(e) => setMessage2(e.target.value)}
                    placeholder="Enter second welcome message..."
                    disabled={!enabled}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message 3
                  </label>
                  <input
                    type="text"
                    value={message3}
                    onChange={(e) => setMessage3(e.target.value)}
                    placeholder="Enter third welcome message..."
                    disabled={!enabled}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Preview in Zing Browser
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  {welcomeTitle || 'Welcome to Zing! Your AI chat assistant'}
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
                  {welcomeDescription || 'Zing is your AI browser that acts, not just shows data. Here are a few refined options you can pick from (or mix)'}
                </p>
                <div className="space-y-2">
                  {[message1, message2, message3].map((msg, idx) => (
                    msg.trim() && (
                      <div key={idx} className="bg-white dark:bg-gray-800 px-3 py-2 rounded text-xs text-gray-900 dark:text-gray-100">
                        {msg}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>

              {/* Info Footer */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 <strong>Tip:</strong> Changes apply immediately. All organization members using Zing Browser will see the updated messages when they open the AI Assistant.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
