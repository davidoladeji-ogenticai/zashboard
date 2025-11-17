'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Step1ConnectSlack from './Step1ConnectSlack'
import Step2KnowledgeBase from './Step2KnowledgeBase'
import Step3Configure from './Step3Configure'
import CompletionScreen from './CompletionScreen'

interface DeploymentWizardProps {
  deployment: {
    id: string
    organization_id: string
    employed_agent_id: string
    agent_type: string
    status: string
    config: Record<string, any>
  }
  organizationId: string
  returnUrl: string
}

type WizardStep = 1 | 2 | 3 | 'complete'

export default function DeploymentWizard({
  deployment,
  organizationId,
  returnUrl
}: DeploymentWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [slackConnection, setSlackConnection] = useState<{
    slackTeamId?: string
    slackTeamName?: string
    botToken?: string
  } | null>(null)
  const [knowledgeBase, setKnowledgeBase] = useState<{
    documentCount: number
    sources: string[]
  } | null>(null)
  const [configuration, setConfiguration] = useState<{
    systemPrompt?: string
    responseTone?: string
    enableEmoji?: boolean
    escalationChannel?: string
  } | null>(null)

  const handleStep1Complete = (data: {
    slackTeamId: string
    slackTeamName: string
    botToken: string
  }) => {
    setSlackConnection(data)
    setCurrentStep(2)
  }

  const handleStep2Complete = (data: {
    documentCount: number
    sources: string[]
  }) => {
    setKnowledgeBase(data)
    setCurrentStep(3)
  }

  const handleStep3Complete = async (data: {
    systemPrompt?: string
    responseTone?: string
    enableEmoji?: boolean
    escalationChannel?: string
  }) => {
    setConfiguration(data)

    // Activate deployment
    try {
      const response = await fetch(`/api/agents/deployments/${deployment.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackConnection,
          knowledgeBase,
          configuration: data
        })
      })

      if (!response.ok) {
        throw new Error('Failed to activate deployment')
      }

      setCurrentStep('complete')
    } catch (error) {
      console.error('[DeploymentWizard] Activation error:', error)
      alert('Failed to activate agent. Please try again.')
    }
  }

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1)
    if (currentStep === 3) setCurrentStep(2)
  }

  const handleExit = () => {
    router.push(returnUrl)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleExit}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exit Setup
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Deploy Slack Knowledge Agent
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Set up your AI-powered knowledge assistant in just 3 steps
          </p>
        </div>

        {/* Progress Bar */}
        {currentStep !== 'complete' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <span className="text-sm font-medium">Connect Slack</span>
              </div>
              <div className={`flex-1 h-1 mx-4 rounded ${currentStep >= 2 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <span className="text-sm font-medium">Add Knowledge</span>
              </div>
              <div className={`flex-1 h-1 mx-4 rounded ${currentStep >= 3 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  3
                </div>
                <span className="text-sm font-medium">Configure</span>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {currentStep === 1 && (
            <Step1ConnectSlack
              deploymentId={deployment.id}
              organizationId={organizationId}
              onComplete={handleStep1Complete}
              onCancel={handleExit}
            />
          )}

          {currentStep === 2 && (
            <Step2KnowledgeBase
              deploymentId={deployment.id}
              organizationId={organizationId}
              onComplete={handleStep2Complete}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <Step3Configure
              deploymentId={deployment.id}
              organizationId={organizationId}
              onComplete={handleStep3Complete}
              onBack={handleBack}
            />
          )}

          {currentStep === 'complete' && (
            <CompletionScreen
              deploymentId={deployment.id}
              organizationId={organizationId}
              returnUrl={returnUrl}
            />
          )}
        </div>
      </div>
    </div>
  )
}
