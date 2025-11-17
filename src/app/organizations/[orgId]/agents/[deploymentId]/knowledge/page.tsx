import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { query as dbQuery } from '@/lib/database'
import Link from 'next/link'
import KnowledgeManager from './KnowledgeManager'

interface PageProps {
  params: Promise<{ orgId: string; deploymentId: string }>
}

export default async function KnowledgeBasePage({ params }: PageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { orgId: organizationId, deploymentId } = await params

  // Verify user has access
  const membershipResult = await dbQuery(
    `SELECT om.* FROM organization_memberships om
     WHERE om.user_id = $1 AND om.organization_id = $2
     LIMIT 1`,
    [userId, organizationId]
  )

  if (membershipResult.rows.length === 0) {
    redirect('/unauthorized')
  }

  // Fetch deployment
  const deploymentResult = await dbQuery(
    `SELECT ad.* FROM agent_deployments ad
     WHERE ad.id = $1 AND ad.organization_id = $2
     LIMIT 1`,
    [deploymentId, organizationId]
  )

  if (deploymentResult.rows.length === 0) {
    redirect(`/organizations/${organizationId}`)
  }

  // Fetch knowledge base documents
  const documentsResult = await dbQuery(
    `SELECT id, source_type, title, content, metadata, created_at, created_by
     FROM agent_knowledge_base
     WHERE agent_deployment_id = $1
     ORDER BY created_at DESC`,
    [deploymentId]
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
          <span className="text-slate-900 dark:text-white">Knowledge Base</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Knowledge Base
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage documents that your agent uses to answer questions
          </p>
        </div>

        {/* Knowledge Manager */}
        <KnowledgeManager
          deploymentId={deploymentId}
          organizationId={organizationId}
          documents={documentsResult.rows}
        />
      </div>
    </div>
  )
}
