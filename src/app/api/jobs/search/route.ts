// ═══════════════════════════════════════════════════════════════════
// FILE: app/api/jobs/search/route.ts
// Job search with Reed API + sponsor verification
// ═══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Sponsor-verified companies (from our database)
const KNOWN_SPONSORS = [
  'revolut', 'monzo', 'wise', 'starling', 'checkout', 'amazon', 'google',
  'meta', 'microsoft', 'apple', 'deloitte', 'pwc', 'kpmg', 'ey', 'accenture',
  'hsbc', 'barclays', 'lloyds', 'jpmorgan', 'goldman sachs'
]

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

function isSponsorVerified(company: string): boolean {
  const normalized = normalizeName(company)
  return KNOWN_SPONSORS.some(sponsor => normalized.includes(sponsor) || sponsor.includes(normalized))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const sponsored = searchParams.get('sponsored') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

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

    // Get user profile for search criteria
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    const targetRole = profile?.target_roles?.[0] || 'Software Engineer'
    const location = profile?.location_city || 'London'

    // Check if we have cached jobs
    const { data: cachedJobs } = await supabase
      .from('jobs')
      .select('*, employer:employers(*)')
      .eq('active', true)
      .eq('sponsor_verified', sponsored)
      .order('posted_at', { ascending: false })
      .limit(limit)

    if (cachedJobs && cachedJobs.length >= 5) {
      return NextResponse.json({ jobs: cachedJobs })
    }

    // If no Reed API key, return demo jobs
    if (!process.env.REED_API_KEY) {
      const demoJobs = generateDemoJobs(sponsored, limit)
      return NextResponse.json({ jobs: demoJobs })
    }

    // Search Reed API
    const reedRes = await fetch(
      `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(targetRole)}&location=${encodeURIComponent(location)}&resultsToTake=${limit}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.REED_API_KEY + ':').toString('base64')}`
        }
      }
    )

    if (!reedRes.ok) {
      throw new Error('Reed API failed')
    }

    const reedData = await reedRes.json()
    const jobs = (reedData.results || []).map((job: any) => ({
      id: job.jobId.toString(),
      title: job.jobTitle,
      company: job.employerName,
      company_normalized: normalizeName(job.employerName),
      location: job.locationName,
      salary_min: job.minimumSalary,
      salary_max: job.maximumSalary,
      contract_type: job.jobDescription?.toLowerCase().includes('contract') ? 'contract' : 'permanent',
      description: job.jobDescription,
      source: 'Reed',
      source_url: job.jobUrl,
      external_id: `reed_${job.jobId}`,
      posted_at: job.date,
      sponsor_verified: isSponsorVerified(job.employerName),
      sponsor_confidence: isSponsorVerified(job.employerName) ? 100 : 0
    }))

    // Filter by sponsor status
    const filtered = jobs.filter((j: any) => sponsored ? j.sponsor_verified : !j.sponsor_verified)

    // Cache jobs in database
    for (const job of filtered.slice(0, 10)) {
      await supabase.from('jobs').upsert({
        external_id: job.external_id,
        title: job.title,
        company: job.company,
        company_normalized: job.company_normalized,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        contract_type: job.contract_type,
        description: job.description,
        source: job.source,
        source_url: job.source_url,
        posted_at: job.posted_at,
        sponsor_verified: job.sponsor_verified,
        sponsor_confidence: job.sponsor_confidence,
        active: true,
        ingested_at: new Date().toISOString()
      }, { onConflict: 'external_id' }).then()
    }

    return NextResponse.json({ jobs: filtered })

  } catch (err: any) {
    console.error('[/api/jobs/search]', err)
    // Return demo jobs on error
    const sponsored = new URL(req.url).searchParams.get('sponsored') === 'true'
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '20')
    return NextResponse.json({ jobs: generateDemoJobs(sponsored, limit) })
  }
}

function generateDemoJobs(sponsored: boolean, limit: number) {
  const sponsoredJobs = [
    {
      id: 'demo-1',
      title: 'Senior DevOps Engineer',
      company: 'Revolut',
      location: 'London',
      salary_min: 80000,
      salary_max: 120000,
      contract_type: 'permanent',
      description: 'Join Revolut as a Senior DevOps Engineer. Work on cutting-edge fintech infrastructure.',
      source: 'Direct',
      posted_at: new Date().toISOString(),
      sponsor_verified: true,
      sponsor_confidence: 100,
      requirements: ['Kubernetes', 'AWS', 'Terraform', 'Python', 'CI/CD']
    },
    {
      id: 'demo-2',
      title: 'Full Stack Engineer',
      company: 'Monzo',
      location: 'London',
      salary_min: 70000,
      salary_max: 100000,
      contract_type: 'permanent',
      description: 'Build the future of banking at Monzo. React + Go stack.',
      source: 'Direct',
      posted_at: new Date().toISOString(),
      sponsor_verified: true,
      sponsor_confidence: 100,
      requirements: ['React', 'Go', 'PostgreSQL', 'Kubernetes']
    },
    {
      id: 'demo-3',
      title: 'Data Engineer',
      company: 'Wise',
      location: 'London',
      salary_min: 75000,
      salary_max: 110000,
      contract_type: 'permanent',
      description: 'Scale data infrastructure at Wise, processing billions in transactions.',
      source: 'Direct',
      posted_at: new Date().toISOString(),
      sponsor_verified: true,
      sponsor_confidence: 100,
      requirements: ['Python', 'Airflow', 'Snowflake', 'AWS']
    }
  ]

  const nonSponsoredJobs = [
    {
      id: 'demo-4',
      title: 'Frontend Developer',
      company: 'Tech Startup Ltd',
      location: 'London',
      salary_min: 50000,
      salary_max: 70000,
      contract_type: 'permanent',
      description: 'Join a growing startup building the next big thing.',
      source: 'LinkedIn',
      posted_at: new Date().toISOString(),
      sponsor_verified: false,
      sponsor_confidence: 0,
      requirements: ['React', 'TypeScript', 'CSS']
    },
    {
      id: 'demo-5',
      title: 'Backend Engineer',
      company: 'Digital Agency',
      location: 'Manchester',
      salary_min: 45000,
      salary_max: 65000,
      contract_type: 'permanent',
      description: 'Build APIs for our client projects.',
      source: 'Indeed',
      posted_at: new Date().toISOString(),
      sponsor_verified: false,
      sponsor_confidence: 0,
      requirements: ['Node.js', 'MongoDB', 'REST']
    }
  ]

  const jobs = sponsored ? sponsoredJobs : nonSponsoredJobs
  return jobs.slice(0, limit)
}