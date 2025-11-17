'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SettingsFormProps {
  deploymentId: string
  organizationId: string
  config: {
    system_prompt: string
    response_tone: string
    enable_emoji: boolean
    escalation_channel: string
  }
  slackTeamName: string | null
}

export default function SettingsForm({ deploymentId, organizationId, config, slackTeamName }: SettingsFormProps) {
  const router = useRouter()
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt || '')
  const [responseTone, setResponseTone] = useState<'professional' | 'casual' | 'technical' | 'friendly'>(
    (config.response_tone as any) || 'professional'
  )
  const [enableEmoji, setEnableEmoji] = useState(config.enable_emoji !== false)
  const [escalationChannel, setEscalationChannel] = useState(config.escalation_channel || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/agents/deployments/${deploymentId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          responseTone,
          enableEmoji,
          escalationChannel
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Slack Connection Info */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Slack Connection
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {slackTeamName || 'Connected to Slack'}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Agent is active and listening for messages
            </div>
          </div>
          <span className="ml-auto px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
            Connected
          </span>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Custom Instructions
        </h2>
        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Additional Instructions (Optional)
          </label>
          <textarea
            id="systemPrompt"
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Add specific instructions for how the agent should behave. For example: 'Always be concise' or 'Use simple language for non-technical users'"
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            These instructions will be added to the agent's base behavior.
          </p>
        </div>
      </div>

      {/* Response Tone */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Response Style
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Response Tone
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['professional', 'casual', 'technical', 'friendly'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setResponseTone(tone)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  responseTone === tone
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-white mb-1 capitalize">
                  {tone}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {tone === 'professional' && 'Formal and business-appropriate'}
                  {tone === 'casual' && 'Relaxed and conversational'}
                  {tone === 'technical' && 'Detailed and precise'}
                  {tone === 'friendly' && 'Warm and approachable'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Emoji Toggle */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
          <input
            type="checkbox"
            id="enableEmoji"
            checked={enableEmoji}
            onChange={(e) => setEnableEmoji(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500"
          />
          <label htmlFor="enableEmoji" className="flex-1 cursor-pointer">
            <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Use emojis in responses
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Make responses more engaging with appropriate emojis 🎯
            </div>
          </label>
        </div>
      </div>

      {/* Escalation */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Escalation Settings
        </h2>
        <div>
          <label htmlFor="escalationChannel" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Escalation Channel (Optional)
          </label>
          <input
            type="text"
            id="escalationChannel"
            value={escalationChannel}
            onChange={(e) => setEscalationChannel(e.target.value)}
            placeholder="#support or #help-desk"
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            When the agent can't answer, it will suggest posting in this channel.
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">Settings saved successfully!</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => router.push(`/organizations/${organizationId}/agents/${deploymentId}`)}
          className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
