import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Ensure organization exists for a Clerk user
 * Called by Ogents Market when user employs an agent
 * Creates organization if it doesn't exist
 * Syncs signup source to Clerk metadata
 */
export async function POST(req: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = req.headers.get('authorization')
    const expectedKey = `Bearer ${process.env.OGENTS_INTERNAL_API_KEY}`

    if (!authHeader || authHeader !== expectedKey) {
      console.error('[API] Invalid internal API key')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { clerkUserId, employedAgentId, userData, signupSource } = body

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'clerkUserId is required' },
        { status: 400 }
      )
    }

    // Validate signup source if provided
    const validSources = ['zing_browser', 'zashboard', 'ogents_builder']
    const sourceToSync = signupSource && validSources.includes(signupSource)
      ? signupSource
      : 'zashboard'

    console.log(`[API] Ensuring organization for user: ${clerkUserId}, source: ${sourceToSync}`)

    // Sync signup source to Clerk metadata
    try {
      await clerkClient.users.updateUserMetadata(clerkUserId, {
        publicMetadata: {
          signupSource: sourceToSync
        }
      })
      console.log(`[API] Synced signup source to Clerk: ${sourceToSync}`)
    } catch (clerkError) {
      console.error('[API] Failed to sync signup source to Clerk:', clerkError)
      // Don't block org creation if Clerk sync fails
    }

    // Check if user exists
    let user = await dbQuery(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [clerkUserId]
    )

    // If user doesn't exist, create them with signup source
    if (!user || user.rows.length === 0) {
      console.log(`[API] Creating user: ${clerkUserId} with source: ${sourceToSync}`)
      await dbQuery(
        `INSERT INTO users (id, email, name, registration_source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [clerkUserId, userData?.email || `${clerkUserId}@temp.com`, userData?.name || 'User', sourceToSync]
      )
    }

    // Check if user has an organization
    const membershipResult = await dbQuery(
      `SELECT o.* FROM organizations o
       JOIN organization_memberships om ON o.id = om.organization_id
       WHERE om.user_id = $1
       LIMIT 1`,
      [clerkUserId]
    )

    let organization
    let isNew = false

    if (membershipResult.rows.length > 0) {
      // User already has an organization
      organization = membershipResult.rows[0]
      console.log(`[API] User already has organization: ${organization.id}`)
    } else {
      // Create new organization
      const orgName = userData?.name ? `${userData.name}'s Organization` : 'My Organization'
      const slug = generateSlug(orgName, clerkUserId)

      console.log(`[API] Creating organization: ${orgName}`)

      const orgResult = await dbQuery(
        `INSERT INTO organizations (name, slug, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [orgName, slug]
      )

      organization = orgResult.rows[0]

      // Create membership
      await dbQuery(
        `INSERT INTO organization_memberships (user_id, organization_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [clerkUserId, organization.id, 'super_admin']
      )

      isNew = true
      console.log(`[API] Created organization: ${organization.id}`)
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.created_at
      },
      isNew,
      membership: {
        userId: clerkUserId,
        role: 'super_admin'
      }
    })

  } catch (error) {
    console.error('[API] Failed to ensure organization:', error)
    return NextResponse.json(
      { error: 'Failed to ensure organization' },
      { status: 500 }
    )
  }
}

/**
 * Generate a URL-safe slug from name
 */
function generateSlug(name: string, fallback: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)

  if (!slug) {
    // Use first 8 chars of fallback if slug is empty
    return fallback.substring(0, 8).toLowerCase()
  }

  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${slug}-${suffix}`
}
