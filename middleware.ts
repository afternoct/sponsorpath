// src/middleware.ts
// Protects /dashboard — redirects unauthenticated users to /signin
// Redirects already-logged-in users away from /signin and /get-started

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Protect /dashboard — must be logged in
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/signin', req.url))
    }
  }

  // If already logged in, redirect away from auth pages
  if (session && (pathname === '/signin' || pathname === '/get-started')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/get-started'],
}