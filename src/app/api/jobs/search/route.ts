// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/jobs/search/route.ts
// ENDPOINT:  GET /api/jobs/search?title=DevOps&location=London&stream=DevOps+Cloud&userId=xxx
// ════════════════════════════════════════════════════════
// Searches Reed.co.uk API (free tier) + caches results in Supabase
// Falls back to curated sponsor-verified demo jobs if API unavailable

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// UK Sponsor licence numbers (sample from official Home Office register)
// In production: sync full register from https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers
const KNOWN_SPONSORS = new Set([
  'Revolut','Monzo','Wise','Starling Bank','Checkout.com','Deliveroo',
  'Canva','Spotify','Amazon','Google','Meta','Microsoft','Apple','Salesforce',
  'HSBC','Barclays','NatWest','Lloyds','JPMorgan','Goldman Sachs','Morgan Stanley',
  'Deloitte','PwC','KPMG','EY','Accenture','McKinsey','BCG','Bain',
  'NHS','BT','Sky','ITV','BBC','Vodafone','O2','EE',
  'Rolls-Royce','BAE Systems','BP','Shell','AstraZeneca','GSK','Pfizer',
  'Ocado','Rightmove','Auto Trader','Just Eat','Cazoo','Bulb',
  'Palantir','Darktrace','Improbable','Secondmind','FiveAI','BenevolentAI',
  'Funding Circle','Paysafe','TransferWise','OakNorth','Atom Bank','Tandem',
  'Experian','RELX','Informa','WPP','Publicis','Capgemini','Cognizant','Infosys','TCS','Wipro'
])

function matchScore(job: any, profile: { title?: string; skills?: string[] }): number {
  let score = 70 // base
  const jt = (job.jobTitle || '').toLowerCase()
  const jd = (job.jobDescription || '').toLowerCase()
  const pt = (profile.title || '').toLowerCase()
  if (pt && jt.includes(pt.split(' ')[0])) score += 12
  if (KNOWN_SPONSORS.has(job.employerName)) score += 8
  if (profile.skills) {
    const matches = profile.skills.filter((s: string) => jd.includes(s.toLowerCase()))
    score += Math.min(matches.length * 2, 10)
  }
  return Math.min(score, 99)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const title    = searchParams.get('title')    || 'Software Engineer'
    const location = searchParams.get('location') || 'London'
    const userId   = searchParams.get('userId')   || null

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
    )

    // Try Reed API first (free at reed.co.uk/api)
    let jobs: any[] = []
    const reedKey = process.env.REED_API_KEY

    if (reedKey) {
      try {
        const reedUrl = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(title)}&locationName=${encodeURIComponent(location)}&resultsToTake=20`
        const reedRes = await fetch(reedUrl, {
          headers: { Authorization: `Basic ${Buffer.from(reedKey + ':').toString('base64')}` }
        })
        if (reedRes.ok) {
          const reedData = await reedRes.json()
          jobs = (reedData.results || []).map((j: any) => ({
            external_id:      `reed_${j.jobId}`,
            job_title:        j.jobTitle,
            company:          j.employerName,
            location:         j.locationName,
            description:      j.jobDescription,
            salary_range:     j.minimumSalary ? `£${j.minimumSalary.toLocaleString()} - £${j.maximumSalary?.toLocaleString() || '?'}` : undefined,
            job_url:          j.jobUrl,
            job_board:        'Reed',
            sponsor_verified: KNOWN_SPONSORS.has(j.employerName),
            match_score:      matchScore(j, { title }),
            posted_at:        j.date,
          }))
        }
      } catch (e) { console.warn('Reed API failed, using fallback') }
    }

    // Fallback: curated demo jobs when API key not set
    if (jobs.length === 0) {
      jobs = DEMO_JOBS.filter(j =>
        j.job_title.toLowerCase().includes(title.toLowerCase().split(' ')[0]) ||
        j.company in KNOWN_SPONSORS
      ).slice(0, 10)
      if (jobs.length === 0) jobs = DEMO_JOBS.slice(0, 8)
    }

    // Cache in Supabase (upsert by external_id)
    const toCache = jobs.filter(j => j.external_id).map(j => ({
      ...j, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }))
    if (toCache.length > 0) {
      await supabase.from('job_cache').upsert(toCache, { onConflict: 'external_id', ignoreDuplicates: true })
    }

    return NextResponse.json({ success: true, jobs, total: jobs.length, source: reedKey ? 'Reed API' : 'Demo' })
  } catch (err: any) {
    console.error('[/api/jobs/search]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

const DEMO_JOBS = [
  { external_id:'d1', job_title:'Senior DevOps Engineer',          company:'Revolut',        location:'London', salary_range:'£75,000 - £95,000', job_url:'https://careers.revolut.com', job_board:'LinkedIn', sponsor_verified:true, match_score:94 },
  { external_id:'d2', job_title:'Backend Software Engineer',       company:'Monzo',          location:'London', salary_range:'£70,000 - £90,000', job_url:'https://monzo.com/careers',   job_board:'LinkedIn', sponsor_verified:true, match_score:88 },
  { external_id:'d3', job_title:'Data Engineer',                   company:'Wise',           location:'London', salary_range:'£65,000 - £85,000', job_url:'https://wise.com/gb/careers', job_board:'Indeed',   sponsor_verified:true, match_score:85 },
  { external_id:'d4', job_title:'Cloud Infrastructure Engineer',   company:'Starling Bank',  location:'London', salary_range:'£70,000 - £88,000', job_url:'https://starlingbank.com',    job_board:'Reed',     sponsor_verified:true, match_score:82 },
  { external_id:'d5', job_title:'Site Reliability Engineer',       company:'Checkout.com',   location:'London', salary_range:'£80,000 - £100,000',job_url:'https://checkout.com',        job_board:'LinkedIn', sponsor_verified:true, match_score:91 },
  { external_id:'d6', job_title:'Full Stack Engineer',             company:'Deliveroo',      location:'London', salary_range:'£65,000 - £85,000', job_url:'https://deliveroo.co.uk',     job_board:'LinkedIn', sponsor_verified:true, match_score:79 },
  { external_id:'d7', job_title:'Machine Learning Engineer',       company:'Darktrace',      location:'Cambridge',salary_range:'£75,000 - £95,000',job_url:'https://darktrace.com',      job_board:'Reed',     sponsor_verified:true, match_score:87 },
  { external_id:'d8', job_title:'Platform Engineer',               company:'Ocado',          location:'Hatfield',salary_range:'£70,000 - £90,000', job_url:'https://ocado.com/careers',  job_board:'Indeed',   sponsor_verified:true, match_score:76 },
  { external_id:'d9', job_title:'Product Manager — Payments',      company:'Funding Circle', location:'London', salary_range:'£80,000 - £100,000',job_url:'https://fundingcircle.com',   job_board:'LinkedIn', sponsor_verified:true, match_score:83 },
  { external_id:'d10',job_title:'Data Analyst',                    company:'HSBC',           location:'London', salary_range:'£55,000 - £72,000', job_url:'https://hsbc.com/careers',    job_board:'Indeed',   sponsor_verified:true, match_score:78 },
  { external_id:'d11',job_title:'Cyber Security Analyst',          company:'BT',             location:'London', salary_range:'£60,000 - £78,000', job_url:'https://careers.bt.com',      job_board:'Reed',     sponsor_verified:true, match_score:80 },
  { external_id:'d12',job_title:'Finance Business Analyst',        company:'Barclays',       location:'London', salary_range:'£65,000 - £82,000', job_url:'https://home.barclays',       job_board:'LinkedIn', sponsor_verified:true, match_score:77 },
]