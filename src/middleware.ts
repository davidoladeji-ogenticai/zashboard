import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/agents/slack/events(.*)',
  '/api/agents/slack/oauth(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const { pathname } = request.nextUrl

  // If authenticated and on landing page, redirect to organizations
  if (pathname === '/' && userId) {
    return NextResponse.redirect(new URL('/organizations', request.url))
  }

  // If accessing auth routes while authenticated, redirect to organizations
  if ((pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) && userId) {
    return NextResponse.redirect(new URL('/organizations', request.url))
  }

  // Protect all routes except public ones
  if (!isPublicRoute(request) && !userId) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}