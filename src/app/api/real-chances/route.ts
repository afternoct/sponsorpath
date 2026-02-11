// ═══════════════════════════════════════════════════════════════════
// FILE: app/api/real-chances/route.ts
// Calculate sponsor likelihood based on profile + market data
// ═══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, targetRole, location, visaStatus, salaryMin, salaryMax, cvScore } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
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

    // Generate cache hash
    const inputHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ targetRole, location, visaStatus, salaryMin, salaryMax, cvScore }))
      .digest('hex')

    // Check cache
    const { data: cached } = await supabase
      .from('real_chances_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('input_hash', inputHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      return NextResponse.json({
        result: {
          overall_score: cached.overall_score,
          breakdown: cached.breakdown_json,
          reasons: cached.reasons,
          improvements: cached.improvements
        },
        cached: true
      })
    }

    // Calculate real chances
    const result = await calculateRealChances({
      targetRole,
      location,
      visaStatus,
      salaryMin,
      salaryMax,
      cvScore,
      supabase
    })

    // Cache result
    await supabase.from('real_chances_cache').upsert({
      user_id: userId,
      input_hash: inputHash,
      overall_score: result.overall_score,
      breakdown_json: result.breakdown,
      reasons: result.reasons,
      improvements: result.improvements,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'user_id,input_hash' }).then()

    return NextResponse.json({ result })

  } catch (err: any) {
    console.error('[/api/real-chances]', err)
    return NextResponse.json({ error: err.message || 'Calculation failed' }, { status: 500 })
  }
}

async function calculateRealChances(params: {
  targetRole: string
  location: string
  visaStatus: string
  salaryMin: number
  salaryMax: number
  cvScore: number
  supabase: any
}) {
  const { targetRole, location, visaStatus, salaryMin, salaryMax, cvScore, supabase } = params

  // 1. Skill Match (based on CV score)
  const skill_match = Math.min(cvScore, 100)

  // 2. Market Demand (count sponsor jobs for this role)
  const { count: totalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
    .eq('sponsor_verified', true)
    .ilike('title', `%${targetRole.split(' ')[0]}%`)

  const market_demand = Math.min((totalJobs || 0) * 2, 100)

  // 3. Visa Factor
  const visaFactors: Record<string, number> = {
    'Graduate Visa (PSW)': 85,
    'Skilled Worker Visa': 100,
    'Student Visa': 40,
    'British Citizen / ILR': 100,
    'EU Settled Status': 95
  }
  const visa_factor = visaFactors[visaStatus] || 50

  // 4. Salary Alignment (check if expectations are realistic)
  const avgSalary = targetRole.toLowerCase().includes('senior') ? 80000 :
                   targetRole.toLowerCase().includes('lead') ? 90000 :
                   targetRole.toLowerCase().includes('junior') ? 40000 : 60000
  
  const salaryDiff = Math.abs(salaryMin - avgSalary) / avgSalary
  const salary_alignment = Math.max(100 - (salaryDiff * 100), 0)

  // 5. CV Quality
  const cv_quality = cvScore

  // Calculate weighted overall score
  const overall_score = Math.round(
    (skill_match * 0.25) +
    (market_demand * 0.2) +
    (visa_factor * 0.25) +
    (salary_alignment * 0.15) +
    (cv_quality * 0.15)
  )

  // Generate reasons (why score isn't higher)
  const reasons: string[] = []
  if (cvScore < 80) reasons.push(`CV score is ${cvScore}/100 — improve to 100 for better chances`)
  if (visa_factor < 85) reasons.push(`Visa status (${visaStatus}) limits sponsor options`)
  if (market_demand < 50) reasons.push(`Limited sponsor jobs for "${targetRole}" in ${location}`)
  if (salary_alignment < 70) reasons.push(`Salary expectation (£${salaryMin.toLocaleString()}) is ${salaryMin > avgSalary ? 'above' : 'below'} market average`)

  // Generate improvements
  const improvements: any[] = []
  if (cvScore < 100) improvements.push({ fix: 'Fix CV to 100/100 using our AI tool', impact: `+${Math.round((100 - cvScore) * 0.15)}%` })
  if (salary_alignment < 80) improvements.push({ fix: `Adjust salary to £${avgSalary.toLocaleString()} (market average)`, impact: '+8%' })
  if (location !== 'London') improvements.push({ fix: 'Expand search to London (most sponsor jobs)', impact: '+12%' })
  if (visa_factor < 85) improvements.push({ fix: 'Apply before visa expiry for urgency', impact: '+5%' })

  return {
    overall_score,
    breakdown: {
      skill_match,
      market_demand,
      visa_factor,
      salary_alignment,
      cv_quality
    },
    reasons,
    improvements
  }
}