// ═══════════════════════════════════════════════════════════════════
// FILE: app/api/applications/track/[token]/route.ts
// Webhook to track when employers open/view applications
// ═══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    if (!token || !token.startsWith('sp_')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!, // Use service key for webhook
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    )

    // Find application by tracking token
    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('tracking_token', token)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Record tracking event
    await supabase.from('application_events').insert({
      application_id: application.id,
      event_type: 'email_opened',
      event_data: {
        user_agent: req.headers.get('user-agent'),
        referer: req.headers.get('referer')
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent')
    }).then()

    // Update application status to "in_review" if currently "applied"
    if (application.status === 'applied') {
      await supabase
        .from('applications')
        .update({
          status: 'in_review',
          viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id)

      // Create notification
      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'application_viewed',
        title: `${application.company} viewed your application!`,
        message: `Good news — ${application.company} has opened your application for ${application.job_title}.`,
        priority: 'high',
        action_url: `/applications`,
        action_label: 'View Application'
      }).then()
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (err: any) {
    console.error('[/api/applications/track]', err)
    
    // Still return pixel even on error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(pixel, {
      headers: { 'Content-Type': 'image/png' }
    })
  }
}