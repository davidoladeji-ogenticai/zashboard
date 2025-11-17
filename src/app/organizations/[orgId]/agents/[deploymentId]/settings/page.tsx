import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { query as dbQuery } from '@/lib/database'
import Link from 'next/link'
import SettingsForm from './SettingsForm'

interface PageProps {
  params: Promise<{ orgId: string; deploymentId: string }>
}

export default async function AgentSettingsPage({ params }: PageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { orgId: organizationId, deploymentId } = await params

  // Verify user has access to this organization
  const membershipResult = await dbQuery(
    `SELECT om.*, o.name as organization_name
     FROM organization_memberships om
     JOIN organizations o ON om.organization_id = o.id
     WHERE om.user_id = $1 AND om.organization_id = $2
     LIMIT 1`,
    [userId, organizationId]
  )

  if (membershipResult.rows.length === 0) {
    redirect('/unauthorized')
  }

  // Fetch deployment
  const deploymentResult = await dbQuery(
    `SELECT ad.*, asw.slack_team_name
     FROM agent_deployments ad
     LEFT JOIN agent_slack_workspaces asw ON ad.id = asw.agent_deployment_id
     WHERE ad.id = $1 AND ad.organization_id = $2
     LIMIT 1`,
    [deploymentId, organizationId]
  )

  if (deploymentResult.rows.length === 0) {
    redirect(`/organizations/${organizationId}`)
  }

  const deployment = deploymentResult.rows[0]

  // Fetch configuration
  const configResult = await dbQuery(
    `SELECT * FROM agent_configurations WHERE agent_deployment_id = $1 LIMIT 1`,
    [deploymentId]
  )

  const config = configResult.rows[0] || {
    system_prompt: '',
    response_tone: 'professional',
    enable_emoji: true,
    escalation_channel: ''
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
          <Link href={`/organizations/${organizationId}`} className="hover:text-slate-900 dark:hover:text-white">
            Organization
          </Link>
          <span>/</span>
          <Link href={`/organizations/${organizationId}/agents/${deploymentId}`} className="hover:text-slate-900 dark:hover:text-white">
            Slack Knowledge Agent
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white">Settings</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Agent Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Configure how your agent behaves and responds to questions
          </p>
        </div>

        {/* Settings Form */}
        <SettingsForm
          deploymentId={deploymentId}
          organizationId={organizationId}
          config={config}
          slackTeamName={deployment.slack_team_name}
        />
      </div>
    </div>
  )
}
