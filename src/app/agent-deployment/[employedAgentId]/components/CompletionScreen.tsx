'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface CompletionScreenProps {
  deploymentId: string
  organizationId: string
  returnUrl: string
}

export default function CompletionScreen({
  deploymentId,
  organizationId,
  returnUrl
}: CompletionScreenProps) {
  const router = useRouter()
  const [agentName, setAgentName] = useState<string>('Knowledge Agent')

  useEffect(() => {
    // Fetch deployment details
    const fetchDeploymentDetails = async () => {
      try {
        const response = await fetch(`/api/agents/deployments/${deploymentId}`)
        if (response.ok) {
          const data = await response.json()
          setAgentName(data.agentName || 'Knowledge Agent')
        }
      } catch (error) {
        console.error('[CompletionScreen] Error fetching deployment:', error)
      }
    }

    fetchDeploymentDetails()
  }, [deploymentId])

  const handleViewDashboard = () => {
    router.push(`/organizations/${organizationId}/agents/${deploymentId}`)
  }

  const handleReturnToMarketplace = () => {
    router.push(returnUrl)
  }

  return (
    <div className="space-y-6 text-center py-8">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Agent Deployed Successfully! 🎉
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Your {agentName} is now active and ready to help your team.
        </p>
      </div>

      {/* What Happens Next */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-left">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4">
          What happens next?
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-900 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              1
            </div>
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Agent is listening in Slack
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200">
                Team members can mention @{agentName} in any channel or send direct messages
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-900 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              2
            </div>
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Searches your knowledge base
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200">
                When asked a question, the agent searches uploaded documents for relevant information
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-900 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              3
            </div>
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Provides instant answers
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200">
                Responses include source citations so your team knows where the information came from
              </div>
            </div>
          </li>
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Get Started
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Test in Slack
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Send a DM to @{agentName} to try it out
            </div>
          </div>
          <div className="text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              View Analytics
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Track usage and performance metrics
            </div>
          </div>
          <div className="text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Add More Docs
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Keep your knowledge base updated
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Pro Tip
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              The more documents you upload, the better your agent will perform. Add FAQs, policies, and procedures to help your team find answers faster.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
        <button
          onClick={handleViewDashboard}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          View Agent Dashboard
        </button>
        <button
          onClick={handleReturnToMarketplace}
          className="w-full sm:w-auto px-8 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-medium rounded-lg transition-colors"
        >
          Return to Marketplace
        </button>
      </div>
    </div>
  )
}
