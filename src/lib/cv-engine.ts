// ============================================================
// SPONSORPATH — CV ENGINE v6
// Zero external API calls. Free. Instant.
//
// Handles ALL formats:
//   • Two-column PDFs (Vineeth — ALLCAPS blocks)
//   • Single-line collapsed PDFs (Vaishnavi — no newlines)
//   • Inline dash format: "Title – Company Date | Location"
//   • Colon format: "Title: Company, Location, Date"
//   • Plain single-column Word/TXT
// ============================================================

// ─── TYPES ────────────────────────────────────────────────────
export interface CandidateProfile {
  user_id:              string
  contact: {
    full_name:            string
    email:                string
    phone:                string
    linkedin_url:         string
    location:             string
  }
  work_history:          WorkEntry[]
  education:             EduEntry[]
  all_skills:            string[]
  tech_skills:           string[]
  skills_by_category:    Array<{ category: string; skills: string[] }>
  certifications:        string[]
  languages:             Array<{ name: string; level: string }>
  soft_skills:           string[]
  professional_summary:  string
  current_title:         string
  current_company:       string
  highest_degree:        string
  total_years_exp:       number
  target_roles:          string[]
  target_location:       string
}

export interface WorkEntry {
  title:    string
  company:  string
  location: string
  dates:    string
  current:  boolean
  bullets:  string[]
}

export interface EduEntry {
  degree:      string
  institution: string
  location:    string
  dates:       string
  grade:       string
}

export interface ATSResult {
  score:  number
  grade:  string
  passed: string[]
  issues: string[]
}

// ─── KNOWN SECTION HEADINGS ───────────────────────────────────
// Listed longest-first so multi-word headings match before single-word
const HEADINGS = [
  'PROFESSIONAL SUMMARY','PROFESSIONAL EXPERIENCE','EMPLOYMENT HISTORY',
  'WORK EXPERIENCE','TECHNICAL SKILLS','CORE SKILLS','KEY SKILLS',
  'ACADEMIC BACKGROUND','ACADEMIC QUALIFICATIONS','PERSONAL DETAILS',
  'ADDITIONAL INFORMATION','SOFT SKILLS','SUMMARY','EXPERIENCE',
  'EMPLOYMENT','SKILLS','EDUCATION','CERTIFICATIONS','CERTIFICATION',
  'ACHIEVEMENTS','AWARDS','LANGUAGES','PROJECTS','INTERESTS','HOBBIES',
  // Mixed-case variants (single-line CVs use these)
  'Professional Summary','Professional Experience','Work Experience',
  'Core Skills','Key Skills','Technical Skills','Employment History',
  'Education','Certifications','Languages','Personal Details',
  'Additional Information','Soft Skills','Projects','Interests',
]

// ─── REGEXES ──────────────────────────────────────────────────
// Dates: all formats — mm/yyyy, Month yyyy, yyyy, with any separator
const DATE_RE = /(\d{1,2}\/\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|\d{4}|Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})/i

const SEC_RE   = new RegExp(`^(${HEADINGS.map(h=>h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})\\s*$`, 'im')
const CAPS_RE  = /^[A-Z][A-Z\s\(\)&\/\-\.0-9]{4,}$/
const NOT_JOB  = new Set(['AWS','IAM','VPC','EC2','S3','RDS','EBS','EKS','ECS',
  'SNS','SQS','ELB','ECR','SQL','API','CLI','SSH','SSL','YAML','JSON','CI','CD'])

const h = (s:string) => (s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

function esc(s:string){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') }
function kwMatch(t:string, text:string){ 
  if (/[+#*?()[\]{}|^$/]/.test(t)) return text.toLowerCase().includes(t.toLowerCase())
  try{ return new RegExp(`\\b${esc(t)}\\b`,'i').test(text) }catch{ return text.toLowerCase().includes(t.toLowerCase()) }
}

// ─── ALL TECH KEYWORDS ────────────────────────────────────────
const TECH = [
  'AWS','Azure','GCP','Google Cloud','Kubernetes','Docker','Terraform','Ansible','Jenkins',
  'Helm','ArgoCD','Spinnaker','CloudFormation','Pulumi','EC2','S3','IAM','VPC','Lambda',
  'ECS','EKS','RDS','DynamoDB','CloudFront','CloudWatch','Route53','SQS','SNS','Elasticsearch',
  'Python','Java','JavaScript','TypeScript','Go','Rust','Ruby','Scala','Kotlin','Swift','Bash','Shell',
  'React','Angular','Vue','Spring','Django','FastAPI','Flask','Node.js','Next.js',
  'SQL','PostgreSQL','MySQL','MongoDB','Redis','Oracle','Cassandra','Kafka','RabbitMQ',
  'Linux','Unix','PowerShell','YAML','JSON','Git','GitLab','GitHub','Bitbucket','CircleCI',
  'Prometheus','Grafana','Datadog','Splunk','Kibana','SonarQube','JIRA','Confluence',
  'Vault','Consul','Istio','Envoy','Nginx','Puppet','Maven','Gradle','Webpack',
  'VMware','Vagrant','VirtualBox','Agile','Scrum','Kanban','DevOps','Microservices',
  'SolidWorks','AutoCAD','MATLAB','Ansys','HVAC','CAD','FEA','Revit',
  'C#','C++','CI/CD','REST API','gRPC','GitHub Actions','GitLab CI','ELK Stack',
  'Six Sigma','Power BI','MLOps','IaC','SRE','NAT Gateway','Load Balancers',
]

// ─────────────────────────────────────────────────────────────
// STEP 1 — NORMALIZE
// Handles single-line PDFs by inserting \n before headings + bullets
// ─────────────────────────────────────────────────────────────
function normalize(raw: string): string {
  let text = raw

  // If PDF collapsed to single line (< 5 newlines), inject structure
  if ((text.match(/\n/g) || []).length < 5) {
    // Insert \n before each known section heading
    for (const heading of HEADINGS) {
      text = text.replace(
        new RegExp(`\\s(${esc(heading)})\\s`, 'g'),
        `\n$1\n`
      )
    }
    // Insert \n before bullet symbols
    text = text.replace(/\s[●•]\s/g, '\n● ')
    // Split "field1 | field2" (common in single-line contact + location)
    text = text.replace(/\s\|\s/g, '\n')
    // Split "Title – Company Month Year" pattern into own line
    text = text.replace(
      /([A-Z][a-z].{3,50}?)\s[–—]\s([A-Z][a-zA-Z\s&]{2,40}?)\s((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})/g,
      '\n$1 – $2 $3'
    )
  }

  // Clean regardless of format
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 0 &&
      !/^Page \d+ of \d+$/i.test(l) &&
      !['Achievements/Tasks','Achievements','Tasks',',','.','–','—'].includes(l)
    )

  // Rejoin split LinkedIn URLs: "linkedin.com/in/name-\n12345"
  const joined: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].endsWith('-') && /^[a-z0-9]{3,}$/.test(lines[i+1]??'')) {
      joined.push(lines[i] + lines[i+1]); i++
    } else joined.push(lines[i])
  }

  // Merge line-wrap fragments (starts lowercase, not a date, not a section)
  const merged: string[] = []
  for (const l of joined) {
    const prev = merged[merged.length-1] ?? ''
    const isFrag = /^[a-z(,]/.test(l) && !DATE_RE.test(l) && !SEC_RE.test(l)
    if (merged.length && isFrag && !SEC_RE.test(l)) {
      merged[merged.length-1] = prev.replace(/,\s*$/,'').trimEnd() + ' ' + l
    } else merged.push(l)
  }

  return merged.join('\n')
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — SPLIT SECTIONS
// ─────────────────────────────────────────────────────────────
function splitSections(text: string): Record<string,string> {
  const parts = text.split(SEC_RE)
  const secs:  Record<string,string> = {}
  for (let i = 1; i < parts.length; i += 2) {
    const k = parts[i].trim().toUpperCase()
    const v = (parts[i+1]??'').trim()
    const canon =
      /EXPERIENCE|EMPLOYMENT/.test(k)           ? 'EXP'  :
      /SKILL|TECHNICAL|COMPETENC/.test(k)       ? 'SKILLS':
      /EDUCATION|ACADEMIC/.test(k)              ? 'EDU'  :
      /SUMMARY|PROFILE|OBJECTIVE|ABOUT/.test(k) ? 'SUM'  :
      /CERTIF|AWARD|ACHIEVE/.test(k)            ? 'CERTS':
      /LANGUAGE/.test(k)                        ? 'LANGS':
      /SOFT/.test(k)                            ? 'SOFT' :
      /PERSONAL|ADDITIONAL/.test(k)             ? 'PERS' : k
    secs[canon] = secs[canon] ? secs[canon] + '\n' + v : v
  }
  return secs
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — EXTRACT CONTACT
// Works on full text — immune to layout
// ─────────────────────────────────────────────────────────────
function extractContact(text: string) {
  const email    = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] ?? ''
  // UK and Indian phone numbers
  const phone    = text.match(/(?:\+44[\s]?|0)7\d{3}[\s]?\d{3}[\s]?\d{3,4}|\+44[\s]?\d{4,5}[\s]?\d{5,6}|\+91[\s]?\d{5}[\s]?\d{5}/)?.[0]?.replace(/\s/g,'') ?? ''
  const linkedin = text.match(/(?:www\.)?linkedin\.com\/in\/[\w\-]+/i)?.[0] ?? ''
  const location = text.slice(0,800).match(/\b(London|Manchester|Birmingham|Edinburgh|Bristol|Leeds|Hyderabad|Mumbai|Bangalore|Delhi|Telangana|India|UK|United Kingdom|Remote)\b/i)?.[0] ?? ''

  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
  let name = '', title = ''

  // Mixed-case "First Last"
  for (const l of lines.slice(0,6)) {
    if (/^[A-Z][a-z'\-]+(\s[A-Z][a-z'\-]+){1,3}$/.test(l) && l.length < 55) { name=l; break }
  }
  // ALLCAPS "VINEETH PALLETI"
  if (!name) for (const l of lines.slice(0,4)) {
    if (CAPS_RE.test(l) && !SEC_RE.test(l) && l.split(' ').length <= 4 && l.length < 40) {
      name = l.split(' ').map((w:string)=>w[0]+w.slice(1).toLowerCase()).join(' '); break
    }
  }
  // First token before email on same line: "Vaishnavi Chidurala vaishuchid@gmail.com"
  if (!name && email) {
    const el = lines.find(l=>l.includes(email))
    if (el) {
      const before = el.split(email)[0].replace(/[|,;]+$/,'').trim()
      if (before && /^[A-Z][a-z]/.test(before) && before.length < 50) name = before
    }
  }

  // Job title: short line with role keyword
  for (const l of lines.slice(0,10)) {
    if (/\b(engineer|developer|devops|analyst|manager|architect|consultant|designer|specialist|lead|associate)\b/i.test(l)
        && !l.includes('@') && !l.includes('linkedin') && l.length > 4 && l.length < 100) {
      title = CAPS_RE.test(l) ? l.split(' ').map((w:string)=>w[0]+w.slice(1).toLowerCase()).join(' ') : l.trim()
      break
    }
  }

  return { name, title, email, phone, linkedin, location }
}

// ─────────────────────────────────────────────────────────────
// STEP 4 — PARSE JOBS
// Auto-detects format: ALLCAPS blocks, dash-style, or colon-style
// ─────────────────────────────────────────────────────────────
function parseJobs(expText: string): WorkEntry[] {
  if (!expText.trim()) return []
  const lines = expText.split('\n').map(l=>l.trim()).filter(Boolean)

  // Detect dash-style: "AWS DevOps Engineer – New Horizon Cybersoft Aug 2024 – Present"
  const dashStyle = lines.some(l =>
    /^.{3,60}\s[–—]\s[A-Z][a-zA-Z\s&,\.]{2,50}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{2}\/\d{4})/i.test(l)
  )
  if (dashStyle) return parseDashJobs(lines)

  // Detect colon-style: "Title: Company, Location Date"
  const colonStyle = lines.some(l =>
    /^[A-Z].{3,60}(?:intern|engineer|developer|devops|analyst|manager|consultant|associate)[^:]*:\s*.{5,}/i.test(l)
  )
  if (colonStyle) return parseColonJobs(lines)

  // Default: ALLCAPS block style
  return parseBlockJobs(lines)
}

// "Title – Company Date" on one line, bullets below
function parseDashJobs(lines: string[]): WorkEntry[] {
  const jobs: WorkEntry[] = []
  let cur: WorkEntry | null = null

  for (const l of lines) {
    // Match "Title – Company Date"  or  "Title – Company Date | Location"
    const jm = l.match(/^(.{3,60}?)\s[–—]\s([A-Z][a-zA-Z\s&,\.]{2,50}?)\s+((?:\d{1,2}\/\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—]\s*(?:\d{1,2}\/\d{4}|\d{4}|Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}))/i)
    if (jm) {
      if (cur) jobs.push(cur)
      // Location may be on same line after " | "
      const locm = l.match(/\|\s*([A-Za-z\s,]+)$/)
      cur = {
        title:    jm[1].trim(),
        company:  jm[2].trim().replace(/,\s*$/, ''),
        location: locm ? locm[1].trim() : '',
        dates:    jm[3].trim(),
        current:  /present|current|now/i.test(jm[3]),
        bullets:  [],
      }
    } else if (cur) {
      // Location line: "Hyderabad, India" or "London, UK"
      if (/^[A-Z][a-zA-Z\s]+,\s*[A-Za-z\s]+$/.test(l) && l.length < 50 && !cur.location
          && !/implement|develop|build|deploy|manage|automate/i.test(l)) {
        cur.location = l; continue
      }
      const b = l.replace(/^[●•\-\*]\s*/,'').trim()
      if (b.length > 8 && !DATE_RE.test(b)) {
        if (cur.bullets.length && /^[a-z(]/.test(b)) cur.bullets[cur.bullets.length-1] += ' ' + b
        else cur.bullets.push(b)
      }
    }
  }
  if (cur) jobs.push(cur)
  return jobs
}

// "Title: Company, Location Date"
function parseColonJobs(lines: string[]): WorkEntry[] {
  const jobs: WorkEntry[] = []
  let cur: WorkEntry | null = null
  for (const l of lines) {
    const jm = l.match(/^(.{3,60}?(?:intern|engineer|developer|devops|analyst|manager|consultant|associate)[^:]*?):\s*(.+)$/i)
    if (jm) {
      if (cur) jobs.push(cur)
      const rest = jm[2], dm = l.match(DATE_RE)
      cur = {
        title:    jm[1].trim(),
        company:  rest.split(',')[0]?.trim() ?? '',
        location: rest.split(',')[1]?.trim() ?? '',
        dates:    dm ? dm[0] : '',
        current:  /present|current|now/i.test(dm?.[0]??''),
        bullets:  [],
      }
    } else if (cur) {
      const b = l.replace(/^[●•\-\*]\s*/,'').trim()
      if (b.length > 8 && !DATE_RE.test(b)) {
        if (cur.bullets.length && /^[a-z(]/.test(b)) cur.bullets[cur.bullets.length-1] += ' ' + b
        else cur.bullets.push(b)
      }
    }
  }
  if (cur) jobs.push(cur)
  return jobs
}

// ALLCAPS TITLE → ALLCAPS COMPANY → date line → bullets
function parseBlockJobs(lines: string[]): WorkEntry[] {
  const jobs: WorkEntry[] = []
  let cur: WorkEntry | null = null
  let awaitCo = false

  for (const l of lines) {
    if ([',','.','–','—'].includes(l)) continue

    const lClean = l.replace(/\{[^}]*\}/g,'').trim()
    const dm = DATE_RE.exec(l)
    if (dm) {
      if (cur && !cur.dates) cur.dates = dm[0]
      const locm = l.replace(dm[0],'').match(/\b(London|UK|United Kingdom|India|France|USA|Remote|Hyderabad|Annecy)\b/i)
      if (locm && cur && !cur.location) cur.location = locm[0].replace(/UNITEDKINGDOM/i,'United Kingdom')
      awaitCo = false; continue
    }

    if (/\b(LONDON|UNITED KINGDOM|UNITEDKINGDOM|INDIA|FRANCE|USA|HYDERABAD|ANNECY|London|UK|Remote)\b/i.test(l)
        && l.length < 60 && !/implement|develop|build|deploy|manage|setting/i.test(l)) {
      if (cur && !cur.location) cur.location = l.replace(/UNITEDKINGDOM/i,'United Kingdom').replace(/^l(?=ONDON)/,'L').trim()
      awaitCo = false; continue
    }

    if (CAPS_RE.test(lClean) && !SEC_RE.test(lClean) && !NOT_JOB.has(lClean)) {
      const tc = lClean.split(/\s+/).map((w:string)=>w[0]+w.slice(1).toLowerCase()).join(' ')
      if (awaitCo && cur && !cur.company) { cur.company=tc; awaitCo=false }
      else {
        if (cur) jobs.push(cur)
        cur = { title:tc, company:'', location:'', dates:'', current:false, bullets:[] }
        awaitCo = true
      }
      continue
    }

    if (cur) {
      awaitCo = false
      const b = l.replace(/^[●•\-\*]\s*/,'').trim()
      if (b.length > 8 && !DATE_RE.test(b)) {
        if (cur.bullets.length && /^[a-z(]/.test(b)) cur.bullets[cur.bullets.length-1] += ' ' + b
        else cur.bullets.push(b)
      }
    }
  }
  if (cur) jobs.push(cur)
  return jobs.filter(j=>j.title||j.company).map(j=>({...j,current:/present|current|now/i.test(j.dates)}))
}

// ─────────────────────────────────────────────────────────────
// STEP 5 — PARSE EDUCATION
// ─────────────────────────────────────────────────────────────
function parseEdu(text: string): EduEntry[] {
  if (!text.trim()) return []
  const items: EduEntry[] = []
  let cur: EduEntry | null = null

  for (const l of text.split('\n').map(l=>l.trim()).filter(Boolean)) {
    // Handle "● MBA (Human Resources) - Sri Indu Institute, 2017 – 75.4%"
    const bulletEdu = l.match(/^[●•\-\*]\s*(.+?)\s[-–—]\s*(.+?),?\s*(\d{4})/)
    if (bulletEdu) {
      if (cur) items.push(cur)
      const gradeM = l.match(/[\s–—]\s*(\d{1,3}(?:\.\d+)?%|[A-F][+-]?|\d\.\d+\s*CGPA)/)
      cur = {
        degree:      bulletEdu[1].trim(),
        institution: bulletEdu[2].trim(),
        location:    '',
        dates:       bulletEdu[3],
        grade:       gradeM?.[1] ?? '',
      }
      continue
    }

    if ([',','.'].includes(l)) continue
    const dm = DATE_RE.exec(l)
    if (dm) { if (cur) cur.dates = dm[0]; continue }

    if (CAPS_RE.test(l) && !SEC_RE.test(l)) {
      if (cur) items.push(cur)
      cur = { degree:l.split(/\s+/).map((w:string)=>w[0]+w.slice(1).toLowerCase()).join(' '), institution:'', location:'', dates:'', grade:'' }
    } else if (/\b(University|College|School|Institute|Academy|Business)\b/i.test(l) && l.length < 100) {
      if (cur && !cur.institution) cur.institution = l.trim()
      else { if (cur) items.push(cur); cur = { degree:'', institution:l.trim(), location:'', dates:'', grade:'' } }
    } else if (/\b(MSc|BSc|BEng|MEng|MBA|BA|MA|PhD|B\.E|HND|BTEC|Diploma|Bachelor|Master)\b/i.test(l)) {
      if (cur) items.push(cur)
      cur = { degree:l.trim(), institution:'', location:'', dates:'', grade:'' }
    } else if (/\b(UK|India|France|London|Chambery|Hyderabad|Edinburgh|Manchester|Telangana)\b/i.test(l) && l.length < 60) {
      if (cur) cur.location = l.trim()
    } else if (cur && !cur.institution && l.length > 3) {
      cur.institution = l.trim()
    }
  }
  if (cur) items.push(cur)
  return items.filter(e=>e.degree||e.institution)
}

// ─────────────────────────────────────────────────────────────
// STEP 6 — PARSE SKILLS
// Handles "Category: val1, val2" and plain bullet lists
// ─────────────────────────────────────────────────────────────
function parseSkills(text: string): { flat: string[]; byCategory: Array<{category:string;skills:string[]}> } {
  if (!text.trim()) return { flat:[], byCategory:[] }
  const flat: string[] = []
  const byCategory: Array<{category:string;skills:string[]}> = []

  for (const l of text.split('\n')) {
    const clean = l.replace(/^[●•\-\*]\s*/,'').trim()
    if (!clean || CAPS_RE.test(clean)) continue

    if (clean.includes(':')) {
      const [cat, rest] = clean.split(/:\s*(.+)/)
      if (cat && rest) {
        const skills = rest.split(/[,;\/]/).map(s=>s.replace(/[()]/g,'').trim()).filter(s=>s.length>1&&s.length<50)
        if (skills.length) {
          byCategory.push({ category: cat.trim(), skills })
          flat.push(...skills)
        }
        continue
      }
    }

    for (const s of clean.split(/[,;\/]/)) {
      const sk = s.replace(/[()]/g,'').replace(/[-–]/g,' ').replace(/\s+/g,' ').trim()
      if (sk.length > 1 && sk.length < 50 && !/^\d+$/.test(sk)) flat.push(sk)
    }
  }
  return { flat: [...new Set(flat.filter(Boolean))], byCategory }
}

// ─────────────────────────────────────────────────────────────
// MAIN: extractProfile()
// ─────────────────────────────────────────────────────────────
export function extractProfile(rawText: string, userId: string): CandidateProfile {
  const text     = normalize(rawText)
  const contact  = extractContact(text)
  const sections = splitSections(text)

  // Summary
  let summary = (sections['SUM']??'').replace(/\n+/g,' ').trim()
  if (!summary) {
    for (const l of (rawText.split(SEC_RE)[0]??'').split('\n')) {
      const t = l.trim()
      if (t.length>60 && !/@|\+44|\+91|linkedin|Page \d/i.test(t) && !/^[A-Z\s]{6,}$/.test(t))
        summary += (summary?' ':'')+t
    }
    summary = summary.replace(/\s+/g,' ').trim().slice(0,500)
  }

  const jobs      = parseJobs(sections['EXP']??'')
  const education = parseEdu(sections['EDU']??'')
  const skills    = parseSkills(sections['SKILLS']??'')
  const langs     = (sections['LANGS']??'').split('\n').map(l=>l.trim()).filter(l=>/^[A-Z][a-z]{2,15}$/.test(l)).map(l=>({name:l,level:''}))
  const certs     = (sections['CERTS']??'').split('\n').map(l=>l.replace(/^[●•\-\*]\s*/,'').trim()).filter(l=>l.length>5&&l.length<120)

  const allContent = [...jobs.flatMap(j=>j.bullets), ...skills.flat, sections['SKILLS']??'', summary].join(' ')
  const techSkills = TECH.filter(t=>kwMatch(t,allContent))
  const allSkills  = [...new Set([...skills.flat, ...techSkills])].filter(Boolean)

  const now      = new Date().getFullYear()
  const earliest = jobs.reduce((m,j)=>{ const n=j.dates.match(/(\d{4})/); return n?Math.min(m,+n[1]):m }, now)

  return {
    user_id:  userId,
    contact:  {
      full_name:    contact.name,
      email:        contact.email,
      phone:        contact.phone,
      linkedin_url: contact.linkedin ? `https://${contact.linkedin.replace(/^https?:\/\//,'').replace(/^www\./,'')}` : '',
      location:     contact.location,
    },
    work_history:         jobs,
    education,
    all_skills:           allSkills,
    tech_skills:          techSkills,
    skills_by_category:   skills.byCategory,
    certifications:       certs,
    languages:            langs,
    soft_skills:          [],
    professional_summary: summary,
    current_title:        jobs[0]?.title   ?? contact.title ?? '',
    current_company:      jobs[0]?.company ?? '',
    highest_degree:       education[0]?.degree ?? '',
    total_years_exp:      Math.max(now - earliest, 0),
    target_roles:         [...new Set([contact.title, jobs[0]?.title].filter(Boolean))] as string[],
    target_location:      contact.location ?? '',
  }
}

// ─────────────────────────────────────────────────────────────
// ATS SCORER — 100 points, 11 criteria
// ─────────────────────────────────────────────────────────────
export function scoreCV(profile: CandidateProfile, rawText: string): ATSResult {
  let score = 0
  const passed: string[] = [], issues: string[] = []
  const c = profile.contact

  if (c.email)              { score+=10; passed.push(`Email: ${c.email}`) }          else issues.push('Add your email address')
  if (c.phone)              { score+=10; passed.push(`Phone: ${c.phone}`) }          else issues.push('Add a phone number')
  if (c.linkedin_url)       { score+=5;  passed.push('LinkedIn URL found') }          else issues.push('Add your LinkedIn profile URL')
  if (profile.work_history.length>0)  { score+=5; passed.push(`${profile.work_history.length} jobs found`) } else issues.push('No Work Experience found')
  if (profile.education.length>0)     { score+=5; passed.push(`Education found`) }    else issues.push('Add Education section')
  if (profile.all_skills.length>=3)   { score+=5; passed.push(`${profile.all_skills.length} skills found`) } else issues.push('Add Skills section (3+ skills)')
  if (profile.professional_summary.length>50) { score+=5; passed.push('Professional Summary present') } else issues.push('Add a 3–4 line Professional Summary')

  const bullets = profile.work_history.flatMap(j=>j.bullets).join(' ')
  if (/\d+\s*%|\d+x\b|[£$€]\d+|\b\d+\s*(million|k\b|hours?|days?|team|services?)/i.test(bullets))
    { score+=15; passed.push('Quantified achievements found') }
  else issues.push('Add metrics — e.g. "reduced deployment time by 60%"')

  const VERBS = ['led','built','developed','delivered','improved','reduced','managed','designed','implemented','deployed','automated','launched','architected','configured','created','migrated','integrated','streamlined','provisioned','established']
  const fv = VERBS.filter(v=>new RegExp(`\\b${v}\\b`,'i').test(bullets||rawText))
  if (fv.length>=5)      { score+=10; passed.push(`Action verbs: ${fv.slice(0,5).join(', ')}`) }
  else if (fv.length>=2) { score+=5;  issues.push(`${fv.length} action verbs — aim for 5+`) }
  else                     issues.push('Start bullets with action verbs: Implemented, Deployed, Built…')

  if (profile.tech_skills.length>=6)      { score+=15; passed.push(`${profile.tech_skills.length} tech skills found`) }
  else if (profile.tech_skills.length>=3) { score+=8;  issues.push(`${profile.tech_skills.length} tech skills — list more tools`) }
  else                                      issues.push('Add a Technical Skills section')

  const wc = rawText.split(/\s+/).filter(w=>w.length>2).length
  if (wc>=300&&wc<=1000)   { score+=15; passed.push(`Good length: ~${wc} words`) }
  else if (wc>=150)        { score+=7;  issues.push(`${wc} words — aim for 300–700`) }
  else                       issues.push(`Too short (${wc} words)`)

  return {
    score: Math.min(score,100),
    grade: score>=90?'A+':score>=80?'A':score>=70?'B':score>=55?'C':'D',
    passed, issues,
  }
}

// ─────────────────────────────────────────────────────────────
// MASTER CV BUILDER — fixed UK ATS template
// ─────────────────────────────────────────────────────────────
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.55;color:#111;background:#fff;max-width:794px;margin:0 auto;padding:38px 46px}
.name{font-size:22pt;font-weight:700;color:#0d2137;letter-spacing:-.3px;margin-bottom:3px}
.role{font-size:12pt;color:#1a5296;margin-bottom:6px}
.contact{font-size:10pt;color:#444}.contact a{color:#1a5296;text-decoration:none}
.sep{color:#bbb;padding:0 4px}
hr{border:none;border-top:2px solid #0d2137;margin:10px 0 16px}
.sec{margin-bottom:20px}
.sh{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d2137;border-bottom:1.5px solid #0d2137;padding-bottom:3px;margin-bottom:10px}
.summary{font-size:11pt;line-height:1.65}
.cat{font-size:9pt;font-weight:700;text-transform:uppercase;color:#64748b;margin:8px 0 4px}
.pills{display:flex;flex-wrap:wrap;gap:5px}
.pill{background:#eaf2fd;border:1px solid #b8d4f0;color:#0d2137;padding:3px 11px;border-radius:3px;font-size:9.5pt;font-weight:600}
.pill.hi{background:#dcfce7;border-color:#86efac;color:#14532d}
.entry{margin-bottom:16px}
.jrow{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;margin-bottom:3px}
.jtitle{font-size:11pt;font-weight:700;color:#0d1a2a}
.jco{font-size:10.5pt;color:#1a5296;font-weight:600}
.jdates{font-size:10pt;color:#555;white-space:nowrap;flex-shrink:0}
ul{margin:4px 0 0 18px}li{font-size:11pt;color:#111;margin-bottom:4px;line-height:1.5}
.footer{margin-top:28px;padding:8px 14px;border-top:1px solid #e2e8f0;font-size:8pt;color:#94a3b8;text-align:center}
@media print{body{padding:20px 28px}.footer{display:none}.pill{border-color:#aaa}}`

export function buildMasterCV(profile: CandidateProfile, ats: ATSResult): string {
  const c  = profile.contact
  const cl = [
    c.email        ? `<a href="mailto:${h(c.email)}">${h(c.email)}</a>` : '',
    c.phone        ? h(c.phone) : '',
    c.location     ? h(c.location) : '',
    c.linkedin_url ? `<a href="${h(c.linkedin_url)}">${h(c.linkedin_url.replace('https://',''))}</a>` : '',
  ].filter(Boolean).join('<span class="sep">•</span>')

  // Skills — grouped by category if available, else flat pills
  let skillsHtml = ''
  if (profile.skills_by_category.length > 0) {
    skillsHtml = profile.skills_by_category.map(cat =>
      `<div class="cat">${h(cat.category)}</div><div class="pills">${cat.skills.map(s=>`<span class="pill">${h(s)}</span>`).join('')}</div>`
    ).join('')
  } else {
    skillsHtml = `<div class="pills">${profile.all_skills.map(s=>`<span class="pill">${h(s)}</span>`).join('')}</div>`
  }

  const expHtml = profile.work_history.map(j=>`
  <div class="entry">
    <div class="jrow">
      <div><span class="jtitle">${h(j.title)}</span><span class="jco"> &ndash; ${h(j.company)}${j.location?`, ${h(j.location)}`:''}</span></div>
      <span class="jdates">${h(j.dates)}</span>
    </div>
    ${j.bullets.length?`<ul>${j.bullets.map(b=>`<li>${h(b)}</li>`).join('')}</ul>`:''}
  </div>`).join('')

  const eduHtml = profile.education.map(e=>`
  <div class="entry">
    <div class="jrow">
      <div><span class="jtitle">${h(e.degree||e.institution)}</span>${e.institution&&e.degree?`<span class="jco"> &ndash; ${h(e.institution)}${e.location?`, ${h(e.location)}`:''}</span>`:''}</div>
      <span class="jdates">${h(e.dates)}${e.grade?` · ${h(e.grade)}`:''}</span>
    </div>
  </div>`).join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${h(c.full_name)} — UK ATS Master CV</title><style>${CSS}</style></head><body>
<div class="name">${h(c.full_name)}</div>
${profile.current_title?`<div class="role">${h(profile.current_title)}</div>`:''}
<div class="contact">${cl}</div><hr/>
${profile.professional_summary?`<div class="sec"><div class="sh">Professional Summary</div><p class="summary">${h(profile.professional_summary)}</p></div>`:''}
${profile.all_skills.length?`<div class="sec"><div class="sh">Core Skills &amp; Technologies</div>${skillsHtml}</div>`:''}
${profile.work_history.length?`<div class="sec"><div class="sh">Professional Experience</div>${expHtml}</div>`:''}
${profile.education.length?`<div class="sec"><div class="sh">Education</div>${eduHtml}</div>`:''}
${profile.certifications.length?`<div class="sec"><div class="sh">Certifications</div><ul>${profile.certifications.map(c=>`<li>${h(c)}</li>`).join('')}</ul></div>`:''}
${profile.languages.length?`<div class="sec"><div class="sh">Languages</div><div class="pills">${profile.languages.map(l=>`<span class="pill">${h(l.name)}</span>`).join('')}</div></div>`:''}
<div class="footer">SponsorPath UK ATS Master CV · Score ${ats.score}/100 (${ats.grade}) · ${ats.passed.length} criteria passed</div>
</body></html>`
}

// ─────────────────────────────────────────────────────────────
// TAILOR CV — same template, highlights JD keyword matches
// ─────────────────────────────────────────────────────────────
export function tailorCV(profile: CandidateProfile, jdText: string, jobTitle: string, company: string) {
  const jdKw      = TECH.filter(t=>kwMatch(t,jdText))
  const matched   = profile.all_skills.filter(s=>jdKw.some(k=>k.toLowerCase()===s.toLowerCase())||kwMatch(s,jdText))
  const unmatched = profile.all_skills.filter(s=>!matched.includes(s))
  const matchScore= profile.all_skills.length>0?Math.min(Math.round(matched.length/Math.max(jdKw.length,1)*100),100):50

  const c  = profile.contact
  const cl = [
    c.email        ? `<a href="mailto:${h(c.email)}">${h(c.email)}</a>` : '',
    c.phone        ? h(c.phone) : '',
    c.location     ? h(c.location) : '',
    c.linkedin_url ? `<a href="${h(c.linkedin_url)}">${h(c.linkedin_url.replace('https://',''))}</a>` : '',
  ].filter(Boolean).join('<span class="sep">•</span>')

  const skillsHtml = [
    ...matched.map(s=>`<span class="pill hi">${h(s)}</span>`),
    ...unmatched.map(s=>`<span class="pill">${h(s)}</span>`),
  ].join('')

  const expHtml = profile.work_history.map(j=>{
    const sorted = [...j.bullets].sort((a,b)=>
      jdKw.filter(k=>b.toLowerCase().includes(k.toLowerCase())).length -
      jdKw.filter(k=>a.toLowerCase().includes(k.toLowerCase())).length
    )
    return `<div class="entry">
    <div class="jrow"><div><span class="jtitle">${h(j.title)}</span><span class="jco"> &ndash; ${h(j.company)}${j.location?`, ${h(j.location)}`:''}</span></div><span class="jdates">${h(j.dates)}</span></div>
    ${sorted.length?`<ul>${sorted.map(b=>`<li>${h(b)}</li>`).join('')}</ul>`:''}
    </div>`
  }).join('')

  const eduHtml = profile.education.map(e=>`
  <div class="entry"><div class="jrow"><div><span class="jtitle">${h(e.degree||e.institution)}</span>${e.institution&&e.degree?`<span class="jco"> &ndash; ${h(e.institution)}</span>`:''}</div><span class="jdates">${h(e.dates)}${e.grade?` · ${h(e.grade)}`:''}</span></div></div>`).join('')

  const TAILOR_CSS = CSS + `\n.tbar{background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:9px 14px;font-size:9.5pt;color:#166534;margin:8px 0 14px}\n@media print{.tbar{display:none}}`

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${h(c.full_name)} — Tailored for ${h(jobTitle)}</title><style>${TAILOR_CSS}</style></head><body>
<div class="name">${h(c.full_name)}</div>
<div class="role">${h(jobTitle||profile.current_title)}</div>
<div class="contact">${cl}</div><hr/>
<div class="tbar">Tailored for <strong>${h(jobTitle)}</strong> at <strong>${h(company)}</strong> · <strong>${matched.length}/${jdKw.length}</strong> JD skills matched · <strong>${matchScore}%</strong> match · <em style="color:#15803d">■</em> Green = required by JD</div>
${profile.professional_summary?`<div class="sec"><div class="sh">Professional Summary</div><p class="summary">${h(profile.professional_summary)}</p></div>`:''}
${profile.all_skills.length?`<div class="sec"><div class="sh">Core Skills &amp; Technologies</div><div class="pills">${skillsHtml}</div></div>`:''}
${profile.work_history.length?`<div class="sec"><div class="sh">Professional Experience</div>${expHtml}</div>`:''}
${profile.education.length?`<div class="sec"><div class="sh">Education</div>${eduHtml}</div>`:''}
<div class="footer">SponsorPath · Tailored for ${h(jobTitle)} at ${h(company)} · ${matchScore}% keyword match</div>
</body></html>`

  return { html, matchedSkills: matched, jdKeywords: jdKw, matchScore }
}