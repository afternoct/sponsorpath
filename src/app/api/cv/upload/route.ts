// ═══════════════════════════════════════════════════════════════════
// FILE: app/api/cv/upload/route.ts
// Upload CV, extract text, parse, score, auto-fill profile
// ═══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    // Extract text from file
    const text = await file.text()
    
    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
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

    // Calculate ATS score
    const atsResult = calculateATSScore(text)

    // Extract profile data
    const extracted = extractProfileData(text)

    // Save CV to database
    const { data: cv, error: cvError } = await supabase
      .from('cvs')
      .insert({
        user_id: userId,
        raw_text: text,
        version_type: 'base',
        ats_score: atsResult.score,
        ats_grade: atsResult.grade,
        issues_json: atsResult.issues,
        parsed_json: extracted
      })
      .select()
      .single()

    if (cvError) throw cvError

    // Update profile with extracted data
    await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...extracted,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'cv_uploaded',
      title: `CV Scored: ${atsResult.score}/100`,
      message: `Your CV has been uploaded and scored. ${atsResult.issues.length} issue${atsResult.issues.length !== 1 ? 's' : ''} found.`,
      priority: 'medium'
    }).then()

    return NextResponse.json({
      cv,
      extracted,
      atsResult
    })

  } catch (err: any) {
    console.error('[/api/cv/upload]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}

function calculateATSScore(text: string) {
  const t = text.toLowerCase()
  let score = 0
  const issues: any[] = []

  // Contact info (15 pts)
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)
  const hasPhone = /(\+44|0)[0-9\s\-]{9,}/i.test(text)
  if (hasEmail && hasPhone) {
    score += 15
  } else {
    issues.push({ status: 'fail', message: 'Add email and phone number' })
  }

  // LinkedIn (5 pts)
  if (/linkedin\.com/i.test(text)) {
    score += 5
  } else {
    issues.push({ status: 'warn', message: 'Add LinkedIn URL — 20% more responses' })
  }

  // Structure (20 pts)
  const sections = ['experience', 'education', 'skills', 'summary']
  const found = sections.filter(s => t.includes(s))
  if (found.length >= 4) {
    score += 20
  } else {
    issues.push({ status: 'fail', message: `Missing sections: ${sections.filter(s => !found.includes(s)).join(', ')}` })
  }

  // Quantified results (20 pts)
  if (/[0-9]+%|£[0-9]+|[0-9]+ (users|clients|projects|team)/i.test(text)) {
    score += 20
  } else {
    issues.push({ status: 'warn', message: 'Add metrics: reduced costs 30%, served 100K users, etc.' })
  }

  // Action verbs (15 pts)
  const verbs = ['led', 'built', 'developed', 'delivered', 'improved', 'reduced', 'increased']
  const verbCount = verbs.filter(v => t.includes(v)).length
  if (verbCount >= 5) {
    score += 15
  } else {
    issues.push({ status: 'warn', message: 'Start bullets with action verbs: Led, Built, Delivered' })
  }

  // Length (10 pts)
  const words = text.split(/\s+/).length
  if (words >= 300 && words <= 700) {
    score += 10
  } else if (words < 300) {
    issues.push({ status: 'warn', message: `Only ${words} words — add more detail` })
  } else {
    issues.push({ status: 'warn', message: `${words} words — consider trimming` })
  }

  // Tech skills (15 pts)
  const tech = ['javascript', 'python', 'java', 'react', 'node', 'aws', 'kubernetes', 'docker']
  const techCount = tech.filter(s => t.includes(s)).length
  if (techCount >= 4) {
    score += 15
  } else {
    issues.push({ status: 'warn', message: 'Expand technical skills section' })
  }

  const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Poor'

  return { score: Math.min(score, 100), grade, issues }
}

function extractProfileData(text: string) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const phoneMatch = text.match(/(\+44|0)[0-9\s\-().]{9,15}/)
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w\-]+/i)
  const nameMatch = text.trim().match(/^([A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+)/)
  const postcodeMatch = text.match(/\b[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}\b/i)

  return {
    email: emailMatch?.[0] || undefined,
    phone: phoneMatch?.[0] || undefined,
    linkedin_url: linkedinMatch ? `https://${linkedinMatch[0]}` : undefined,
    full_name: nameMatch?.[1] || undefined,
    uk_postcode: postcodeMatch?.[0]?.toUpperCase() || undefined
  }
}