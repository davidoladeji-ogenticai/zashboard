'use client'

import { useState } from 'react'

interface Step3ConfigureProps {
  deploymentId: string
  organizationId: string
  onComplete: (data: {
    systemPrompt?: string
    responseTone?: string
    enableEmoji?: boolean
    escalationChannel?: string
  }) => void
  onBack: () => void
}

export default function Step3Configure({
  deploymentId,
  organizationId,
  onComplete,
  onBack
}: Step3ConfigureProps) {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [responseTone, setResponseTone] = useState<'professional' | 'casual' | 'technical' | 'friendly'>('professional')
  const [enableEmoji, setEnableEmoji] = useState(true)
  const [escalationChannel, setEscalationChannel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onComplete({
        systemPrompt: systemPrompt || undefined,
        responseTone,
        enableEmoji,
        escalationChannel: escalationChannel || undefined
      })
    } catch (error) {
      console.error('[Step3Configure] Error:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Configure Your Agent
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Customize how your agent behaves and responds to questions.
        </p>
      </div>

      {/* System Prompt */}
      <div>
        <label htmlFor="systemPrompt" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
          Custom Instructions (Optional)
        </label>
        <textarea
          id="systemPrompt"
          rows={4}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Add any specific instructions for how the agent should behave. For example: 'Always be concise' or 'Use simple language for non-technical users'"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          These instructions will be added to the agent's base behavior.
        </p>
      </div>

      {/* Response Tone */}
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
          Response Tone
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setResponseTone('professional')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              responseTone === 'professional'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="font-medium text-slate-900 dark:text-white mb-1">Professional</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Formal and business-appropriate
            </div>
          </button>
          <button
            type="button"
            onClick={() => setResponseTone('casual')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              responseTone === 'casual'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="font-medium text-slate-900 dark:text-white mb-1">Casual</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Relaxed and conversational
            </div>
          </button>
          <button
            type="button"
            onClick={() => setResponseTone('technical')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              responseTone === 'technical'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="font-medium text-slate-900 dark:text-white mb-1">Technical</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Detailed and precise
            </div>
          </button>
          <button
            type="button"
            onClick={() => setResponseTone('friendly')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              responseTone === 'friendly'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="font-medium text-slate-900 dark:text-white mb-1">Friendly</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Warm and approachable
            </div>
          </button>
        </div>
      </div>

      {/* Enable Emoji */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
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

      {/* Escalation Channel */}
      <div>
        <label htmlFor="escalationChannel" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
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
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          When the agent can't answer, it will suggest posting in this channel.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Response Preview
        </h3>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-slate-900 dark:text-white">
            {responseTone === 'professional' && (
              <>
                Good morning! I'd be happy to help you with that question. Based on our documentation...
                {enableEmoji && ' 📚'}
              </>
            )}
            {responseTone === 'casual' && (
              <>
                Hey there! Sure thing, let me look that up for you...
                {enableEmoji && ' 👍'}
              </>
            )}
            {responseTone === 'technical' && (
              <>
                According to the technical specifications in section 3.2, the implementation requires...
                {enableEmoji && ' ⚙️'}
              </>
            )}
            {responseTone === 'friendly' && (
              <>
                Hi! I'm here to help! Let me find that information for you...
                {enableEmoji && ' 😊'}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Activating Agent...
            </>
          ) : (
            'Complete Setup'
          )}
        </button>
      </div>
    </form>
  )
}
