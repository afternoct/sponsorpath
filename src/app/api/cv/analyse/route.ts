// ============================================================
// FILE: src/app/api/cv/analyse/route.ts
// Receives CLEAN TEXT from client (extracted via PDF.js)
// No PDF parsing here — just scoring and saving
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function scoreATS(text: string) {
  const lower = text.toLowerCase()
  let score = 0
  const issues: string[] = []
  const passed: string[] = []

  // EMAIL (10 pts)
  const emailM = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  if (emailM) { score += 10; passed.push(`Email: ${emailM[0]}`) }
  else { issues.push('Add your email address') }

  // PHONE (10 pts)
  const phoneM = text.match(/\+44[\s]?7\d{3}[\s]?\d{3}[\s]?\d{3,4}/)
             ?? text.match(/07\d{3}[\s]?\d{3}[\s]?\d{3,4}/)
             ?? text.match(/\+44[\s]\d{4}[\s]\d{6}/)
  if (phoneM) { score += 10; passed.push(`Phone: ${phoneM[0].trim()}`) }
  else { issues.push('Add a UK phone number') }

  // LINKEDIN (5 pts)
  if (/linkedin\.com/i.test(text)) { score += 5; passed.push('LinkedIn profile found') }
  else { issues.push('Add your LinkedIn URL') }

  // SECTIONS (5 pts each = 20)
  const secs = [
    { name:'Experience', p:['experience','employment','internship','intern:','work history','production intern','design intern'] },
    { name:'Education',  p:['education','university','college','msc ','b.e ','bsc ','bachelor','master','degree '] },
    { name:'Skills',     p:['skills','technical skills','competencies'] },
    { name:'Summary',    p:['professional summary','summary','profile','objective'] },
  ]
  for (const s of secs) {
    if (s.p.some(p => lower.includes(p))) { score += 5; passed.push(`${s.name} section found`) }
    else { issues.push(`Add a ${s.name} section`) }
  }

  // METRICS (15 pts)
  if (/\d+\s*%|\d+x |[£$€]\d+|\d+\s*(users|clients|reduction|improvement|accuracy|downtime|saving|revenue)/i.test(text)) {
    score += 15; passed.push('Quantified achievements found')
  } else { issues.push('Add measurable results: "reduced downtime by 15%"') }

  // ACTION VERBS (10 pts)
  const verbs = ['led','built','developed','delivered','improved','reduced','managed','designed','executed','conducted','investigated','achieved','maintained','launched','implemented','created','supported','translated','accelerated']
  const fv = verbs.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(text))
  if (fv.length >= 5) { score += 10; passed.push(`Action verbs: ${fv.slice(0,5).join(', ')}`) }
  else if (fv.length >= 2) { score += 5; issues.push(`${fv.length} action verbs — aim for 5+`) }
  else { issues.push('Start bullets with action verbs: Led, Built, Designed, Executed') }

  // WORD COUNT (15 pts)
  const wc = text.replace(/[^a-zA-Z\s]/g,' ').split(/\s+/).filter(w => w.length > 2).length
  if (wc >= 250 && wc <= 1000) { score += 15; passed.push(`Good length: ~${wc} words`) }
  else if (wc >= 100) { score += 7; issues.push(`${wc} words — aim for 300-700`) }
  else { issues.push(`Only ${wc} words found`) }

  // TECH SKILLS (15 pts)
  const tech = ['solidworks','autocad','matlab','ansys','catia','hvac','mep','cad','fea','revit',
    'javascript','typescript','python','java','react','node','aws','azure','kubernetes','docker',
    'sql','git','terraform','lean','six sigma','agile','scrum','microsoft office','excel','sap',
    'power bi','tableau','sketchup','vray']
  const ft = tech.filter(t => lower.includes(t))
  if (ft.length >= 4) { score += 15; passed.push(`Technical skills: ${ft.slice(0,5).join(', ')}`) }
  else if (ft.length >= 2) { score += 7; issues.push(`${ft.length} technical skills — expand the list`) }
  else { issues.push('Expand technical skills with specific tools') }

  const s = Math.min(score, 100)
  return { score: s, grade: s>=85?'A+':s>=75?'A':s>=65?'B':s>=50?'C':'D', issues, passed, wordCount: wc, techFound: ft }
}

function extractProfile(text: string) {
  const emailM    = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  const phoneM    = text.match(/\+44[\s]?7\d{3}[\s]?\d{3}[\s]?\d{3,4}/)
                 ?? text.match(/07\d{3}[\s]?\d{3}[\s]?\d{3,4}/)
  const linkedinM = text.match(/linkedin\.com\/in\/[\w\-.]+/i)
  const lines     = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  const nameM     = lines.slice(0,3).find(l => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(l) && l.length < 60)
  const roleM     = text.match(/\b(mechanical engineer|software engineer|data engineer|devops|full.?stack|product manager|business analyst|data scientist|graduate engineer|manufacturing engineer)\b/i)
  return {
    email:        emailM?.[0],
    phone:        phoneM?.[0]?.trim(),
    linkedin_url: linkedinM ? `https://${linkedinM[0].replace(/^https?:\/\//,'')}` : undefined,
    full_name:    nameM,
    target_roles: roleM?.[1],
  }
}

function buildPreviewHTML(text: string, issues: string[], passed: string[]): string {
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  const name = lines[0] || 'Your Name'
  const sectionRe = /^(PROFESSIONAL SUMMARY|SUMMARY|EXPERIENCE|EMPLOYMENT|EDUCATION|SKILLS|TECHNICAL SKILLS|PROJECTS|AWARDS|CERTIFICATIONS|ACHIEVEMENTS)/i
  const contacts = lines.slice(1,6).filter(l => /@/.test(l)||/\+44|linkedin/i.test(l)||/[0-9]{8,}/.test(l))
    .flatMap(l=>l.split(/\s*[\|·]\s*/)).map(s=>s.trim()).filter(Boolean)
  let body = ''; let skip = true
  for (let i=0; i<lines.length; i++) {
    const l = lines[i]
    if (skip && i < 8 && (l===name || /@/.test(l)||/\+44|linkedin/i.test(l)||/eligible/i.test(l))) continue
    skip = false
    if (sectionRe.test(l)) body += `<h2>${l.toUpperCase()}</h2>\n`
    else if (/^[•\-*]/.test(l)) body += `<li>${l.replace(/^[•\-*]\s*/,'')}</li>\n`
    else if (/\b(20\d\d|intern|engineer|manager|developer|analyst|researcher)\b/i.test(l) && l.length<120) body += `<p><strong>${l}</strong></p>\n`
    else body += `<p>${l}</p>\n`
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.6;color:#1a1a1a;padding:36px 44px;max-width:800px;margin:0 auto;}
.hd{border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px;}
h1{font-size:22pt;color:#1e3a5f;font-weight:700;margin-bottom:6px;}
.ct{font-size:9.5pt;color:#444;display:flex;flex-wrap:wrap;gap:14px;margin-bottom:8px;}
.ct a{color:#1e3a5f;text-decoration:none;}
.badge{display:inline-block;background:#10b981;color:#fff;padding:3px 10px;border-radius:4px;font-size:9pt;font-weight:700;}
h2{font-size:10.5pt;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid #d0dce8;padding-bottom:3px;margin:14px 0 7px;}
p{margin-bottom:4px;font-size:10.5pt;}li{font-size:10.5pt;margin:3px 0 3px 18px;}
.ft{margin-top:20px;padding:10px 14px;background:#f8fafc;border-radius:6px;font-size:9pt;color:#64748b;}
</style></head><body>
<div class="hd"><h1>${name}</h1>
<div class="ct">${contacts.map(c=>/linkedin/i.test(c)?`<a href="${c.startsWith('http')?c:'https://'+c}">${c}</a>`:`<span>${c}</span>`).join('')}</div>
<span class="badge">ATS Optimised</span></div>
${body}
<div class="ft">SponsorPath ATS &bull; ${passed.length} passed &bull; ${issues.length} issues addressed</div>
</body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const { text, userId, fileName } = await req.json()
    if (!text || !userId) return NextResponse.json({ error: 'Missing text or userId' }, { status: 400 })
    if (text.trim().length < 50) return NextResponse.json({ error: 'CV text too short — try uploading as TXT' }, { status: 400 })

    const ats = scoreATS(text)
    const extracted = extractProfile(text)
    const previewHtml = buildPreviewHTML(text, ats.issues, ats.passed)

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: ()=>cookieStore.getAll(), setAll: (c)=>c.forEach(({name,value,options})=>cookieStore.set(name,value,options)) } }
    )

    const payload = {
      raw_text: text.slice(0,60000), ats_score: ats.score, ats_grade: ats.grade,
      issues_json: ats.issues,
      parsed_json: { ...extracted, techFound: ats.techFound, wordCount: ats.wordCount, passed: ats.passed },
      preview_html: previewHtml, file_name: fileName||'cv', updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase.from('cvs').select('id').eq('user_id',userId).eq('version_type','base').maybeSingle()
    let cv: any, cvErr: any
    if (existing?.id) {
      const r = await supabase.from('cvs').update(payload).eq('id',existing.id).select().single()
      cv=r.data; cvErr=r.error
    } else {
      const r = await supabase.from('cvs').insert({user_id:userId,version_type:'base',...payload}).select().single()
      cv=r.data; cvErr=r.error
    }
    if (cvErr) throw cvErr

    const prof: Record<string,any> = { user_id:userId, updated_at:new Date().toISOString() }
    if (extracted.full_name)    prof.full_name    = extracted.full_name
    if (extracted.email)        prof.email        = extracted.email
    if (extracted.phone)        prof.phone        = extracted.phone
    if (extracted.linkedin_url) prof.linkedin_url = extracted.linkedin_url
    if (extracted.target_roles) prof.target_roles = extracted.target_roles
    await supabase.from('profiles').upsert(prof, { onConflict:'user_id' })

    return NextResponse.json({ cv, ats, extracted, autofilled: true })
  } catch(err: any) {
    console.error('[cv/analyse]', err)
    return NextResponse.json({ error: err.message||'Analysis failed' }, { status: 500 })
  }
}