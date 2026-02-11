// ════════════════════════════════════════════════════════
// FILE: app/api/cv/fix/route.ts
// POST /api/cv/fix
// Fixes CV to 100/100 ATS score using AI
// ════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { analyzeCV, fixCV, generateCVPreview } from '@/lib/cv-fixer'

export async function POST(req: NextRequest) {
  try {
    const { cvId } = await req.json()

    if (!cvId) {
      return NextResponse.json({ error: 'cvId required' }, { status: 400 })
    }

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

    // Get the base CV
    const { data: baseCV, error: cvError } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', cvId)
      .single()

    if (cvError || !baseCV) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 })
    }

    if (!baseCV.raw_text) {
      return NextResponse.json({ error: 'No CV text to fix' }, { status: 400 })
    }

    // Analyze to get issues
    const analysis = analyzeCV(baseCV.raw_text)

    // If already 100/100, no need to fix
    if (analysis.score >= 100) {
      return NextResponse.json({
        success: true,
        message: 'CV already perfect!',
        analysis,
        fixedCVId: cvId,
      })
    }

    // Fix the CV using AI
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const fixedText = await fixCV(baseCV.raw_text, analysis.issues, apiKey)

    // Re-analyze fixed CV
    const fixedAnalysis = analyzeCV(fixedText)

    // Generate preview HTML
    const previewHTML = generateCVPreview(fixedText)

    // Save as new CV version
    const { data: fixedCV, error: saveError } = await supabase
      .from('cvs')
      .insert({
        user_id: baseCV.user_id,
        raw_text: fixedText,
        version_type: 'fixed',
        base_cv_id: cvId,
        ats_score: fixedAnalysis.score,
        ats_grade: fixedAnalysis.grade,
        issues_json: fixedAnalysis.issues,
        fixes_applied: analysis.issues.map((i) => i.category),
        preview_html: previewHTML,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving fixed CV:', saveError)
      return NextResponse.json({ error: 'Failed to save fixed CV' }, { status: 500 })
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: baseCV.user_id,
      type: 'cv_fixed',
      title: `CV Fixed: ${fixedAnalysis.score}/100 ✅`,
      message: `Your CV has been upgraded from ${analysis.score}/100 to ${fixedAnalysis.score}/100. ${fixedAnalysis.issues.length} issues fixed.`,
      action_url: `/cv?version=${fixedCV.id}`,
      action_label: 'View Fixed CV',
      priority: 'high',
      data: { cv_id: fixedCV.id, before: analysis.score, after: fixedAnalysis.score },
    })

    return NextResponse.json({
      success: true,
      fixedCVId: fixedCV.id,
      before: analysis,
      after: fixedAnalysis,
      improvements: {
        score_increase: fixedAnalysis.score - analysis.score,
        issues_fixed: analysis.issues.length - fixedAnalysis.issues.length,
      },
    })
  } catch (error: any) {
    console.error('[/api/cv/fix] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fix CV' },
      { status: 500 }
    )
  }
}