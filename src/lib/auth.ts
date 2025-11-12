/**
 * Authentication Types and Utilities
 *
 * NOTE: This file now only contains type definitions and utility functions.
 * Actual authentication is handled by Clerk. See @/lib/auth-clerk for auth functions.
 */

import { query } from './index'

export interface User {
  id: string
  email: string
  name: string
  created_at: Date
  updated_at: Date
  last_login?: Date
  is_active: boolean
  role: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

// Get user by ID from database
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await query(
      'SELECT id, email, name, created_at, updated_at, last_login, is_active, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error('Failed to get user by ID:', error)
    return null
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await query(
      'SELECT id, email, name, created_at, updated_at, last_login, is_active, role FROM users ORDER BY created_at DESC'
    )

    return result.rows
  } catch (error) {
    console.error('Failed to get all users:', error)
    return []
  }
}

/**
 * DEPRECATED: validateAuthHeader
 * Use getAuthenticatedUser from @/lib/auth-clerk instead
 *
 * This function is kept temporarily for backward compatibility during migration.
 */
export async function validateAuthHeader(authHeader: string | null): Promise<User | null> {
  console.warn('validateAuthHeader is deprecated. Use getAuthenticatedUser from @/lib/auth-clerk instead.')

  if (!authHeader) return null

  // Handle demo key for development
  if (authHeader.includes('demo-key')) {
    return {
      id: 'demo-user',
      email: 'demo@zashboard.com',
      name: 'Demo User',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      role: 'user'
    }
  }

  return null
}

// Update user profile
export async function updateUserProfile(userId: string, updates: {
  name?: string
  email?: string
}): Promise<AuthResponse> {
  try {
    const setClause = []
    const values = []
    let paramCount = 1

    if (updates.name) {
      setClause.push(`name = $${paramCount}`)
      values.push(updates.name.trim())
      paramCount++
    }

    if (updates.email) {
      // Check if email is already taken
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [updates.email.toLowerCase().trim(), userId]
      )

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          error: 'Email is already taken'
        }
      }

      setClause.push(`email = $${paramCount}`)
      values.push(updates.email.toLowerCase().trim())
      paramCount++
    }

    if (setClause.length === 0) {
      return {
        success: false,
        error: 'No updates provided'
      }
    }

    setClause.push(`updated_at = NOW()`)
    values.push(userId)

    const result = await query(`
      UPDATE users SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, created_at, updated_at, last_login, is_active, role
    `, values)

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    return {
      success: true,
      user: result.rows[0]
    }
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return {
      success: false,
      error: 'Failed to update profile'
    }
  }
}

/**
 * DEPRECATED: changePassword
 * Password management is now handled by Clerk.
 * Users should update their password through Clerk's user settings.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResponse> {
  console.warn('changePassword is deprecated. Password management is handled by Clerk.')
  return {
    success: false,
    error: 'Password management is now handled through your account settings. Please sign in to update your password.'
  }
}