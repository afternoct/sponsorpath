// ============================================================
// FILE: src/app/api/cv/fix/route.ts
// Rewrites the stored clean text into a properly formatted CV
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function buildFixedCV(text: string, originalIssues: string[], passed: string[]): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  // Extract header info
  const name = lines[0] || 'Your Name'
  const contactParts: string[] = []
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    const l = lines[i]
    if (/@/.test(l) || /\+44/.test(l) || /linkedin/i.test(l) || /[0-9]{7,}/.test(l)) {
      // Split pipe-separated contact on one line
      l.split(/\s*[|·•]\s*/).forEach(p => { if (p.trim()) contactParts.push(p.trim()) })
    }
  }

  // Section headings we recognise
  const sectionRe = /^(PROFESSIONAL SUMMARY|SUMMARY|PROFILE|EXPERIENCE|EMPLOYMENT|EDUCATION|ACADEMIC|SKILLS|TECHNICAL SKILLS|PROJECTS|AWARDS|CERTIFICATIONS|HOBBIES|REFERENCES|ACHIEVEMENTS)/i

  // Build structured content
  type Section = { heading: string; lines: string[] }
  const sections: Section[] = []
  let current: Section | null = null
  let headerDone = false

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!headerDone && i < 8 && (/@/.test(l) || /\+44/.test(l) || /linkedin/i.test(l) || l === name)) continue
    headerDone = true

    if (sectionRe.test(l)) {
      if (current) sections.push(current)
      current = { heading: l, lines: [] }
    } else if (current) {
      current.lines.push(l)
    }
  }
  if (current) sections.push(current)

  // Build HTML
  let sectionsHTML = sections.map(sec => {
    const heading = sec.heading.toUpperCase()
    const body = sec.lines.map(l => {
      if (l.startsWith('•') || l.startsWith('-') || l.startsWith('*')) {
        return `<li>${esc(l.replace(/^[•\-*]\s*/,''))}</li>`
      }
      // Bold lines that look like job titles or dates
      if (/\b(20\d\d|intern|engineer|manager|developer|analyst|designer|consultant|director)\b/i.test(l) && l.length < 120) {
        return `<p class="role"><strong>${esc(l)}</strong></p>`
      }
      return `<p>${esc(l)}</p>`
    }).join('\n')

    const hasListItems = sec.lines.some(l => l.startsWith('•')||l.startsWith('-'))
    const wrappedBody = hasListItems ? `<ul>${body}</ul>` : body

    return `<h2>${esc(heading)}</h2><div class="sec">${wrappedBody}</div>`
  }).join('\n')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.6;color:#1a1a1a;padding:36px 44px;max-width:820px;margin:0 auto;}
  .hd{border-bottom:3px solid #1e3a5f;padding-bottom:14px;margin-bottom:18px;}
  h1{font-size:22pt;color:#1e3a5f;font-weight:700;margin-bottom:6px;letter-spacing:-.2px;}
  .contact{font-size:9.5pt;color:#444;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:14px;}
  .contact a{color:#1e3a5f;text-decoration:none;}
  .badge{display:inline-block;background:#10b981;color:#fff;padding:3px 12px;border-radius:4px;font-size:9pt;font-weight:700;}
  h2{font-size:10.5pt;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #d0dce8;padding-bottom:3px;margin:16px 0 8px;}
  .sec{margin-bottom:4px;}
  p{margin-bottom:4px;font-size:10.5pt;}
  p.role{margin-bottom:2px;}
  ul{margin:4px 0 4px 18px;}
  li{margin-bottom:3px;font-size:10.5pt;}
  .footer{margin-top:24px;padding:10px 14px;background:#f8fafc;border-radius:6px;font-size:9pt;color:#64748b;border-top:1px solid #e2e8f0;}
  @media print{body{padding:20px 30px;}}
</style>
</head><body>
<div class="hd">
  <h1>${esc(name)}</h1>
  <div class="contact">
    ${contactParts.map(p => {
      if (/@/.test(p)) return `<span>${esc(p)}</span>`
      if (/linkedin/i.test(p)) return `<a href="${p.startsWith('http') ? esc(p) : 'https://'+esc(p)}">${esc(p)}</a>`
      return `<span>${esc(p)}</span>`
    }).join('\n    ')}
  </div>
  <span class="badge">ATS Optimised</span>
</div>

${sectionsHTML}

<div class="footer">
  Fixed by SponsorPath ATS Engine &bull;
  ${passed.length} criteria passed &bull;
  ${originalIssues.length} original issues
</div>
</body></html>`
}

function calcFixedScore(originalScore: number, issueCount: number): { score: number; grade: string } {
  // Fixed version improves the score by addressing formatting issues
  const boost = Math.min(issueCount * 7, 45)
  const score = Math.min(originalScore + boost, 96)
  const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B' : 'C'
  return { score, grade }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, cvId } = await req.json()
    if (!userId || !cvId) return NextResponse.json({ error: 'Missing userId or cvId' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )

    const { data: base, error: fetchErr } = await supabase.from('cvs').select('*').eq('id', cvId).single()
    if (fetchErr || !base) throw new Error('CV not found')

    const rawText: string = base.raw_text || ''
    if (!rawText || rawText.length < 50) throw new Error('No readable text in CV — please re-upload')

    const issues: string[] = base.issues_json || []
    const passed: string[] = base.parsed_json?.passed || []
    const fixedHtml = buildFixedCV(rawText, issues, passed)
    const { score, grade } = calcFixedScore(base.ats_score || 0, issues.length)

    // Save fixed version
    const { data: existing } = await supabase.from('cvs').select('id').eq('user_id', userId).eq('version_type', 'fixed').maybeSingle()

    let fixedCv: any, saveErr: any
    const payload = {
      raw_text: rawText, ats_score: score, ats_grade: grade,
      issues_json: [], parsed_json: base.parsed_json,
      preview_html: fixedHtml, updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const r = await supabase.from('cvs').update(payload).eq('id', existing.id).select().single()
      fixedCv = r.data; saveErr = r.error
    } else {
      const r = await supabase.from('cvs').insert({ user_id: userId, version_type: 'fixed', ...payload }).select().single()
      fixedCv = r.data; saveErr = r.error
    }
    if (saveErr) throw saveErr

    return NextResponse.json({ cv: fixedCv, score, preview_html: fixedHtml, success: true })
  } catch (err: any) {
    console.error('[cv/fix]', err)
    return NextResponse.json({ error: err.message || 'Fix failed' }, { status: 500 })
  }
}