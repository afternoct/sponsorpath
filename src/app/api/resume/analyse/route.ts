// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/resume/analyse/route.ts
// ENDPOINT:  POST /api/resume/analyse
// ════════════════════════════════════════════════════════
// Body: { resumeText: string, jobDescription?: string, userId: string }
// Returns: ATSResult + saves to master_profiles table

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { analyseATS } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription = '', userId } = await req.json()
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Resume text too short' }, { status: 400 })
    }

    // Run ATS analysis
    const result = analyseATS(resumeText, jobDescription)

    // Extract basic profile info from resume text
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const phoneMatch = resumeText.match(/(\+44|0)[0-9\s\-]{9,}/)
    const linkedinMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i)

    // Save ATS result to Supabase if userId provided
    if (userId) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(),
            setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
      )
      await supabase.from('master_profiles').upsert({
        user_id: userId,
        raw_resume_text: resumeText,
        ats_score: result.score,
        ats_grade: result.grade,
        ats_checks: result.checks,
        ats_suggestions: result.suggestions,
        email: emailMatch?.[0] || undefined,
        phone: phoneMatch?.[0] || undefined,
        linkedin_url: linkedinMatch ? `https://${linkedinMatch[0]}` : undefined,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Send notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'ats_complete',
        title: `ATS Score: ${result.score}/100 — ${result.grade}`,
        message: result.suggestions.length > 0
          ? `${result.suggestions.length} improvement${result.suggestions.length > 1 ? 's' : ''} found. Top fix: ${result.suggestions[0]}`
          : 'Your CV is ATS-ready! The engine can now start applying.',
        data: { score: result.score, grade: result.grade },
      })
    }

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[/api/resume/analyse]', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}