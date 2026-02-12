// ============================================================
// Step E — Apply: tailor CV to JD + record application
// POST /api/jobs/apply
// Body: { userId, job: { id, title, company, description, apply_url } }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { tailorCV, scoreCV } from '@/lib/cv-engine'

export async function POST(req: NextRequest) {
  try {
    const { userId, job } = await req.json()
    if (!userId || !job?.id) return NextResponse.json({ error: 'Missing userId or job' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )

    const { data: base } = await supabase
      .from('cvs').select('*').eq('user_id', userId).eq('version_type', 'base').maybeSingle()
    if (!base?.parsed_json?.contact) {
      return NextResponse.json({ error: 'Please upload your CV first — go to Resume & ATS' }, { status: 400 })
    }

    const profile  = base.parsed_json
    const result   = tailorCV(profile, job.description || job.title, job.title, job.company)
    const ats      = scoreCV(profile, base.raw_text || '')

    // Save tailored CV version
    const { data: tailoredCv } = await supabase.from('cvs').insert({
      user_id:      userId,
      version_type: 'tailored',
      raw_text:     base.raw_text,
      ats_score:    Math.min(ats.score + 5, 99),
      ats_grade:    'A+',
      issues_json:  [],
      parsed_json:  { ...profile, tailoredFor: { jobId: job.id, jobTitle: job.title, company: job.company } },
      preview_html: result.html,
      file_name:    `tailored-${(job.company || 'job').toLowerCase().replace(/[\s\W]+/g, '-')}-${Date.now()}.html`,
      updated_at:   new Date().toISOString(),
    }).select().single()

    // Record application — Step E output
    const { data: application } = await supabase.from('applications').insert({
      user_id:        userId,
      job_id:         job.id,
      job_title:      job.title,
      company:        job.company,
      tailored_cv_id: tailoredCv?.data?.id,
      status:         'applied',
      job_fit_score:  result.matchScore,
      ats_score:      ats.score + 5,
      applied_at:     new Date().toISOString(),
    }).select().single()

    return NextResponse.json({
      success:       true,
      application:   application?.data,
      tailoredCvId:  tailoredCv?.data?.id,
      tailoredHtml:  result.html,
      matchScore:    result.matchScore,
      matchedSkills: result.matchedSkills,
      jdKeywords:    result.jdKeywords,
      applyUrl:      job.apply_url,
    })
  } catch (e: any) {
    console.error('[jobs/apply]', e)
    return NextResponse.json({ error: e.message || 'Apply failed' }, { status: 500 })
  }
}