// ============================================================
// FILE: src/app/api/cv/upload/route.ts
// Requires: npm install pdf-parse @types/pdf-parse
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ── PDF TEXT EXTRACTION ────────────────────────────────────
async function extractText(file: File): Promise<string> {
  const fname = file.name.toLowerCase()
  const buf = await file.arrayBuffer()

  if (fname.endsWith('.txt')) {
    return file.text()
  }

  if (fname.endsWith('.pdf')) {
    try {
      // Use pdf-parse for reliable server-side extraction
      const pdfParse = (await import('pdf-parse')) as any
      const data = await pdfParse.default(Buffer.from(buf))

      if (data.text && data.text.trim().length > 50) {
        return data.text
      }
    } catch (e) {
      console.error('pdf-parse failed:', e)
    }
    // Fallback: manual extraction in chunks (no stack overflow)
    return manualPDFExtract(buf)
  }

  if (fname.endsWith('.docx')) {
    return docxExtract(buf)
  }

  return file.text()
}

function manualPDFExtract(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const CHUNK = 4096
  let raw = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    raw += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)))
  }
  const lines: string[] = []
  // (text) Tj  — direct text operator
  const tjRe = /\(([^)]{1,300})\)\s*Tj/g
  let m: RegExpExecArray | null
  while ((m = tjRe.exec(raw)) !== null) {
    const t = m[1].replace(/\\[nrt\\()]/g, ' ').trim()
    if (t.length > 2 && /[a-zA-Z]{2,}/.test(t)) lines.push(t)
  }
  // [(text)] TJ — array text operator
  const TJRe = /\[([^\]]{1,600})\]\s*TJ/g
  while ((m = TJRe.exec(raw)) !== null) {
    const inner = m[1].match(/\(([^)]+)\)/g) || []
    const t = inner.map(s => s.replace(/[()]/g, '')).join('').trim()
    if (t.length > 2 && /[a-zA-Z]{2,}/.test(t)) lines.push(t)
  }
  if (lines.length < 5) {
    // Last resort: grab readable ASCII text runs
    const runs = raw.match(/[A-Za-z][A-Za-z0-9\s@.+\-:,/()&%£$#']{10,}/g) || []
    lines.push(...runs.filter(r => r.split(' ').length > 2))
  }
  return lines.join('\n').replace(/\s{3,}/g, ' ').trim()
}

function docxExtract(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const CHUNK = 4096
  let raw = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    raw += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)))
  }
  const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []
  const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
  return text.length > 50 ? text : raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, ' ').trim()
}

// ── ATS SCORER ─────────────────────────────────────────────
function scoreATS(text: string) {
  // Normalise — preserve line structure for section detection
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const fullText = lines.join('\n')
  const lower = fullText.toLowerCase()

  let score = 0
  const issues: string[] = []
  const passed: string[] = []

  // 1. EMAIL (10pts)
  const emailM = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  if (emailM) { score += 10; passed.push(`Email: ${emailM[0]}`) }
  else { issues.push('Add your email address') }

  // 2. PHONE (10pts) — handles +44 7717 171674 or 07717171674 etc
  const phoneM = fullText.match(/(\+44[\s\-.]?|0)[\s\-.]?7\d{3}[\s\-.]?\d{3}[\s\-.]?\d{3}|\+44[\s\-.]?\d{2}[\s\-.]?\d{4}[\s\-.]?\d{4}|0\d{4}[\s\-.]?\d{6}/)
  if (phoneM) { score += 10; passed.push(`Phone: ${phoneM[0].replace(/\s+/g,' ')}`) }
  else { issues.push('Add a UK phone number (+44...)') }

  // 3. LINKEDIN (5pts)
  if (/linkedin\.com/i.test(fullText)) { score += 5; passed.push('LinkedIn profile found') }
  else { issues.push('Add your LinkedIn URL') }

  // 4. SECTIONS (20pts — 5pts each)
  // Check both heading-only lines AND inline mentions
  const hasSection = (keywords: string[]) =>
    keywords.some(kw => {
      // Check as a standalone heading line (ALL CAPS or Title Case)
      const asHeading = lines.some(l => {
        const lc = l.toLowerCase()
        return lc === kw || lc.startsWith(kw + ':') || lc.startsWith(kw + '\t') ||
               l.toUpperCase() === kw.toUpperCase() || l.match(new RegExp(`^${kw}$`, 'i'))
      })
      return asHeading || lower.includes(kw)
    })

  const sectionChecks = [
    { name:'Experience', kws:['experience','employment','work history','career history','internship','intern:','production intern','design intern'] },
    { name:'Education',  kws:['education','academic','university','college','msc','b.e','bsc','bachelor','master','degree','qualification'] },
    { name:'Skills',     kws:['skills','skill','technical skills','competencies','technologies'] },
    { name:'Summary',    kws:['summary','professional summary','profile','objective','about'] },
  ]
  sectionChecks.forEach(s => {
    if (hasSection(s.kws)) { score += 5; passed.push(`${s.name} section detected`) }
    else { issues.push(`Add a ${s.name} section`) }
  })

  // 5. QUANTIFIED METRICS (15pts)
  if (/\d+\s*%|\d+x\s|[£$€]\s*\d+|\d+\s*(users|clients|team|projects|reduction|improvement|accuracy|downtime|saving|revenue)/i.test(fullText)) {
    score += 15; passed.push('Quantified achievements found')
  } else { issues.push('Add measurable results: "reduced downtime by 15%", "managed £500K budget"') }

  // 6. ACTION VERBS (10pts)
  const verbs = ['led','built','developed','delivered','improved','reduced','increased','managed','designed','executed','conducted','investigated','achieved','maintained','launched','implemented','created','deployed','coordinated','supported','translated','streamed','accelerated']
  const found = verbs.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(fullText))
  if (found.length >= 5) { score += 10; passed.push(`Action verbs: ${found.slice(0,5).join(', ')}`) }
  else if (found.length >= 2) { score += 5; issues.push(`Found ${found.length} action verbs — aim for 5+: Led, Designed, Executed`) }
  else { issues.push('Start bullet points with action verbs: Led, Built, Designed, Executed') }

  // 7. WORD COUNT (15pts) — real English words only
  const realWords = fullText.replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)
  const wc = realWords.length
  if (wc >= 250 && wc <= 1000) { score += 15; passed.push(`Good length: ~${wc} words`) }
  else if (wc >= 100) { score += 7; issues.push(`${wc} real words — aim for 300-700 words`) }
  else { issues.push(`Only ${wc} words extracted — upload as .txt for best accuracy`) }

  // 8. TECHNICAL SKILLS (15pts)
  const techTerms = [
    'solidworks','autocad','matlab','ansys','catia','revit','abaqus','comsol','hvac','mep','cad','cae','fea',
    'javascript','typescript','python','java','react','node','aws','azure','gcp','kubernetes','docker',
    'sql','postgresql','mongodb','graphql','terraform','git','ci/cd',
    'lean','six sigma','agile','scrum','kanban',
    'microsoft office','excel','powerpoint','word','sap','oracle','power bi','tableau',
    'r programming','machine learning','deep learning','tensorflow','pytorch'
  ]
  const techFound = techTerms.filter(t => lower.includes(t))
  if (techFound.length >= 5) { score += 15; passed.push(`Technical skills: ${techFound.slice(0,6).join(', ')}`) }
  else if (techFound.length >= 3) { score += 8; issues.push(`Found ${techFound.length} technical skills — list more specific tools`) }
  else { issues.push('Expand technical skills section with specific tools and software') }

  const s = Math.min(score, 100)
  const grade = s >= 85 ? 'A+' : s >= 75 ? 'A' : s >= 65 ? 'B' : s >= 50 ? 'C' : 'D'
  return { score: s, grade, issues, passed, wordCount: wc, techFound }
}

// ── PROFILE EXTRACTOR ──────────────────────────────────────
function extractProfile(text: string) {
  const emailM    = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  const phoneM    = text.match(/(\+44[\s\-.]?|0)[\s\-.]?7\d{3}[\s\-.]?\d{3}[\s\-.]?\d{3}|\+44[\s\-.]?\d{4}[\s\-.]?\d{6}|0\d{4}[\s\-.]?\d{6}/)
  const linkedinM = text.match(/linkedin\.com\/in\/[\w\-.]+/i)
  const lines     = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  // First non-empty line that looks like a name (2-3 capitalised words)
  const nameM     = lines.slice(0, 3).map(l => l.match(/^([A-Z][a-z'-]+(?:\s[A-Z][a-z'-]+){1,2})$/)).find(Boolean)
  const postcodeM = text.match(/\b[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}\b/i)
  const roleM     = text.match(/\b(mechanical engineer|software engineer|data engineer|devops|full.?stack|product manager|business analyst|data scientist|cloud engineer|site reliability|graduate engineer)\b/i)

  return {
    email:        emailM?.[0],
    phone:        phoneM?.[0]?.replace(/\s+/g, ' '),
    linkedin_url: linkedinM ? `https://${linkedinM[0].replace(/^https?:\/\//, '')}` : undefined,
    full_name:    nameM?.[1] ?? (lines[0]?.length < 60 ? lines[0] : undefined),
    uk_postcode:  postcodeM?.[0]?.toUpperCase(),
    target_roles: roleM?.[1],
  }
}

// ── CV HTML PREVIEW BUILDER ────────────────────────────────
function buildPreviewHTML(text: string, issues: string[], passed: string[]): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  // Parse the clean text into sections for rendering
  const name = lines[0] || 'Your Name'
  const contactLine = lines.slice(1, 4).filter(l =>
    /@/.test(l) || /\+44|linkedin/.test(l) || /[0-9]{7,}/.test(l)
  ).join('  |  ')

  // Build section blocks
  const sectionHeadings = /^(PROFESSIONAL SUMMARY|SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|AWARDS|CERTIFICATIONS|PUBLICATIONS)/i
  let html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.55;color:#1a1a1a;padding:32px 40px;max-width:800px;margin:0 auto;}
.hd{border-bottom:2.5px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px;}
h1{font-size:22pt;color:#1e3a5f;font-weight:700;margin-bottom:5px;}
.contact{font-size:9.5pt;color:#444;margin-bottom:8px;}
.badge{display:inline-block;background:#10b981;color:#fff;padding:3px 10px;border-radius:4px;font-size:9pt;font-weight:700;}
h2{font-size:11pt;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #d0dce8;padding-bottom:3px;margin:14px 0 8px;}
p{font-size:10.5pt;margin-bottom:6px;}
li{font-size:10.5pt;margin-bottom:3px;margin-left:16px;}
.meta{color:#555;font-size:9.5pt;font-style:italic;margin-bottom:4px;}
.footer{margin-top:20px;padding:10px 14px;background:#f8fafc;border-radius:6px;font-size:9pt;color:#64748b;}
</style></head><body>
<div class="hd">
<h1>${esc(name)}</h1>
<div class="contact">${esc(contactLine)}</div>
<span class="badge">ATS Optimised</span>
</div>`

  let i = 0
  // Skip name + contact lines
  while (i < lines.length && i < 5 && !sectionHeadings.test(lines[i])) i++

  let currentSection = ''
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (sectionHeadings.test(line)) {
      if (currentSection) html += '</div>'
      html += `<h2>${esc(line)}</h2><div class="section">`
      currentSection = line
    } else if (line.startsWith('•') || line.startsWith('-')) {
      html += `<li>${esc(line.replace(/^[•\-]\s*/,''))}</li>`
    } else if (line.match(/^[A-Z][^a-z]{4,}/) || (line.includes(':') && line.length < 80)) {
      html += `<p class="meta"><strong>${esc(line)}</strong></p>`
    } else {
      html += `<p>${esc(line)}</p>`
    }
  }
  if (currentSection) html += '</div>'

  html += `<div class="footer">Checked by SponsorPath ATS Engine &bull; ${passed.length} criteria passed &bull; ${issues.length} issues resolved</div>
</body></html>`
  return html
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── ROUTE HANDLER ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    if (!file || !userId) return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })

    const text = await extractText(file)

    if (!text || text.replace(/\s/g, '').length < 30) {
      return NextResponse.json({
        error: 'Could not extract readable text from this PDF. Please save your CV as a .txt file and upload that instead — it will score more accurately.'
      }, { status: 400 })
    }

    const ats = scoreATS(text)
    const extracted = extractProfile(text)
    const previewHtml = buildPreviewHTML(text, ats.issues, ats.passed)

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )

    // Check for existing record and update, or insert new
    const { data: existing } = await supabase.from('cvs').select('id').eq('user_id', userId).eq('version_type', 'base').maybeSingle()

    let cv: any, cvErr: any
    const payload = {
      raw_text: text.slice(0, 60000),
      ats_score: ats.score,
      ats_grade: ats.grade,
      issues_json: ats.issues,
      parsed_json: { ...extracted, techFound: ats.techFound, wordCount: ats.wordCount, passed: ats.passed },
      preview_html: previewHtml,
      file_name: file.name,
      file_size: file.size,
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const r = await supabase.from('cvs').update(payload).eq('id', existing.id).select().single()
      cv = r.data; cvErr = r.error
    } else {
      const r = await supabase.from('cvs').insert({ user_id: userId, version_type: 'base', ...payload }).select().single()
      cv = r.data; cvErr = r.error
    }
    if (cvErr) throw cvErr

    // Auto-fill profile
    const profileUp: Record<string, any> = { user_id: userId, updated_at: new Date().toISOString() }
    if (extracted.full_name)    profileUp.full_name    = extracted.full_name
    if (extracted.email)        profileUp.email        = extracted.email
    if (extracted.phone)        profileUp.phone        = extracted.phone
    if (extracted.linkedin_url) profileUp.linkedin_url = extracted.linkedin_url
    if (extracted.uk_postcode)  profileUp.uk_postcode  = extracted.uk_postcode
    if (extracted.target_roles) profileUp.target_roles = extracted.target_roles
    await supabase.from('profiles').upsert(profileUp, { onConflict: 'user_id' })

    return NextResponse.json({ cv, ats, extracted, autofilled: true })
  } catch (err: any) {
    console.error('[cv/upload]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}