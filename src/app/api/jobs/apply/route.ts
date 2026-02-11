// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/jobs/apply/route.ts
// ENDPOINT:  POST /api/jobs/apply
// ════════════════════════════════════════════════════════
// Body: { userId, job: JobListing, autoApply?: boolean }
// Saves application record + sends email notification via Resend

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { userId, job, autoApply = false } = await req.json()
    if (!userId || !job) {
      return NextResponse.json({ error: 'userId and job required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
    )

    // Get user profile for tailored resume
    const { data: profile } = await supabase
      .from('master_profiles').select('*').eq('user_id', userId).single()

    // Check daily limit
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase.from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('applied_at', `${today}T00:00:00`)

    const { data: prefs } = await supabase
      .from('engine_preferences').select('max_apps_per_day').eq('user_id', userId).single()
    const maxApps = prefs?.max_apps_per_day || 10

    if ((count || 0) >= maxApps) {
      return NextResponse.json({ error: `Daily limit of ${maxApps} applications reached`, limitReached: true }, { status: 429 })
    }

    // Save application record
    const { data: application, error } = await supabase.from('applications').insert({
      user_id:          userId,
      job_title:        job.job_title,
      company:          job.company,
      location:         job.location,
      job_url:          job.job_url,
      job_board:        job.job_board || 'SponsorPath',
      match_score:      job.match_score || 0,
      status:           'Applied',
      sponsor_verified: job.sponsor_verified ?? true,
      auto_applied:     autoApply,
      resume_used:      profile?.raw_resume_text?.slice(0, 500) || null,
      applied_at:       new Date().toISOString(),
    }).select().single()

    if (error) throw error

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type:    'application_sent',
      title:   `Applied: ${job.job_title} at ${job.company}`,
      message: `Match score: ${job.match_score}% · ${job.sponsor_verified ? '🇬🇧 Sponsor verified' : ''} · ${autoApply ? 'Auto-applied by engine' : 'Manual application'}`,
      data:    { applicationId: application.id, jobUrl: job.job_url, matchScore: job.match_score },
    })

    // Send email via Resend (if configured)
    const resendKey = process.env.RESEND_API_KEY
    const userEmail = profile?.email
    if (resendKey && userEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    'SponsorPath Engine <notifications@sponsorpath.com>',
            to:      [userEmail],
            subject: `✅ Applied: ${job.job_title} at ${job.company}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="background:linear-gradient(135deg,#1D4ED8,#059669);padding:24px;border-radius:12px;margin-bottom:24px">
                  <h1 style="color:#fff;margin:0;font-size:20px">✅ Application Submitted</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">SponsorPath Engine</p>
                </div>
                <h2 style="color:#0A0F1E">${job.job_title}</h2>
                <p style="color:#64748B;font-size:16px">🏢 ${job.company} &nbsp;·&nbsp; 📍 ${job.location}</p>
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin:20px 0">
                  <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                    <span style="color:#64748B">Match Score</span>
                    <strong style="color:#059669">${job.match_score}%</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                    <span style="color:#64748B">Sponsor Status</span>
                    <strong style="color:#059669">${job.sponsor_verified ? '🇬🇧 Verified' : 'Unverified'}</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#64748B">Applied via</span>
                    <strong>${autoApply ? '⚡ Auto-applied' : '👆 Manual'}</strong>
                  </div>
                </div>
                <a href="${job.job_url || 'https://sponsorpath.com/dashboard'}"
                   style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                  View Job Posting →
                </a>
                <p style="color:#94A3B8;font-size:12px;margin-top:32px">
                  SponsorPath Engine · Not immigration advice · <a href="#" style="color:#94A3B8">Manage notifications</a>
                </p>
              </div>
            `,
          })
        })
      } catch (emailErr) { console.warn('Email send failed (non-critical):', emailErr) }
    }

    return NextResponse.json({ success: true, application })
  } catch (err: any) {
    console.error('[/api/jobs/apply]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}