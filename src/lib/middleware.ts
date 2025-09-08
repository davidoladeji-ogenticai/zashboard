import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader } from './auth'

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/users', 
  '/performance',
  '/geographic', 
  '/system',
  '/versions',
  '/api/dashboard' // API routes (except auth endpoints)
]

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth',
  '/api/analytics/events' // Keep analytics endpoint public for Zing browser
]

export function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // For protected routes, check authentication
  if (isProtectedRoute) {
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)
    
    // For API routes, return 401
    if (pathname.startsWith('/api/') && !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized. Please provide a valid token.',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }
    
    // For page routes, redirect to login
    if (!pathname.startsWith('/api/') && !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Add user info to headers for downstream processing
    if (user) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', user.id)
      requestHeaders.set('x-user-email', user.email)
      requestHeaders.set('x-user-name', user.name)
      
      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
    }
  }
  
  return NextResponse.next()
}

// Helper function to extract user from request headers (set by middleware)
export function getUserFromHeaders(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email') 
  const userName = request.headers.get('x-user-name')
  
  if (!userId || !userEmail || !userName) return null
  
  return {
    id: userId,
    email: userEmail,
    name: userName
  }
}

// Wrapper for protected API routes
export function withAuth(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized. Please provide a valid token.',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }
    
    return handler(request, user)
  }
}