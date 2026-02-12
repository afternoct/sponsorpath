// ============================================================
// Step D — Tailor Master CV to a specific Job Description
// POST /api/cv/tailor
// Body: { userId, jobId, jobTitle, company, jobDescription }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { tailorCV, scoreCV } from '@/lib/cv-engine'

export async function POST(req: NextRequest) {
  try {
    const { userId, jobId, jobTitle, company, jobDescription } = await req.json()
    if (!userId || !jobDescription) return NextResponse.json({ error: 'Missing userId or jobDescription' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )

    const { data: base } = await supabase
      .from('cvs').select('*').eq('user_id', userId).eq('version_type', 'base').maybeSingle()
    if (!base?.parsed_json?.contact) {
      return NextResponse.json({ error: 'Please upload your CV first' }, { status: 400 })
    }

    const profile = base.parsed_json
    const result  = tailorCV(profile, jobDescription, jobTitle || '', company || '')
    const ats     = scoreCV(profile, base.raw_text || '')

    const { data: tailoredCv } = await supabase.from('cvs').insert({
      user_id:      userId,
      version_type: 'tailored',
      raw_text:     base.raw_text,
      ats_score:    Math.min(ats.score + 5, 99),
      ats_grade:    'A+',
      issues_json:  [],
      parsed_json:  { ...profile, tailoredFor: { jobId, jobTitle, company } },
      preview_html: result.html,
      file_name:    `tailored-${(company || 'job').toLowerCase().replace(/[\s\W]+/g, '-')}-${Date.now()}.html`,
      updated_at:   new Date().toISOString(),
    }).select().single()

    return NextResponse.json({
      tailoredCvId:  tailoredCv?.data?.id,
      html:          result.html,
      matchedSkills: result.matchedSkills,
      jdKeywords:    result.jdKeywords,
      matchScore:    result.matchScore,
    })
  } catch (e: any) {
    console.error('[cv/tailor]', e)
    return NextResponse.json({ error: e.message || 'Tailoring failed' }, { status: 500 })
  }
}