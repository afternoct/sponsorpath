// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/notifications/send/route.ts
// ENDPOINT:  POST /api/notifications/send
// ════════════════════════════════════════════════════════
// Sends weekly summary emails + custom notifications via Resend
// Install: npm install resend  (or use fetch as below — no install needed)
// Add to .env.local: RESEND_API_KEY=re_xxxxx

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { userId, type, customData } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
    )

    // Get user profile
    const { data: profile } = await supabase
      .from('master_profiles').select('email,full_name').eq('user_id', userId).single()
    if (!profile?.email) return NextResponse.json({ error: 'No email on profile' }, { status: 400 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ warning: 'RESEND_API_KEY not set — skipped' }, { status: 200 })

    let subject = '', html = ''
    const name = profile.full_name?.split(' ')[0] || 'there'

    if (type === 'weekly_summary') {
      // Pull this week's stats
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: appsCount }  = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('applied_at', weekAgo)
      const { data: interviews }  = await supabase.from('applications').select('company,job_title').eq('user_id', userId).eq('status', 'Interview').gte('applied_at', weekAgo)
      const { data: recentApps }  = await supabase.from('applications').select('job_title,company,match_score,status').eq('user_id', userId).order('applied_at', { ascending: false }).limit(5)

      subject = `📊 Your SponsorPath Weekly — ${appsCount} applications this week`
      html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
          <div style="background:linear-gradient(135deg,#0F2952,#1D4ED8);padding:28px;border-radius:14px;margin-bottom:24px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="background:rgba(255,255,255,.2);width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.1rem">S</div>
              <span style="color:rgba(255,255,255,.7);font-size:14px">SponsorPath Weekly</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:22px">Hi ${name} 👋</h1>
            <p style="color:rgba(255,255,255,.75);margin:6px 0 0">Here's your job hunt summary for this week</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
            ${[{n:String(appsCount||0),l:'Applications'},{n:String(interviews?.length||0),l:'Interviews'},{n:'—',l:'Avg Match'}].map(s=>`
              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:28px;font-weight:900;color:#1D4ED8;line-height:1">${s.n}</div>
                <div style="color:#64748B;font-size:12px;margin-top:4px">${s.l}</div>
              </div>`).join('')}
          </div>
          ${recentApps && recentApps.length > 0 ? `
          <h3 style="color:#0A0F1E;margin-bottom:12px">Recent Applications</h3>
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#F8FAFC"><th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748B">Job</th><th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748B">Company</th><th style="text-align:right;padding:8px 12px;font-size:12px;color:#64748B">Status</th></tr>
            ${recentApps.map(a=>`<tr style="border-top:1px solid #E2E8F0"><td style="padding:10px 12px;font-size:13px;font-weight:600">${a.job_title}</td><td style="padding:10px 12px;font-size:13px;color:#64748B">${a.company}</td><td style="padding:10px 12px;text-align:right"><span style="background:${a.status==='Interview'?'#ECFDF5':'#EFF6FF'};color:${a.status==='Interview'?'#059669':'#1D4ED8'};padding:3px 8px;border-radius:50px;font-size:12px;font-weight:700">${a.status}</span></td></tr>`).join('')}
          </table>` : ''}
          <div style="margin-top:24px;text-align:center">
            <a href="${process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;padding:13px 28px;border-radius:9px;text-decoration:none;font-weight:700">Open Dashboard →</a>
          </div>
          <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:24px">SponsorPath · Not immigration advice · <a href="#" style="color:#94A3B8">Unsubscribe</a></p>
        </div>
      `
    } else if (type === 'interview_invite') {
      subject = `🎉 Interview Invite — ${customData?.company}!`
      html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>Congratulations ${name}! 🎉</h2><p>You have an interview invite from <strong>${customData?.company}</strong> for the <strong>${customData?.jobTitle}</strong> role.</p><a href="${process.env.NEXT_PUBLIC_APP_URL||''}/dashboard" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">View Details →</a></div>`
    }

    if (!subject) return NextResponse.json({ warning: 'Unknown notification type' })

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'SponsorPath <notifications@sponsorpath.com>', to: [profile.email], subject, html })
    })

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)

    // Mark as sent in notifications table
    await supabase.from('notifications').update({ email_sent: true })
      .eq('user_id', userId).eq('type', type).eq('email_sent', false)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[/api/notifications/send]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}