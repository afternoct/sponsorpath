// ═══════════════════════════════════════════════════════════════════
// FILE: app/api/jobs/apply/route.ts
// Create application with tracking webhook
// ═══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, jobId, job_title, company, location, job_url } = body

    if (!userId || !job_title || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    )

    // Generate tracking token
    const tracking_token = `sp_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // Create application
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        job_id: jobId || null,
        job_title,
        company,
        location: location || 'London',
        job_url: job_url || null,
        status: 'applied',
        tracking_token,
        tracking_webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/applications/track/${tracking_token}`,
        auto_applied: false,
        applied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'application_sent',
      title: `Application sent: ${job_title}`,
      message: `Your application to ${company} has been submitted.`,
      priority: 'medium'
    }).then()

    return NextResponse.json({
      success: true,
      application,
      tracking_token
    })

  } catch (err: any) {
    console.error('[/api/jobs/apply]', err)
    return NextResponse.json({ error: err.message || 'Application failed' }, { status: 500 })
  }
}