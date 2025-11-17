import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database'

// Slack sends a URL verification challenge on first setup
interface SlackUrlVerificationEvent {
  type: 'url_verification'
  challenge: string
}

interface SlackMessageEvent {
  type: 'event_callback'
  event: {
    type: 'app_mention' | 'message'
    user: string
    text: string
    channel: string
    channel_type?: string
    ts: string
    thread_ts?: string
    event_ts: string
  }
  team_id: string
  event_id: string
}

// Simple in-memory cache for event deduplication with timestamps
const processedEvents = new Map<string, number>()
const EVENT_CACHE_TTL = 60000 // 1 minute

function cleanupEventCache() {
  const now = Date.now()
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > EVENT_CACHE_TTL) {
      processedEvents.delete(eventId)
    }
  }

  // Keep cache size reasonable
  if (processedEvents.size > 1000) {
    processedEvents.clear()
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle URL verification
    if (body.type === 'url_verification') {
      console.log('[Slack Events] URL verification challenge received')
      return NextResponse.json({ challenge: body.challenge })
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body as SlackMessageEvent
      const { team_id: slackTeamId, event_id } = event

      // Create a unique key based on message content (to catch app_mention + message duplicates)
      const messageKey = `${slackTeamId}_${event.event.channel}_${event.event.ts}`
      const now = Date.now()

      // Check event_id for exact duplicates
      const lastProcessedById = processedEvents.get(event_id)

      if (lastProcessedById && (now - lastProcessedById) < EVENT_CACHE_TTL) {
        console.log(`[Slack Events] Duplicate event_id ${event_id}, ignoring`)
        return NextResponse.json({ ok: true })
      }

      // Check message key for app_mention + message duplicates (only within 2 seconds)
      const lastProcessedByMessage = processedEvents.get(messageKey)

      if (lastProcessedByMessage && (now - lastProcessedByMessage) < 2000) {
        console.log(`[Slack Events] Duplicate message ${messageKey}, ignoring (app_mention + message event within ${now - lastProcessedByMessage}ms)`)
        return NextResponse.json({ ok: true })
      }

      // Mark both keys as processed
      processedEvents.set(event_id, now)
      processedEvents.set(messageKey, now)

      // Cleanup old entries periodically
      if (Math.random() < 0.1) { // 10% chance to cleanup
        cleanupEventCache()
      }

      // Find deployment for this Slack workspace
      const deploymentResult = await dbQuery(
        `SELECT ad.*, asw.bot_token, asw.bot_user_id, ac.system_prompt,
                ac.response_tone, ac.enable_emoji, ac.escalation_channel
         FROM agent_deployments ad
         JOIN agent_slack_workspaces asw ON ad.id = asw.agent_deployment_id
         LEFT JOIN agent_configurations ac ON ad.id = ac.agent_deployment_id
         WHERE asw.slack_team_id = $1 AND ad.status = 'active'
         LIMIT 1`,
        [slackTeamId]
      )

      if (deploymentResult.rows.length === 0) {
        console.log(`[Slack Events] No active deployment found for team: ${slackTeamId}`)
        return NextResponse.json({ ok: true })
      }

      const deployment = deploymentResult.rows[0]

      // Ignore bot's own messages
      if (event.event.user === deployment.bot_user_id) {
        return NextResponse.json({ ok: true })
      }

      // Only respond to app mentions, DMs, or thread replies
      const isAppMention = event.event.type === 'app_mention'
      const isDirectMessage = event.event.channel_type === 'im'
      const hasBotMention = event.event.text?.includes(`<@${deployment.bot_user_id}>`)
      const isThreadReply = !!event.event.thread_ts // Message is in a thread

      if (!isAppMention && !isDirectMessage && !hasBotMention && !isThreadReply) {
        console.log('[Slack Events] Ignoring message - not mentioned, not a DM, and not a thread reply')
        return NextResponse.json({ ok: true })
      }

      // Process the message asynchronously (don't block Slack's 3-second timeout)
      processMessageAsync(deployment, event.event).catch((error) => {
        console.error('[Slack Events] Error processing message:', error)
      })

      // Acknowledge receipt immediately
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Slack Events] Error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Slack
  }
}

async function processMessageAsync(
  deployment: any,
  event: SlackMessageEvent['event']
) {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const startTime = Date.now()

  try {
    console.log(`[Agent Runtime] Processing message for deployment: ${deployment.id}`)

    // Extract question text - handle undefined text
    const rawText = event.text || ''
    const question = rawText.replace(/<@[^>]+>/g, '').trim() // Remove mentions

    if (!question) {
      console.log('[Agent Runtime] Empty message, ignoring')
      return
    }

    // Search knowledge base
    const searchResults = await searchKnowledgeBase(deployment.id, question)

    // Generate response using Claude
    const response = await generateResponse(
      question,
      searchResults,
      deployment.system_prompt,
      deployment.response_tone,
      deployment.enable_emoji
    )

    // Send response to Slack
    await sendSlackMessage(
      deployment.bot_token,
      event.channel,
      response,
      event.thread_ts || event.ts
    )

    const duration = Date.now() - startTime

    // Log execution
    await dbQuery(
      `INSERT INTO agent_executions (
        id, agent_deployment_id, execution_type, slack_user_id, slack_channel_id,
        slack_thread_ts, input_data, output_data, knowledge_sources,
        tokens_used, execution_time_ms, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        executionId,
        deployment.id,
        'slack_query',
        event.user,
        event.channel,
        event.thread_ts || event.ts,
        JSON.stringify({ question, text: question }),
        JSON.stringify({ response }),
        JSON.stringify(searchResults.map((r: any) => r.title)),
        0, // TODO: Track actual token usage
        duration
      ]
    )

    // Track execution in Ogents Market
    await trackExecutionInMarket(deployment.employed_agent_id)

    console.log(`[Agent Runtime] Successfully responded in ${duration}ms`)
  } catch (error) {
    console.error('[Agent Runtime] Error processing message:', error)

    const duration = Date.now() - startTime

    // Log failed execution
    await dbQuery(
      `INSERT INTO agent_executions (
        id, agent_deployment_id, execution_type, slack_user_id, slack_channel_id,
        input_data, error_message, execution_time_ms, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        executionId,
        deployment.id,
        'slack_query',
        event.user,
        event.channel,
        JSON.stringify({ text: event.text }),
        (error as Error).message,
        duration
      ]
    )

    // Send error message to user
    try {
      await sendSlackMessage(
        deployment.bot_token,
        event.channel,
        "I'm sorry, I encountered an error processing your question. Please try again or contact support if the issue persists.",
        event.thread_ts || event.ts
      )
    } catch (sendError) {
      console.error('[Agent Runtime] Failed to send error message:', sendError)
    }
  }
}

async function searchKnowledgeBase(deploymentId: string, query: string) {
  // Extract keywords from the query (remove common words)
  const stopWords = ['what', 'is', 'are', 'the', 'our', 'my', 'your', 'a', 'an', 'how', 'does', 'do', 'can', 'could', 'would', 'should', 'tell', 'me', 'about']
  const keywords = query.toLowerCase()
    .replace(/[?.,!]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))

  console.log('[Knowledge Search] Query:', query)
  console.log('[Knowledge Search] Keywords:', keywords)

  // If we have keywords, search for each one
  if (keywords.length > 0) {
    const searchConditions = keywords.map((_, i) =>
      `(title ILIKE $${i + 2} OR content ILIKE $${i + 2})`
    ).join(' OR ')

    const result = await dbQuery(
      `SELECT id, title, content, source_type, metadata
       FROM agent_knowledge_base
       WHERE agent_deployment_id = $1
         AND (${searchConditions})
       ORDER BY created_at DESC
       LIMIT 5`,
      [deploymentId, ...keywords.map(k => `%${k}%`)]
    )

    console.log('[Knowledge Search] Found documents:', result.rows.length)
    return result.rows
  }

  // Fallback: return all documents if no keywords
  const result = await dbQuery(
    `SELECT id, title, content, source_type, metadata
     FROM agent_knowledge_base
     WHERE agent_deployment_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [deploymentId]
  )

  console.log('[Knowledge Search] No keywords, returning all documents:', result.rows.length)
  return result.rows
}

async function generateResponse(
  question: string,
  context: any[],
  systemPrompt: string | null,
  tone: string,
  useEmoji: boolean
): Promise<string> {
  // Build context from search results
  // Use more context - up to 30k chars per doc (~75% of content for most docs)
  const contextText = context.length > 0
    ? context
        .map((doc, i) => `[Source ${i + 1}: ${doc.title}]\n${doc.content.substring(0, 30000)}`)
        .join('\n\n---\n\n')
    : 'No relevant information found in the knowledge base.'

  // Build tone instruction
  const toneInstructions = {
    professional: 'Be professional and business-appropriate in your response.',
    casual: 'Be relaxed and conversational in your response.',
    technical: 'Be detailed and precise in your response, using technical language when appropriate.',
    friendly: 'Be warm and approachable in your response.'
  }

  const toneInstruction = toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional

  const emojiInstruction = useEmoji
    ? 'You may use appropriate emojis to make your response more engaging.'
    : 'Do not use emojis in your response.'

  // Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[Agent Runtime] ANTHROPIC_API_KEY not configured')
    return "I apologize, but I'm not properly configured to answer questions. Please contact your administrator."
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `You are a helpful business knowledge assistant. Answer the following question based on the provided context.

${systemPrompt ? `Additional Instructions: ${systemPrompt}\n` : ''}
${toneInstruction}
${emojiInstruction}

Context from knowledge base:
${contextText}

Question: ${question}

Please provide a clear, accurate answer based on the context. If the context doesn't contain enough information to answer the question fully, say so and provide what information you can. Always cite your sources by mentioning which document the information came from.`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Agent Runtime] Claude API error:', errorText)
      throw new Error('Failed to generate response')
    }

    const data = await response.json()
    return data.content[0].text
  } catch (error) {
    console.error('[Agent Runtime] Error calling Claude API:', error)
    throw error
  }
}

async function sendSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  threadTs: string
) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`
    },
    body: JSON.stringify({
      channel,
      text,
      thread_ts: threadTs
    })
  })

  const data = await response.json()

  if (!data.ok) {
    console.error('[Agent Runtime] Slack API error:', data.error)
    throw new Error(`Failed to send message: ${data.error}`)
  }

  return data
}

async function trackExecutionInMarket(employedAgentId: string) {
  try {
    const ogentsMarketUrl = process.env.NEXT_PUBLIC_OGENTS_MARKET_URL || 'http://localhost:3002'
    await fetch(`${ogentsMarketUrl}/api/employed-agents/${employedAgentId}/track-execution`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OGENTS_INTERNAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('[Agent Runtime] Failed to track execution in market:', error)
    // Don't throw - execution tracking is not critical
  }
}
