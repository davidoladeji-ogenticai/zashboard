import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Temporary in-memory user storage (will be replaced with PostgreSQL)
const users: Array<{
  id: string
  email: string
  password: string
  name: string
  createdAt: Date
  lastLogin?: Date
}> = [
  {
    id: 'demo-user-123',
    email: 'demo@zashboard.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LBrZyv.SL3nXJKFT.', // 'demo123'
    name: 'Demo Admin',
    createdAt: new Date('2025-01-01'),
    lastLogin: new Date()
  }
]

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  lastLogin?: Date
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  error?: string
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

// Create user
export async function createUser(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (existingUser) {
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
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      createdAt: new Date()
    }

    users.push(user)

    // Generate token
    const token = generateToken(user.id)

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    
    return {
      success: true,
      token,
      user: userWithoutPassword
    }

  } catch (error) {
    console.error('Create user error:', error)
    return {
      success: false,
      error: 'Failed to create user'
    }
  }
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<AuthResponse> {
  try {
    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    // Update last login
    user.lastLogin = new Date()

    // Generate token
    const token = generateToken(user.id)

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    
    return {
      success: true,
      token,
      user: userWithoutPassword
    }

  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

// Get user by ID
export function getUserById(userId: string): User | null {
  const user = users.find(u => u.id === userId)
  if (!user) return null

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

// Get all users (admin only)
export function getAllUsers(): User[] {
  return users.map(user => {
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  })
}

// Validate auth header and return user
export function validateAuthHeader(authHeader: string | null): User | null {
  if (!authHeader) return null
  
  // Handle demo key for development
  if (authHeader.includes('demo-key')) {
    return {
      id: 'demo-user',
      email: 'demo@zashboard.com',
      name: 'Demo User',
      createdAt: new Date()
    }
  }

  // Handle Bearer token
  if (!authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) return null
  
  return getUserById(decoded.userId)
}