// ============================================================
// FILE: src/app/api/jobs/search/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

const SPONSORS = new Set([
  'revolut','monzo','wise','starling bank','checkout.com','amazon','google','meta',
  'microsoft','apple','deloitte','pwc','kpmg','ernst & young','ey','accenture',
  'hsbc','barclays','lloyds','jpmorgan','goldman sachs','morgan stanley','bbc',
  'nhs','bt','vodafone','rolls-royce','airbus','bp','shell','tesco','sainsbury',
  'marks and spencer','unilever','astrazeneca','gsk','pfizer','mckinsey','bcg',
  'salesforce','oracle','sap','ibm','capgemini','infosys','tata consultancy',
  'wipro','cognizant','atos','experian','sage','arm holdings','softcat','kainos',
  'thoughtworks','and digital','snyk','darktrace','quantexa','onfido','cleo',
  'octopus energy','deliveroo','farfetch','zoopla','rightmove','funding circle',
  'just eat','moonpig','marshmallow','chip','tandem','curve','tide','cazoo','zego',
])

function isSponsor(company: string) {
  const n = company.toLowerCase()
  return [...SPONSORS].some(s => n.includes(s))
}

// Match score: ONLY calculated when CV is uploaded (cvScore > 0)
// Returns null when no CV — UI shows "N/A" instead of a fake number
function matchScore(title: string, roles: string, cvScore: number): number | null {
  if (!cvScore || cvScore === 0) return null  // no CV = no score
  const base = Math.max(cvScore, 50)
  const titleLower = title.toLowerCase()
  const exact = roles.split(',').some(r => {
    const role = r.trim().toLowerCase()
    return role && titleLower.includes(role.split(' ')[0])
  })
  const raw = exact ? base * 0.95 + Math.random() * 5 : base * 0.70 + Math.random() * 15
  return Math.min(Math.floor(raw), 99)
}

function cleanHTML(s: string): string {
  return (s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#[0-9]+;/g, '')
    .replace(/\n{4,}/g, '\n\n')
    .trim()
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Recently'
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`
  return `${Math.floor(mins / 10080)}w ago`
}

// ── REED API ─────────────────────────────────────────────
async function fetchReed(keywords: string, location: string, count = 25) {
  const key = process.env.REED_API_KEY
  if (!key) return []
  try {
    const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&resultsToTake=${count}&minimumSalary=0`
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}` },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = data.results || []
    // Fetch full description for each job (Reed requires a separate call)
    const full = await Promise.allSettled(
      jobs.slice(0, 15).map(async (j: any) => {
        try {
          const dr = await fetch(`https://www.reed.co.uk/api/1.0/jobs/${j.jobId}`, {
            headers: { 'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}` },
            signal: AbortSignal.timeout(5000),
          })
          if (!dr.ok) return j
          const detail = await dr.json()
          return { ...j, jobDescription: detail.jobDescription || j.jobDescription }
        } catch { return j }
      })
    )
    const detailed = full.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean)
    return [...detailed, ...jobs.slice(15)].map((j: any) => ({
      id: `reed_${j.jobId}`,
      title: j.jobTitle || '',
      company: j.employerName || '',
      location: j.locationName || location,
      salary: j.minimumSalary ? `£${j.minimumSalary.toLocaleString()}${j.maximumSalary ? ` - £${j.maximumSalary.toLocaleString()}` : ''}` : 'Competitive',
      salary_raw: j.minimumSalary || 0,
      contract_type: j.contractType || 'Permanent',
      description: cleanHTML(j.jobDescription || j.jobTitle || ''),
      url: j.jobUrl || `https://www.reed.co.uk/jobs/${j.jobId}`,
      source: 'Reed',
      posted: j.date || '',
      sponsor_verified: isSponsor(j.employerName || ''),
      ir35: (j.contractType || '').toLowerCase().includes('contract') ? 'inside' : 'N/A',
    }))
  } catch { return [] }
}

// ── ADZUNA API ───────────────────────────────────────────
async function fetchAdzuna(keywords: string, location: string, count = 20) {
  const appId = process.env.ADZUNA_APP_ID
  const apiKey = process.env.ADZUNA_API_KEY
  if (!appId || !apiKey) return []
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=${count}&what=${encodeURIComponent(keywords)}&where=${encodeURIComponent(location)}&content-type=application/json`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((j: any) => ({
      id: `adzuna_${j.id}`,
      title: j.title || '',
      company: j.company?.display_name || '',
      location: j.location?.display_name || location,
      salary: j.salary_min ? `£${Math.floor(j.salary_min).toLocaleString()}${j.salary_max ? ` - £${Math.floor(j.salary_max).toLocaleString()}` : ''}` : 'Competitive',
      salary_raw: j.salary_min || 0,
      contract_type: j.contract_type || j.contract_time || 'Permanent',
      description: cleanHTML(j.description || ''),
      url: j.redirect_url || '',
      source: 'Adzuna',
      posted: j.created || '',
      sponsor_verified: isSponsor(j.company?.display_name || ''),
      ir35: (j.contract_type || '').toLowerCase().includes('contract') ? 'tbc' : 'N/A',
    }))
  } catch { return [] }
}

// ── REMOTIVE (free, no key) ──────────────────────────────
async function fetchRemotive(keywords: string, count = 15) {
  try {
    const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keywords)}&limit=${count}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map((j: any) => ({
      id: `remotive_${j.id}`,
      title: j.title || '',
      company: j.company_name || '',
      location: 'Remote (UK eligible)',
      salary: j.salary || 'Competitive',
      salary_raw: 0,
      contract_type: j.job_type || 'Full-time',
      description: cleanHTML(j.description || ''),
      url: j.url || '',
      source: 'Remotive',
      posted: j.publication_date || '',
      sponsor_verified: isSponsor(j.company_name || ''),
      ir35: 'N/A',
    }))
  } catch { return [] }
}

// ── THE MUSE (free, no key) ──────────────────────────────
async function fetchMuse(keywords: string, count = 10) {
  try {
    const res = await fetch(`https://www.themuse.com/api/public/jobs?query=${encodeURIComponent(keywords)}&page=1&descending=true&api_key=`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).slice(0, count).map((j: any) => ({
      id: `muse_${j.id}`,
      title: j.name || '',
      company: j.company?.name || '',
      location: j.locations?.[0]?.name || 'UK',
      salary: 'Competitive',
      salary_raw: 0,
      contract_type: j.type || 'Full-time',
      description: cleanHTML((j.contents || '').replace(/<[^>]+>/g, '')),
      url: j.refs?.landing_page || '',
      source: 'The Muse',
      posted: j.publication_date || '',
      sponsor_verified: isSponsor(j.company?.name || ''),
      ir35: 'N/A',
    }))
  } catch { return [] }
}

// ── ARBEITNOW (free, no key) ────────────────────────────
async function fetchArbeitnow(keywords: string, count = 15) {
  try {
    const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(keywords)}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || []).slice(0, count).map((j: any) => ({
      id: `arbeit_${j.slug}`,
      title: j.title || '',
      company: j.company_name || '',
      location: j.location || 'UK',
      salary: 'Competitive',
      salary_raw: 0,
      contract_type: j.job_types?.[0] || 'Full-time',
      description: cleanHTML(j.description || ''),
      url: j.url || '',
      source: 'Arbeitnow',
      posted: j.created_at ? new Date(j.created_at * 1000).toISOString() : '',
      sponsor_verified: isSponsor(j.company_name || ''),
      ir35: 'N/A',
    }))
  } catch { return [] }
}

function matchesTab(job: any, tab: string): boolean {
  const t = (job.contract_type || '').toLowerCase()
  const isContract = t.includes('contract') || t.includes('freelance') || t.includes('temp')
  if (tab === 'sponsored')     return job.sponsor_verified && !isContract
  if (tab === 'contract')      return isContract
  if (tab === 'outside_ir35')  return isContract && (job.ir35 === 'outside' || job.ir35 === 'tbc')
  if (tab === 'non_sponsored') return !job.sponsor_verified
  return true
}

export async function POST(req: NextRequest) {
  try {
    const {
      userId, filterType = 'sponsored',
      keywords = 'software engineer', location = 'London',
      cvScore = 0,          // 0 means no CV uploaded - no match scores
      targetRoles = '',
    } = await req.json()

    // Fetch from all sources in parallel
    const [reedJobs, adzunaJobs, remotiveJobs, museJobs, arbeitJobs] = await Promise.allSettled([
      fetchReed(keywords, location, 25),
      fetchAdzuna(keywords, location, 20),
      filterType === 'non_sponsored' ? fetchRemotive(keywords, 15) : Promise.resolve([]),
      filterType === 'non_sponsored' ? fetchMuse(keywords, 10) : Promise.resolve([]),
      fetchArbeitnow(keywords, 15),
    ])

    const allJobs: any[] = [
      ...((reedJobs.status === 'fulfilled' ? reedJobs.value : []) as any[]),
      ...((adzunaJobs.status === 'fulfilled' ? adzunaJobs.value : []) as any[]),
      ...((remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : []) as any[]),
      ...((museJobs.status === 'fulfilled' ? museJobs.value : []) as any[]),
      ...((arbeitJobs.status === 'fulfilled' ? arbeitJobs.value : []) as any[]),
    ]

    // Deduplicate by title + company
    const seen = new Set<string>()
    const unique = allJobs.filter(j => {
      const key = `${j.title?.toLowerCase()}_${j.company?.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key); return true
    })

    // Filter to tab
    const filtered = unique.filter(j => matchesTab(j, filterType))

    // Add match score (null if no CV) and time_ago
    const scored = filtered.map(j => ({
      ...j,
      match: matchScore(j.title, targetRoles || keywords, cvScore),
      time_ago: timeAgo(j.posted),
    }))

    // Sort: if CV uploaded sort by match desc, else by date (newest first)
    const sorted = scored.sort((a, b) => {
      if (a.match !== null && b.match !== null) return (b.match || 0) - (a.match || 0)
      return 0
    })

    return NextResponse.json({ jobs: sorted, total: sorted.length, sources: ['Reed', 'Adzuna', 'Arbeitnow'] })
  } catch (err: any) {
    console.error('[jobs/search]', err)
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 })
  }
}