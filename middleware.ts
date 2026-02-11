// ════════════════════════════════════════════════════════════════
// FILE:  middleware.ts
// WHERE: Project ROOT (same folder as package.json, next.config.ts)
// ════════════════════════════════════════════════════════════════
// INSTALL FIRST: npm install @supabase/ssr
//
// Protects /dashboard — unauthenticated users redirected to /signin
// Logged-in users visiting /signin redirected to /dashboard

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // Protect /dashboard — redirect to /signin if not logged in
  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Already logged in — skip auth pages, go straight to dashboard
  if (session && (pathname === '/signin' || pathname === '/get-started')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/get-started'],
}