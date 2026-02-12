// POST /api/cv/analyse
// Uses local regex engine — NO external API, NO credits burned
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractProfile, scoreCV } from '@/lib/cv-engine'

export async function POST(req: NextRequest) {
  try {
    const { text, userId, fileName } = await req.json()

    if (!text?.trim() || text.trim().length < 50)
      return NextResponse.json({ error: 'CV text too short — check your file uploaded correctly' }, { status: 400 })
    if (!userId)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Extract using local regex engine — free, instant, no API calls
    const profile = extractProfile(text, userId)
    const ats     = scoreCV(profile, text)

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: ()=>cookieStore.getAll(), setAll:(c)=>c.forEach(({name,value,options})=>cookieStore.set(name,value,options)) } }
    )

    const cvPayload = {
      raw_text:    text.slice(0, 60000),
      ats_score:   ats.score,
      ats_grade:   ats.grade,
      issues_json: ats.issues,
      parsed_json: { ...profile, ats_passed: ats.passed },
      file_name:   fileName || 'cv.pdf',
      updated_at:  new Date().toISOString(),
    }

    const { data: existing } = await supabase.from('cvs').select('id').eq('user_id',userId).eq('version_type','base').maybeSingle()
    let cv: any
    if (existing?.id) {
      const r = await supabase.from('cvs').update(cvPayload).eq('id',existing.id).select().single(); cv=r.data
    } else {
      const r = await supabase.from('cvs').insert({user_id:userId,version_type:'base',...cvPayload}).select().single(); cv=r.data
    }

    // Auto-fill profile
    const p = profile.contact
    await supabase.from('profiles').upsert({
      user_id: userId, updated_at: new Date().toISOString(),
      ...(p.full_name        && { full_name:         p.full_name }),
      ...(p.email            && { email:              p.email }),
      ...(p.phone            && { phone:              p.phone }),
      ...(p.linkedin_url     && { linkedin_url:       p.linkedin_url }),
      ...(p.location         && { location_city:      p.location }),
      ...(profile.current_title      && { job_title:         profile.current_title }),
      ...(profile.all_skills.length   && { skills_list:      profile.all_skills.slice(0,40).join(', ') }),
      ...(profile.total_years_exp     && { years_experience: profile.total_years_exp }),
      ...(profile.highest_degree      && { highest_degree:   profile.highest_degree }),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ cv, ats, profile, autofilled: true })
  } catch (e: any) {
    console.error('[cv/analyse]', e)
    return NextResponse.json({ error: e.message || 'Analysis failed' }, { status: 500 })
  }
}