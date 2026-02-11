// ════════════════════════════════════════════════════════
// FILE: app/api/cv/generate/route.ts
// POST /api/cv/generate
// AI CV Builder - generates complete CV from user input
// ════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { analyzeCV, generateCVPreview } from '@/lib/cv-fixer'

interface BuilderData {
  full_name: string
  email: string
  phone: string
  location: string
  linkedin: string
  visa_status: string
  target_role: string
  summary: string
  experiences: Array<{
    title: string
    company: string
    duration: string
    bullets: string
  }>
  education: Array<{
    degree: string
    institution: string
    year: string
  }>
  skills: string
  certifications: string
}

export async function POST(req: NextRequest) {
  try {
    const { userId, data }: { userId: string; data: BuilderData } = await req.json()

    if (!userId || !data) {
      return NextResponse.json({ error: 'userId and data required' }, { status: 400 })
    }

    // Validate required fields
    if (!data.full_name || !data.email || !data.target_role) {
      return NextResponse.json(
        { error: 'Missing required fields: full_name, email, target_role' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Build the prompt
    const prompt = `You are an expert UK CV writer specializing in ATS-optimized CVs for visa sponsorship roles. Create a professional, compelling CV for the following person.

**IMPORTANT FORMATTING RULES:**
- Output ONLY the CV text — no preamble, no explanations, no markdown
- Start with name and contact info at the top
- Use clear section headers: PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, TECHNICAL SKILLS
- Use bullet points (•) for achievements
- Start every bullet with a strong action verb
- Include quantifiable metrics in every achievement
- Make it ATS-friendly with relevant keywords for ${data.target_role}
- Keep it professional and concise (600-700 words)

**CANDIDATE DETAILS:**
Name: ${data.full_name}
Email: ${data.email}
Phone: ${data.phone}
Location: ${data.location}
LinkedIn: ${data.linkedin}
Visa Status: ${data.visa_status}

**TARGET ROLE:** ${data.target_role}

**PROFESSIONAL SUMMARY:**
${data.summary}

**EXPERIENCE:**
${data.experiences.map((exp, i) => `
${i + 1}. ${exp.title} at ${exp.company} (${exp.duration})
Key achievements:
${exp.bullets}
`).join('\n')}

**EDUCATION:**
${data.education.map((edu) => `${edu.degree} — ${edu.institution} (${edu.year})`).join('\n')}

**TECHNICAL SKILLS:** ${data.skills}

**CERTIFICATIONS:** ${data.certifications || 'None'}

Generate a complete, professional UK CV that will score 100/100 on ATS systems. Focus on the ${data.target_role} role.`

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', errorText)
      return NextResponse.json(
        { error: 'AI generation failed' },
        { status: response.status }
      )
    }

    const result = await response.json()
    const generatedCV = result.content?.[0]?.text || ''

    if (!generatedCV) {
      return NextResponse.json({ error: 'No CV generated' }, { status: 500 })
    }

    // Analyze the generated CV
    const analysis = analyzeCV(generatedCV)

    // Generate preview
    const previewHTML = generateCVPreview(generatedCV)

    // Save to database
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

    const { data: savedCV, error: saveError } = await supabase
      .from('cvs')
      .insert({
        user_id: userId,
        raw_text: generatedCV,
        version_type: 'base',
        ats_score: analysis.score,
        ats_grade: analysis.grade,
        issues_json: analysis.issues,
        preview_html: previewHTML,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving generated CV:', saveError)
      return NextResponse.json({ error: 'Failed to save CV' }, { status: 500 })
    }

    // Also auto-fill profile from builder data
    await supabase.from('profiles').upsert(
      {
        user_id: userId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        linkedin_url: data.linkedin,
        visa_status: data.visa_status,
        location_city: data.location,
        target_roles: [data.target_role],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'cv_generated',
      title: `CV Generated: ${analysis.score}/100 ✨`,
      message: `Your professional CV has been created. ${analysis.grade} ATS score!`,
      action_url: `/cv?version=${savedCV.id}`,
      action_label: 'View CV',
      priority: 'high',
    })

    return NextResponse.json({
      success: true,
      cvId: savedCV.id,
      cvText: generatedCV,
      analysis,
      previewHTML,
    })
  } catch (error: any) {
    console.error('[/api/cv/generate] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate CV' },
      { status: 500 }
    )
  }
}