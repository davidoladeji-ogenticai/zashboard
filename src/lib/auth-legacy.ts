/**
 * LEGACY AUTH CODE - DEPRECATED
 *
 * This file contains the old JWT-based authentication code.
 * Kept for reference during migration. Will be deleted after full migration to Clerk.
 *
 * New code should use @/lib/auth-clerk instead.
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, transaction } from './index'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-super-secret-jwt-key-change-in-production'
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

// ... rest of legacy code ...
