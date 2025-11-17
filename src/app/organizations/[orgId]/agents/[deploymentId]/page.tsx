import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { query as dbQuery } from '@/lib/database'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ orgId: string; deploymentId: string }>
}

export default async function AgentManagementPage({ params }: PageProps) {
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

  const membership = membershipResult.rows[0]

  // Fetch deployment details
  const deploymentResult = await dbQuery(
    `SELECT ad.*, asw.slack_team_name, asw.slack_team_id, asw.is_active as slack_active
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
  const config = configResult.rows[0]

  // Fetch knowledge base stats
  const kbStatsResult = await dbQuery(
    `SELECT COUNT(*) as total_documents,
            COUNT(CASE WHEN source_type = 'upload' THEN 1 END) as uploaded_docs,
            COUNT(CASE WHEN source_type = 'integration' THEN 1 END) as integration_docs
     FROM agent_knowledge_base
     WHERE agent_deployment_id = $1`,
    [deploymentId]
  )
  const kbStats = kbStatsResult.rows[0]

  // Fetch execution stats (last 30 days)
  const executionStatsResult = await dbQuery(
    `SELECT
       COUNT(*) as total_executions,
       COUNT(CASE WHEN error_message IS NULL THEN 1 END) as successful,
       COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as failed,
       AVG(execution_time_ms) as avg_duration,
       SUM(tokens_used) as total_tokens
     FROM agent_executions
     WHERE agent_deployment_id = $1
       AND created_at >= NOW() - INTERVAL '30 days'`,
    [deploymentId]
  )
  const executionStats = executionStatsResult.rows[0]

  // Fetch recent executions
  const recentExecutionsResult = await dbQuery(
    `SELECT id, execution_type, input_data, output_data, error_message, execution_time_ms, created_at
     FROM agent_executions
     WHERE agent_deployment_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [deploymentId]
  )
  const recentExecutions = recentExecutionsResult.rows

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
            <Link href={`/organizations/${organizationId}`} className="hover:text-slate-900 dark:hover:text-white">
              {membership.organization_name}
            </Link>
            <span>/</span>
            <span>Agents</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Slack Knowledge Agent</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Slack Knowledge Agent
              </h1>
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  deployment.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    deployment.status === 'active' ? 'bg-green-600 dark:bg-green-400' : 'bg-yellow-600 dark:bg-yellow-400'
                  }`} />
                  {deployment.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                {deployment.slack_team_name && (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Connected to <span className="font-medium text-slate-900 dark:text-white">{deployment.slack_team_name}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/organizations/${organizationId}/agents/${deploymentId}/settings`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Settings
              </Link>
              <Link
                href={`/organizations/${organizationId}/agents/${deploymentId}/knowledge`}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Manage Knowledge
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Queries</span>
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {executionStats.total_executions || 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">Last 30 days</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Success Rate</span>
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {executionStats.total_executions > 0
                ? Math.round((executionStats.successful / executionStats.total_executions) * 100)
                : 0}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {executionStats.successful || 0} successful
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Response Time</span>
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {executionStats.avg_duration ? Math.round(executionStats.avg_duration) : 0}ms
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">Average duration</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Knowledge Base</span>
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {kbStats.total_documents || 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">Documents indexed</div>
          </div>
        </div>

        {/* Configuration Overview */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuration</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Response Tone</h3>
                <p className="text-slate-900 dark:text-white capitalize">{config?.response_tone || 'Professional'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Emojis</h3>
                <p className="text-slate-900 dark:text-white">{config?.enable_emoji ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Escalation Channel</h3>
                <p className="text-slate-900 dark:text-white">{config?.escalation_channel || 'Not set'}</p>
              </div>
            </div>
            {config?.system_prompt && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Custom Instructions</h3>
                <p className="text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                  {config.system_prompt}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentExecutions.length > 0 ? (
                  recentExecutions.map((execution) => {
                    const inputText = typeof execution.input_data === 'object'
                      ? execution.input_data?.question || execution.input_data?.text || JSON.stringify(execution.input_data)
                      : execution.input_data
                    const isSuccess = !execution.error_message

                    return (
                      <tr key={execution.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {new Date(execution.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white max-w-md truncate">
                          {inputText || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            isSuccess
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                          }`}>
                            {isSuccess ? 'success' : 'error'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {execution.execution_time_ms || 0}ms
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-500">
                      No activity yet. Start asking questions in Slack!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
