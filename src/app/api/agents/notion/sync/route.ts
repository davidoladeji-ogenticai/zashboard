import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'
import { syncNotionForDeployment } from '@/lib/services/notion-sync'

/**
 * POST /api/agents/notion/sync
 * Triggers a manual sync of Notion pages for a specific agent deployment
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { deploymentId } = body

    if (!deploymentId) {
      return NextResponse.json(
        { success: false, error: 'deploymentId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this deployment
    const deploymentResult = await dbQuery(
      `SELECT ad.*, ad.organization_id
       FROM agent_deployments ad
       JOIN organization_memberships om ON ad.organization_id = om.organization_id
       WHERE ad.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [deploymentId, userId]
    )

    if (deploymentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to deployment' },
        { status: 403 }
      )
    }

    // Check if Notion connection exists
    const connectionResult = await dbQuery(
      `SELECT * FROM agent_notion_connections WHERE agent_deployment_id = $1 LIMIT 1`,
      [deploymentId]
    )

    if (connectionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Notion connection found. Please connect Notion first.' },
        { status: 400 }
      )
    }

    const connection = connectionResult.rows[0]

    // Check if sync is already in progress
    if (connection.sync_status === 'syncing') {
      return NextResponse.json(
        { success: false, error: 'Sync is already in progress' },
        { status: 409 }
      )
    }

    console.log('[Notion Sync API] Starting sync for deployment:', deploymentId)

    // Set sync status to 'syncing' and reset progress
    await dbQuery(
      `UPDATE agent_notion_connections
       SET sync_status = 'syncing',
           authorized_pages = jsonb_build_object('progress', jsonb_build_object('current', 0, 'total', 0, 'currentPage', 'Initializing...')),
           updated_at = NOW()
       WHERE agent_deployment_id = $1`,
      [deploymentId]
    )

    // Start sync in background
    syncNotionForDeployment(deploymentId)
      .then(stats => {
        console.log('[Notion Sync API] Sync completed:', stats)
        // Update to completed status
        dbQuery(
          `UPDATE agent_notion_connections
           SET sync_status = 'completed',
               last_sync_at = NOW(),
               updated_at = NOW()
           WHERE agent_deployment_id = $1`,
          [deploymentId]
        )
      })
      .catch(error => {
        console.error('[Notion Sync API] Sync failed:', error)
        // Update to failed status
        dbQuery(
          `UPDATE agent_notion_connections
           SET sync_status = 'failed',
               updated_at = NOW()
           WHERE agent_deployment_id = $1`,
          [deploymentId]
        )
      })

    // Return immediately so UI can start polling for progress
    return NextResponse.json({
      success: true,
      message: 'Notion sync started',
      status: 'syncing'
    })

  } catch (error: any) {
    console.error('[Notion Sync API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync Notion pages'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/notion/sync?deploymentId=xxx
 * Get sync status for a deployment
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const deploymentId = req.nextUrl.searchParams.get('deploymentId')

    if (!deploymentId) {
      return NextResponse.json(
        { success: false, error: 'deploymentId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this deployment
    const deploymentResult = await dbQuery(
      `SELECT ad.*, ad.organization_id
       FROM agent_deployments ad
       JOIN organization_memberships om ON ad.organization_id = om.organization_id
       WHERE ad.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [deploymentId, userId]
    )

    if (deploymentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to deployment' },
        { status: 403 }
      )
    }

    // Get Notion connection status
    const connectionResult = await dbQuery(
      `SELECT
        id,
        notion_workspace_name,
        sync_status,
        last_sync_at,
        authorized_pages,
        created_at
       FROM agent_notion_connections
       WHERE agent_deployment_id = $1
       LIMIT 1`,
      [deploymentId]
    )

    if (connectionResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        connected: false
      })
    }

    const connection = connectionResult.rows[0]

    // Get count of synced documents
    const docsResult = await dbQuery(
      `SELECT COUNT(*) as count
       FROM agent_knowledge_base
       WHERE agent_deployment_id = $1 AND source_type = 'notion'`,
      [deploymentId]
    )

    // Parse progress from authorized_pages JSONB
    const authorizedPages = typeof connection.authorized_pages === 'string'
      ? JSON.parse(connection.authorized_pages)
      : connection.authorized_pages
    const progress = authorizedPages?.progress || null

    return NextResponse.json({
      success: true,
      connected: true,
      workspace_name: connection.notion_workspace_name,
      sync_status: connection.sync_status,
      last_sync_at: connection.last_sync_at,
      documents_count: parseInt(docsResult.rows[0].count),
      progress
    })

  } catch (error: any) {
    console.error('[Notion Sync API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get sync status'
      },
      { status: 500 }
    )
  }
}
