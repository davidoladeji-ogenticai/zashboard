import { query as dbQuery } from '../database'

interface NotionPage {
  id: string
  title: string
  url: string
  last_edited_time: string
  parent?: any
}

interface NotionBlock {
  type: string
  [key: string]: any
}

/**
 * Notion Sync Service
 * Handles syncing pages from Notion to the knowledge base
 */
export class NotionSyncService {
  private accessToken: string
  private deploymentId: string

  constructor(accessToken: string, deploymentId: string) {
    this.accessToken = accessToken
    this.deploymentId = deploymentId
  }

  /**
   * Update progress in database
   */
  private async updateProgress(current: number, total: number, currentPage: string) {
    try {
      await dbQuery(
        `UPDATE agent_notion_connections
         SET authorized_pages = jsonb_set(
           COALESCE(authorized_pages, '{}'::jsonb),
           '{progress}',
           jsonb_build_object('current', $2, 'total', $3, 'currentPage', $4)
         ),
         updated_at = NOW()
         WHERE agent_deployment_id = $1`,
        [this.deploymentId, current, total, currentPage]
      )
    } catch (error) {
      console.error('[Notion Sync] Failed to update progress:', error)
    }
  }

  /**
   * Sync all accessible pages from Notion
   */
  async syncAllPages(): Promise<{ success: number; failed: number; total: number }> {
    const stats = { success: 0, failed: 0, total: 0 }

    try {
      console.log('[Notion Sync] Starting sync for deployment:', this.deploymentId)

      // Update progress: searching
      await this.updateProgress(0, 0, 'Searching for pages...')

      // Search for all pages the integration has access to
      const pages = await this.searchPages()
      stats.total = pages.length

      console.log('[Notion Sync] Found', pages.length, 'pages')

      // Sync each page with progress updates
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        try {
          await this.updateProgress(i + 1, stats.total, `Syncing: ${page.title}`)
          await this.syncPage(page)
          stats.success++
          console.log(`[Notion Sync] Synced page ${i + 1}/${stats.total}:`, page.title)
        } catch (error) {
          console.error('[Notion Sync] Failed to sync page:', page.title, error)
          stats.failed++
        }
      }

      // Update last sync time and clear progress
      await dbQuery(
        `UPDATE agent_notion_connections
         SET last_sync_at = NOW(),
             sync_status = 'completed',
             authorized_pages = jsonb_set(
               COALESCE(authorized_pages, '{}'::jsonb),
               '{progress}',
               'null'::jsonb
             ),
             updated_at = NOW()
         WHERE agent_deployment_id = $1`,
        [this.deploymentId]
      )

      console.log('[Notion Sync] Completed:', stats)
      return stats
    } catch (error) {
      console.error('[Notion Sync] Error:', error)

      await dbQuery(
        `UPDATE agent_notion_connections
         SET sync_status = 'failed', updated_at = NOW()
         WHERE agent_deployment_id = $1`,
        [this.deploymentId]
      )

      throw error
    }
  }

  /**
   * Search for all pages accessible to the integration
   */
  private async searchPages(): Promise<NotionPage[]> {
    const pages: NotionPage[] = []
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            property: 'object',
            value: 'page',
          },
          page_size: 100,
          start_cursor: startCursor,
        }),
      })

      if (!response.ok) {
        throw new Error(`Notion API error: ${response.statusText}`)
      }

      const data = await response.json()

      for (const result of data.results) {
        pages.push({
          id: result.id,
          title: this.extractTitle(result),
          url: result.url,
          last_edited_time: result.last_edited_time,
          parent: result.parent,
        })
      }

      hasMore = data.has_more
      startCursor = data.next_cursor
    }

    return pages
  }

  /**
   * Sync a single page
   */
  private async syncPage(page: NotionPage): Promise<void> {
    // Fetch page content (blocks)
    const blocks = await this.fetchPageBlocks(page.id)

    // Convert blocks to text
    const content = await this.blocksToText(blocks)

    // Save to knowledge base
    const docId = `kb_notion_${page.id}`

    await dbQuery(
      `INSERT INTO agent_knowledge_base (
        id, agent_deployment_id, source_type, source_id, title,
        content, url, metadata, indexed_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        url = EXCLUDED.url,
        metadata = EXCLUDED.metadata,
        indexed_at = NOW()`,
      [
        docId,
        this.deploymentId,
        'notion',
        page.id,
        page.title,
        content.substring(0, 200000), // Limit to 200k chars
        page.url,
        JSON.stringify({
          notion_page_id: page.id,
          last_edited_time: page.last_edited_time,
          parent: page.parent,
        }),
      ]
    )
  }

  /**
   * Fetch all blocks from a page
   */
  private async fetchPageBlocks(pageId: string): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = []
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const response = await fetch(
        `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100${startCursor ? `&start_cursor=${startCursor}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Notion-Version': '2022-06-28',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.statusText}`)
      }

      const data = await response.json()
      blocks.push(...data.results)

      hasMore = data.has_more
      startCursor = data.next_cursor
    }

    return blocks
  }

  /**
   * Convert Notion blocks to plain text
   */
  private async blocksToText(blocks: NotionBlock[]): Promise<string> {
    const textParts: string[] = []

    for (const block of blocks) {
      const text = this.blockToText(block)
      if (text) {
        textParts.push(text)
      }

      // If block has children, fetch and process them recursively
      if (block.has_children) {
        try {
          const childBlocks = await this.fetchPageBlocks(block.id)
          const childText = await this.blocksToText(childBlocks)
          if (childText) {
            textParts.push(childText)
          }
        } catch (error) {
          console.error('[Notion Sync] Failed to fetch child blocks:', error)
        }
      }
    }

    return textParts.join('\n\n')
  }

  /**
   * Extract text from a single block
   */
  private blockToText(block: NotionBlock): string {
    try {
      const type = block.type

      // Handle different block types
      switch (type) {
        case 'paragraph':
          return this.richTextToPlainText(block.paragraph?.rich_text || [])

        case 'heading_1':
          return '# ' + this.richTextToPlainText(block.heading_1?.rich_text || [])

        case 'heading_2':
          return '## ' + this.richTextToPlainText(block.heading_2?.rich_text || [])

        case 'heading_3':
          return '### ' + this.richTextToPlainText(block.heading_3?.rich_text || [])

        case 'bulleted_list_item':
          return '• ' + this.richTextToPlainText(block.bulleted_list_item?.rich_text || [])

        case 'numbered_list_item':
          return '- ' + this.richTextToPlainText(block.numbered_list_item?.rich_text || [])

        case 'to_do':
          const checked = block.to_do?.checked ? '[x]' : '[ ]'
          return `${checked} ` + this.richTextToPlainText(block.to_do?.rich_text || [])

        case 'toggle':
          return this.richTextToPlainText(block.toggle?.rich_text || [])

        case 'code':
          const code = this.richTextToPlainText(block.code?.rich_text || [])
          return `\`\`\`\n${code}\n\`\`\``

        case 'quote':
          return '> ' + this.richTextToPlainText(block.quote?.rich_text || [])

        case 'callout':
          return this.richTextToPlainText(block.callout?.rich_text || [])

        case 'divider':
          return '---'

        default:
          // Try to extract text from any rich_text field
          if (block[type]?.rich_text) {
            return this.richTextToPlainText(block[type].rich_text)
          }
          return ''
      }
    } catch (error) {
      console.error('[Notion Sync] Error parsing block:', error)
      return ''
    }
  }

  /**
   * Convert Notion rich text to plain text
   */
  private richTextToPlainText(richText: any[]): string {
    if (!Array.isArray(richText)) return ''
    return richText.map(text => text.plain_text || '').join('')
  }

  /**
   * Extract title from Notion page
   */
  private extractTitle(page: any): string {
    try {
      // Try to get title from properties
      if (page.properties) {
        const titleProp = Object.values(page.properties).find(
          (prop: any) => prop.type === 'title'
        ) as any

        if (titleProp?.title) {
          return this.richTextToPlainText(titleProp.title) || 'Untitled'
        }
      }

      // Fallback to getting from child_page or other sources
      if (page.child_page?.title) {
        return page.child_page.title
      }

      return 'Untitled'
    } catch (error) {
      return 'Untitled'
    }
  }
}

/**
 * Trigger a sync for a specific deployment
 */
export async function syncNotionForDeployment(deploymentId: string): Promise<{ success: number; failed: number; total: number }> {
  // Get Notion connection
  const connectionResult = await dbQuery(
    `SELECT * FROM agent_notion_connections WHERE agent_deployment_id = $1 LIMIT 1`,
    [deploymentId]
  )

  if (connectionResult.rows.length === 0) {
    throw new Error('No Notion connection found for this deployment')
  }

  const connection = connectionResult.rows[0]

  // Update status to syncing
  await dbQuery(
    `UPDATE agent_notion_connections SET sync_status = 'syncing', updated_at = NOW() WHERE id = $1`,
    [connection.id]
  )

  // Create sync service and sync
  const syncService = new NotionSyncService(connection.access_token, deploymentId)
  return await syncService.syncAllPages()
}
