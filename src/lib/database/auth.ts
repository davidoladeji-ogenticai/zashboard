import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, transaction } from './index'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-here'
const JWT_EXPIRES_IN = '7d'

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
  token?: string
  user?: Omit<User, 'password_hash'>
  error?: string
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  expires_at: Date
  ip_address?: string
  user_agent?: string
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
}

// Create user in database
export async function createUser(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    return await transaction(async (client) => {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      )

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          error: 'User already exists with this email'
        }
      }

      // Validate input
      if (!email || !password || !name) {
        return {
          success: false,
          error: 'Email, password, and name are required'
        }
      }

      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password)
      
      const result = await client.query(`
        INSERT INTO users (email, password_hash, name, created_at, updated_at) 
        VALUES ($1, $2, $3, NOW(), NOW()) 
        RETURNING id, email, name, created_at, updated_at, is_active, role
      `, [email.toLowerCase().trim(), hashedPassword, name.trim()])

      const user = result.rows[0]
      
      // Generate token
      const token = generateToken(user.id)

      // Create session record
      await createUserSession(user.id, token, client)
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          updated_at: user.updated_at,
          is_active: user.is_active,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Create user error:', error)
    return {
      success: false,
      error: 'Failed to create user'
    }
  }
}

// Authenticate user with database
export async function authenticateUser(email: string, password: string): Promise<AuthResponse> {
  try {
    return await transaction(async (client) => {
      // Find user
      const userResult = await client.query(
        'SELECT id, email, name, password_hash, created_at, updated_at, is_active, role FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase().trim()]
      )

      if (userResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      const user = userResult.rows[0]

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      )

      // Generate token
      const token = generateToken(user.id)

      // Create session record
      await createUserSession(user.id, token, client)
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: new Date(),
          is_active: user.is_active,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
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

// Create user session
async function createUserSession(userId: string, sessionToken: string, client?: any): Promise<void> {
  const queryClient = client || { query }
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await queryClient.query(`
    INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_used)
    VALUES ($1, $2, $3, NOW(), NOW())
  `, [userId, sessionToken, expiresAt])
}

// Validate session token
export async function validateSessionToken(token: string): Promise<User | null> {
  try {
    // First verify JWT
    const decoded = verifyToken(token)
    if (!decoded) {
      return null
    }

    // Check if session exists and is valid
    const result = await query(`
      SELECT u.id, u.email, u.name, u.created_at, u.updated_at, u.last_login, u.is_active, u.role
      FROM users u
      JOIN user_sessions s ON u.id = s.user_id
      WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = true
    `, [token])

    if (result.rows.length === 0) {
      return null
    }

    // Update last used timestamp
    await query(
      'UPDATE user_sessions SET last_used = NOW() WHERE session_token = $1',
      [token]
    )

    return result.rows[0]
  } catch (error) {
    console.error('Failed to validate session token:', error)
    return null
  }
}

// Revoke user session
export async function revokeSession(token: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [token]
    )

    return result.rowCount > 0
  } catch (error) {
    console.error('Failed to revoke session:', error)
    return false
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await query(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    )

    return result.rowCount || 0
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error)
    return 0
  }
}

// Get user sessions
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const result = await query(`
      SELECT id, user_id, session_token, expires_at, created_at, last_used, ip_address, user_agent
      FROM user_sessions 
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY last_used DESC
    `, [userId])

    return result.rows
  } catch (error) {
    console.error('Failed to get user sessions:', error)
    return []
  }
}

// Validate auth header and return user
export async function validateAuthHeader(authHeader: string | null): Promise<User | null> {
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

  // Handle Bearer token
  if (!authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  return validateSessionToken(token)
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

// Change user password
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResponse> {
  try {
    return await transaction(async (client) => {
      // Get current password hash
      const userResult = await client.query(
        'SELECT password_hash FROM users WHERE id = $1 AND is_active = true',
        [userId]
      )

      if (userResult.rows.length === 0) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, userResult.rows[0].password_hash)
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Current password is incorrect'
        }
      }

      // Validate new password
      if (newPassword.length < 6) {
        return {
          success: false,
          error: 'New password must be at least 6 characters long'
        }
      }

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword)
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      )

      // Revoke all existing sessions except current one (force re-login on other devices)
      await client.query(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      )

      return {
        success: true
      }
    })
  } catch (error) {
    console.error('Failed to change password:', error)
    return {
      success: false,
      error: 'Failed to change password'
    }
  }
}