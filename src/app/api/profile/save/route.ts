// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/profile/save/route.ts
// ENDPOINT:  POST /api/profile/save
// ════════════════════════════════════════════════════════
// Body: { userId, profile: MasterProfile }
// Returns: saved profile record

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { userId, profile } = await req.json()
    if (!userId || !profile) {
      return NextResponse.json({ error: 'userId and profile required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
    )

    const { data, error } = await supabase.from('master_profiles').upsert(
      { user_id: userId, ...profile, profile_complete: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    ).select().single()

    if (error) throw error

    // Also update engine preferences with their streams & locations
    if (profile.target_streams || profile.preferred_locations) {
      await supabase.from('engine_preferences').upsert({
        user_id: userId,
        target_streams: profile.target_streams || [],
        preferred_locations: profile.preferred_locations
          ? [profile.preferred_locations]
          : ['London'],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[/api/profile/save]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
    )

    const { data, error } = await supabase.from('master_profiles').select('*').eq('user_id', userId).single()
    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json({ success: true, data: data || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}