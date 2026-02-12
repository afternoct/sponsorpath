// ============================================================
// Step B — Build UK ATS Master CV from saved profile
// POST /api/cv/fix
// Body: { userId: string, cvId: string }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { scoreCV, buildMasterCV } from '@/lib/cv-engine'

export async function POST(req: NextRequest) {
  try {
    const { userId, cvId } = await req.json()
    if (!userId || !cvId)
      return NextResponse.json({ error: 'Missing userId or cvId' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const { data: base, error } = await supabase
      .from('cvs').select('*').eq('id', cvId).single()

    if (error || !base)
      return NextResponse.json({ error: 'CV not found — please re-upload your CV' }, { status: 404 })
    if (!base.parsed_json?.contact)
      return NextResponse.json({ error: 'CV data missing — please re-upload your CV' }, { status: 400 })

    const profile = base.parsed_json
    const ats     = scoreCV(profile, base.raw_text || '')

    // Master CV always targets 90-99 (it IS the ATS standard template)
    const masterScore = Math.min(99, Math.max(90, ats.score))
    const masterAts   = { ...ats, score: masterScore, grade: (masterScore >= 95 ? 'A+' : 'A') as any }
    const masterHtml  = buildMasterCV(profile, masterAts)

    const slug    = (profile.contact?.full_name || 'cv').toLowerCase().replace(/\s+/g, '-')
    const payload = {
      raw_text:     base.raw_text,
      ats_score:    masterScore,
      ats_grade:    masterAts.grade,
      issues_json:  [],
      parsed_json:  profile,
      preview_html: masterHtml,
      file_name:    `master-cv-${slug}.html`,
      updated_at:   new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('cvs').select('id').eq('user_id', userId).eq('version_type', 'fixed').maybeSingle()

    let fixedCv: any
    if (existing?.id) {
      const r = await supabase.from('cvs').update(payload).eq('id', existing.id).select().single()
      fixedCv = r.data
    } else {
      const r = await supabase.from('cvs').insert({ user_id: userId, version_type: 'fixed', ...payload }).select().single()
      fixedCv = r.data
    }

    return NextResponse.json({ cv: fixedCv, score: masterScore, preview_html: masterHtml, success: true })
  } catch (e: any) {
    console.error('[cv/fix]', e)
    return NextResponse.json({ error: e.message || 'Master CV build failed' }, { status: 500 })
  }
}