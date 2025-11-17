import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { query as dbQuery } from '@/lib/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // Verify document belongs to user's organization
    const documentResult = await dbQuery(
      `SELECT akb.*, ad.organization_id
       FROM agent_knowledge_base akb
       JOIN agent_deployments ad ON akb.agent_deployment_id = ad.id
       JOIN organization_memberships om ON ad.organization_id = om.organization_id
       WHERE akb.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [documentId, userId]
    )

    if (documentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the document
    await dbQuery(
      `DELETE FROM agent_knowledge_base WHERE id = $1`,
      [documentId]
    )

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error) {
    console.error('[Knowledge Delete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
