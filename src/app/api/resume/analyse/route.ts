// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/resume/analyse/route.ts
// ENDPOINT:  POST /api/resume/analyse
// ════════════════════════════════════════════════════════
// Body: { resumeText: string, jobDescription?: string, userId: string }
// Returns: ATSResult + saves ATS score + auto-fills profile from CV

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { analyseATS } from '@/lib/supabase'

// ── EXTRACT STRUCTURED DATA FROM RAW CV TEXT ─────────────
function extractProfileFromCV(text: string) {
  const emailMatch    = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const phoneMatch    = text.match(/(\+44|0044|0)[0-9\s\-().]{9,15}/)
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w\-]+/i)

  // Full name — usually first line: "FirstName LastName"
  const nameMatch = text.trim().match(/^([A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+)/)

  // UK postcode
  const postcodeMatch = text.match(/\b[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}\b/i)

  // UK address — look for street patterns
  const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(Street|Road|Avenue|Lane|Drive|Close|Way|Place|Gardens|Crescent|Terrace|Square|Court)\s*[,.]?\s*[A-Za-z\s]+/i)

  // Skills extraction
  const techKeywords = [
    'Python','JavaScript','TypeScript','Java','Go','Rust','C++','C#','Ruby','PHP','Scala','Kotlin',
    'React','Vue','Angular','Node.js','Next.js','Express','Django','Flask','Spring Boot',
    'AWS','Azure','GCP','Kubernetes','Docker','Terraform','Ansible','Jenkins','GitLab CI','GitHub Actions',
    'SQL','PostgreSQL','MySQL','MongoDB','Redis','Kafka','Elasticsearch','Snowflake','BigQuery',
    'Machine Learning','Deep Learning','NLP','TensorFlow','PyTorch','scikit-learn',
    'Agile','Scrum','DevOps','CI/CD','Microservices','REST','GraphQL',
    'Power BI','Tableau','Excel','SAP','Salesforce','Jira',
  ]
  const skills = techKeywords.filter(k => new RegExp(`\\b${k.replace('+','\\+')}\\b`, 'i').test(text))

  // Years experience — scan for patterns like "5 years", "3+ years"
  const expMatch = text.match(/(\d{1,2})\+?\s*years?\s*(of\s*)?(experience|exp)/i)
  let years_experience = ''
  if (expMatch) {
    const n = parseInt(expMatch[1])
    if (n < 1) years_experience = 'Less than 1 year'
    else if (n <= 2) years_experience = '1–2 years'
    else if (n <= 3) years_experience = '2–3 years'
    else if (n <= 5) years_experience = '3–5 years'
    else if (n <= 7) years_experience = '5–7 years'
    else if (n <= 10) years_experience = '7–10 years'
    else years_experience = '10+ years'
  }

  // Current role — look after name for a job title line
  const rolePatterns = [
    /^(Senior|Lead|Principal|Staff|Junior|Graduate|Mid)?\s*(Software|DevOps|Cloud|Data|Product|Backend|Frontend|Full.Stack|Platform|ML|Machine Learning|Site Reliability|Infrastructure|Security)\s*(Engineer|Developer|Architect|Manager|Analyst|Scientist|Specialist)/im,
    /(DevOps|Cloud|Platform|Infrastructure|Backend|Frontend|Full.Stack|SRE|MLOps|Data)\s*(Engineer|Developer|Architect)/im,
  ]
  let current_role = ''
  for (const r of rolePatterns) {
    const m = text.match(r)
    if (m) { current_role = m[0].trim(); break }
  }

  return {
    ...(emailMatch?.[0]   && { email: emailMatch[0] }),
    ...(phoneMatch?.[0]   && { phone: phoneMatch[0].trim() }),
    ...(linkedinMatch     && { linkedin_url: `https://${linkedinMatch[0]}` }),
    ...(nameMatch?.[1]    && { full_name: nameMatch[1] }),
    ...(postcodeMatch?.[0]&& { uk_postcode: postcodeMatch[0].toUpperCase() }),
    ...(addressMatch?.[0] && { uk_address: addressMatch[0].trim() }),
    ...(skills.length      && { skills }),
    ...(years_experience   && { years_experience }),
    ...(current_role       && { current_role }),
  }
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription = '', userId } = await req.json()
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Resume text too short' }, { status: 400 })
    }

    const result = analyseATS(resumeText, jobDescription)

    // ── EXTRACT PROFILE DATA FROM CV ──────────────────────
    const extracted = extractProfileFromCV(resumeText)

    if (userId) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(),
            setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
      )

      // ── UPSERT PROFILE WITH ATS + EXTRACTED DATA ─────────
      // Only overwrite fields that were successfully extracted
      // (don't overwrite user-manually-entered data with empty values)
      await supabase.from('master_profiles').upsert({
        user_id: userId,
        raw_resume_text: resumeText,
        ats_score:       result.score,
        ats_grade:       result.grade,
        ats_checks:      result.checks,
        ats_suggestions: result.suggestions,
        updated_at:      new Date().toISOString(),
        ...extracted,  // auto-fill extracted fields
      }, { onConflict: 'user_id' })

      // Save notification
      await supabase.from('notifications').insert({
        user_id: userId, type: 'ats_complete',
        title:   `ATS Score: ${result.score}/100 — ${result.grade}`,
        message: result.suggestions.length > 0
          ? `${result.suggestions.length} improvements found. Top fix: ${result.suggestions[0]}`
          : 'Your CV is ATS-ready! The engine can now start applying.',
        data: { score: result.score, grade: result.grade },
      }).then() // fire and forget
    }

    return NextResponse.json({ success: true, result, extracted })
  } catch (err: any) {
    console.error('[/api/resume/analyse]', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}