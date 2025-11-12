/**
 * Clerk Authentication Helper
 *
 * Provides helper functions to integrate Clerk authentication with the existing
 * database and RBAC system.
 */

import { auth, currentUser } from '@clerk/nextjs/server'
import { query } from './database'
import { User } from './auth'

/**
 * Get authenticated user from Clerk and sync with database
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const { userId } = await auth()
    console.log('[AUTH-CLERK] Clerk userId:', userId)

    if (!userId) {
      console.log('[AUTH-CLERK] No userId from Clerk session')
      return null
    }

    // Get Clerk user to check for platform_role in publicMetadata
    const clerkUser = await currentUser()
    const platformRole = (clerkUser?.publicMetadata as any)?.platform_role || 'user'

    // Get user from database
    const result = await query(
      'SELECT id, email, name, created_at, updated_at, last_login, is_active, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
    )
    console.log('[AUTH-CLERK] Database query returned', result.rows.length, 'rows')

    if (result.rows.length === 0) {
      console.log('[AUTH-CLERK] User not found in database, attempting auto-creation...')

      // User not in database yet - try to sync from Clerk
      if (!clerkUser) {
        console.error('[AUTH-CLERK] Failed to get current user from Clerk')
        return null
      }

      const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
      if (!email) {
        console.error('[AUTH-CLERK] No primary email found for Clerk user')
        return null
      }

      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email
      console.log('[AUTH-CLERK] Creating user in database:', { userId, email, name, platformRole })

      // Insert user into database with platform role from metadata
      try {
        const insertResult = await query(
          `INSERT INTO users (id, email, name, role, registration_source, created_at, updated_at, is_active)
           VALUES ($1, $2, $3, $4, 'web', NOW(), NOW(), true)
           RETURNING id, email, name, created_at, updated_at, last_login, is_active, role`,
          [userId, email, name, platformRole]
        )

        console.log('[AUTH-CLERK] Successfully created user in database with role:', platformRole)
        return insertResult.rows[0]
      } catch (insertError) {
        console.error('[AUTH-CLERK] Failed to insert user into database:', insertError)
        throw insertError
      }
    }

    // User exists - check if platform role needs to be synced from Clerk metadata
    const dbUser = result.rows[0]
    if (dbUser.role !== platformRole) {
      console.log('[AUTH-CLERK] Syncing platform role from Clerk metadata:', { old: dbUser.role, new: platformRole })
      await query(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
        [platformRole, userId]
      )
      dbUser.role = platformRole
    }

    console.log('[AUTH-CLERK] User found in database:', dbUser.email, 'with platform role:', dbUser.role)
    return dbUser
  } catch (error) {
    console.error('[AUTH-CLERK] Error in getAuthenticatedUser:', error)
    return null
  }
}

/**
 * Validate API request and return user
 * Compatible with existing API routes
 */
export async function validateRequest(): Promise<User | null> {
  return getAuthenticatedUser()
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Get Clerk user ID from request
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}
