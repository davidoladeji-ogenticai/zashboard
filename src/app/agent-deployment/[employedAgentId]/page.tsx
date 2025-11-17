import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { query as dbQuery } from '@/lib/database'
import DeploymentWizard from './components/DeploymentWizard'

interface PageProps {
  params: Promise<{ employedAgentId: string }>
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function AgentDeploymentPage({ params, searchParams }: PageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { employedAgentId } = await params
  const { returnUrl } = await searchParams

  console.log(`[Deployment] Loading wizard for employedAgentId: ${employedAgentId}`)

  // Check if deployment already exists
  const existingDeploymentResult = await dbQuery(
    'SELECT * FROM agent_deployments WHERE employed_agent_id = $1 LIMIT 1',
    [employedAgentId]
  )

  // If exists and active, redirect to management page
  if (existingDeploymentResult.rows.length > 0) {
    const deployment = existingDeploymentResult.rows[0]
    if (deployment.status === 'active') {
      console.log(`[Deployment] Already active, redirecting to management`)
      return redirect(`/organizations/${deployment.organization_id}/agents/${deployment.id}`)
    }
  }

  // Get or create user's organization
  const orgResult = await dbQuery(
    `SELECT o.* FROM organizations o
     JOIN organization_memberships om ON o.id = om.organization_id
     WHERE om.user_id = $1
     LIMIT 1`,
    [userId]
  )

  let organizationId: string

  if (orgResult.rows.length > 0) {
    organizationId = orgResult.rows[0].id
    console.log(`[Deployment] User has organization: ${organizationId}`)
  } else {
    // Create organization for user
    console.log(`[Deployment] Creating organization for user: ${userId}`)

    const orgInsertResult = await dbQuery(
      `INSERT INTO organizations (id, name, slug, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [
        `org_${userId.substring(0, 20)}_${Date.now()}`,
        'My Organization',
        `org-${userId.substring(5, 15)}-${Date.now()}`
      ]
    )

    organizationId = orgInsertResult.rows[0].id

    // Create membership
    await dbQuery(
      `INSERT INTO organization_memberships (id, user_id, organization_id, role, joined_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        `mem_${Date.now()}`,
        userId,
        organizationId,
        'super_admin'
      ]
    )

    console.log(`[Deployment] Created organization: ${organizationId}`)
  }

  // Create or get deployment
  let deployment

  if (existingDeploymentResult.rows.length > 0) {
    deployment = existingDeploymentResult.rows[0]
    console.log(`[Deployment] Using existing deployment: ${deployment.id}`)
  } else {
    // Try to insert, but handle conflicts gracefully
    const deploymentResult = await dbQuery(
      `INSERT INTO agent_deployments (
        id, organization_id, employed_agent_id, agent_type, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (organization_id, agent_type)
      DO UPDATE SET
        employed_agent_id = EXCLUDED.employed_agent_id,
        updated_at = NOW()
      RETURNING *`,
      [
        `deploy_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        organizationId,
        employedAgentId,
        'slack_knowledge_assistant',
        'pending'
      ]
    )

    deployment = deploymentResult.rows[0]
    console.log(`[Deployment] Created/updated deployment: ${deployment.id}`)
  }

  return (
    <DeploymentWizard
      deployment={deployment}
      organizationId={organizationId}
      returnUrl={returnUrl || process.env.NEXT_PUBLIC_OGENTS_MARKET_URL + '/my-agents'}
    />
  )
}
