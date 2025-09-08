import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
)

const protectedRoutes = [
  '/',
  '/users',
  '/performance', 
  '/geographic',
  '/versions',
  '/settings',
  '/system',
  '/privacy'
]

const authRoutes = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // Check if this is an auth route
  const isAuthRoute = authRoutes.includes(pathname)

  // If accessing root, redirect to landing page when not authenticated
  if (pathname === '/' && !token) {
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  // If accessing protected routes without token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing auth routes with valid token, redirect to dashboard
  if (isAuthRoute && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL('/', request.url))
    } catch {
      // Token invalid, continue to auth page
    }
  }

  // Verify token for protected routes
  if (isProtectedRoute && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
    } catch {
      // Token invalid, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|landing).*)',
  ],
}