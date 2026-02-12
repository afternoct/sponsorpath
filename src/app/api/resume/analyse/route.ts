// ============================================================
// FILE: src/app/api/resume/analyse/route.ts
// ENDPOINT: POST /api/resume/analyse
// Body: { resumeText: string, userId: string }
// Returns: ATS score + saves to cvs table + auto-fills profile
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function extractProfileFromCV(text: string) {
  const emailMatch     = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const phoneMatch     = text.match(/(\+44|0044|0)[0-9\s\-().]{9,15}/)
  const linkedinMatch  = text.match(/linkedin\.com\/in\/[\w\-]+/i)
  const nameMatch      = text.trim().match(/^([A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+)/)
  const postcodeMatch  = text.match(/\b[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}\b/i)
  return {
    email:        emailMatch?.[0],
    phone:        phoneMatch?.[0],
    linkedin_url: linkedinMatch ? `https://${linkedinMatch[0]}` : undefined,
    full_name:    nameMatch?.[1],
    uk_postcode:  postcodeMatch?.[0]?.toUpperCase(),
  }
}

function scoreATS(text: string) {
  const t = text.toLowerCase()
  let score = 0
  const issues: string[] = []

  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) && /(\+44|0)[0-9\s\-]{9,}/i.test(text)) {
    score += 15
  } else {
    issues.push('Add both email and UK phone number')
  }

  if (/linkedin\.com/i.test(text)) { score += 5 } else {
    issues.push('Add LinkedIn URL to boost response rate by 20%')
  }

  const sections = ['experience', 'education', 'skills', 'summary']
  const found = sections.filter(s => t.includes(s))
  if (found.length >= 4) { score += 20 } else {
    issues.push(`Missing sections: ${sections.filter(s => !found.includes(s)).join(', ')}`)
  }

  if (/[0-9]+%|£[0-9]+|[0-9]+ (users|clients|projects|team)/i.test(text)) { score += 20 } else {
    issues.push('Add metrics: reduced costs 30%, served 100K users, etc.')
  }

  const verbs = ['led','built','developed','delivered','improved','reduced','increased','architected','managed','launched']
  if (verbs.filter(v => t.includes(v)).length >= 5) { score += 15 } else {
    issues.push('Start bullets with action verbs: Led, Built, Delivered, Architected')
  }

  const words = text.split(/\s+/).length
  if (words >= 300 && words <= 800) { score += 10 } else if (words < 300) {
    issues.push(`Only ${words} words — add more detail to each role`)
  } else { issues.push(`${words} words — consider trimming to 700 max`) }

  const tech = ['javascript','python','java','react','node','aws','kubernetes','docker','typescript','sql']
  if (tech.filter(s => t.includes(s)).length >= 4) { score += 15 } else {
    issues.push('Expand your technical skills section with specific technologies')
  }

  const grade = score >= 85?'A+':score >= 75?'A':score >= 65?'B':score >= 50?'C':'D'
  return { score: Math.min(score, 100), grade, issues }
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, userId } = await req.json()
    if (!resumeText || !userId) {
      return NextResponse.json({ error: 'Missing resumeText or userId' }, { status: 400 })
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

    const ats = scoreATS(resumeText)
    const extracted = extractProfileFromCV(resumeText)

    // Save CV record
    const { data: cv, error: cvErr } = await supabase
      .from('cvs')
      .insert({
        user_id: userId, raw_text: resumeText,
        version_type: 'base', ats_score: ats.score,
        ats_grade: ats.grade, issues_json: ats.issues, parsed_json: extracted,
      })
      .select().single()

    if (cvErr) throw cvErr

    // Auto-fill profile
    const profileUpdate: Record<string,any> = { user_id: userId, updated_at: new Date().toISOString() }
    if (extracted.full_name)   profileUpdate.full_name   = extracted.full_name
    if (extracted.email)       profileUpdate.email       = extracted.email
    if (extracted.phone)       profileUpdate.phone       = extracted.phone
    if (extracted.linkedin_url) profileUpdate.linkedin_url = extracted.linkedin_url
    if (extracted.uk_postcode) profileUpdate.uk_postcode = extracted.uk_postcode

    await supabase.from('profiles').upsert(profileUpdate, { onConflict: 'user_id' })

    return NextResponse.json({ cv, ats, extracted, autofilled: true })
  } catch (err: any) {
    console.error('[/api/resume/analyse]', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}