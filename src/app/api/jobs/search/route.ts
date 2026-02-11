// ════════════════════════════════════════════════════════
// FILE PATH: src/app/api/jobs/search/route.ts
// ENDPOINT:  GET /api/jobs/search
// ════════════════════════════════════════════════════════
// Production job engine:
// - Searches Reed.co.uk API (free tier — register at reed.co.uk/developers)
// - Classifies every job: sponsored / outside IR35 / inside IR35
// - Returns full job description + requirements
// - Caches in Supabase job_cache with 6hr TTL
// - Falls back to realistic structured demo data if API key not set

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ── OFFICIAL UK SPONSOR LICENCE REGISTER ─────────────────
// Source: https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers
// In production: build a Supabase-synced table and refresh weekly from the Home Office CSV
const SPONSOR_REGISTER = new Set([
  // Fintech
  'Revolut','Monzo','Wise','Starling Bank','Checkout.com','Paysafe','OakNorth','Atom Bank',
  'Funding Circle','Tandem','Curve','GoCardless','SumUp','Zilch','ClearScore',
  // Big Tech
  'Amazon','Google','Meta','Microsoft','Apple','Salesforce','Oracle','SAP','IBM','Cisco',
  'Palantir','Snowflake','MongoDB','Stripe','Twilio','Cloudflare','Datadog',
  // UK Tech Scale-ups
  'Deliveroo','Ocado','Rightmove','Auto Trader','Just Eat','Cazoo','Bumble',
  'Darktrace','Improbable','FiveAI','BenevolentAI','Graphcore','CMR Surgical',
  // Consulting / Professional Services
  'Deloitte','PwC','KPMG','EY','Accenture','McKinsey','BCG','Bain','Capgemini',
  'Cognizant','Infosys','TCS','Wipro','HCL','Tech Mahindra',
  // Banking / Finance
  'HSBC','Barclays','NatWest','Lloyds','JPMorgan','Goldman Sachs','Morgan Stanley',
  'Deutsche Bank','UBS','Credit Suisse','Citi','BNP Paribas','Societe Generale',
  'Standard Chartered','Macquarie','Nomura','MUFG',
  // Telecoms / Media
  'BT','Vodafone','Sky','ITV','BBC','O2','EE','Three','Virgin Media',
  // Healthcare / Pharma
  'NHS','AstraZeneca','GSK','Pfizer','Novartis','Johnson & Johnson','Roche',
  // Other Large
  'Rolls-Royce','BAE Systems','BP','Shell','National Grid','Centrica','RELX',
  'Informa','WPP','Publicis','Experian','Serco','Capita',
])

// ── IR35 CLASSIFICATION ───────────────────────────────────
function classifyIR35(title: string, description: string): 'outside'|'inside'|'permanent' {
  const t = (title + ' ' + description).toLowerCase()
  // Strong signals for contract roles
  const isContract = /\b(contract|freelance|day rate|limited company|ltd company|umbrella|inside ir35|outside ir35|ir35|sow|statement of work|interim|consultant)\b/i.test(t)
  if (!isContract) return 'permanent'
  // Inside IR35 signals
  const insideSignals = /inside ir35|paye|psc not accepted|limited company not accepted|umbrella only/i.test(t)
  if (insideSignals) return 'inside'
  // Outside IR35 signals
  const outsideSignals = /outside ir35|outside of ir35|self.?employed|limited company|ltd co|psc|sow|statement of work/i.test(t)
  if (outsideSignals) return 'outside'
  // Default contracts to outside if no specific signal
  return 'outside'
}

// ── MATCH SCORE ──────────────────────────────────────────
function calcMatchScore(job: any, profile: { title?: string; skills?: string[]; streams?: string[] }): number {
  let score = 65
  const jt = (job.jobTitle || job.job_title || '').toLowerCase()
  const jd = (job.jobDescription || job.description || '').toLowerCase()
  const pt = (profile.title || '').toLowerCase()
  const streams = (profile.streams || []).map((s:string) => s.toLowerCase())

  // Title match
  if (pt && jt.includes(pt.split(' ')[0])) score += 10
  streams.forEach(s => { if (jt.includes(s.split(' ')[0])) score += 6 })

  // Sponsor bonus
  const company = job.employerName || job.company || ''
  if (SPONSOR_REGISTER.has(company)) score += 8

  // Skills match against JD
  if (profile.skills?.length) {
    const hits = profile.skills.filter((s:string) => jd.includes(s.toLowerCase()))
    score += Math.min(hits.length * 2, 10)
  }

  // Freshness bonus
  if (job.date) {
    const daysAgo = (Date.now() - new Date(job.date).getTime()) / 86400000
    if (daysAgo <= 1) score += 3
    else if (daysAgo <= 3) score += 1
  }

  return Math.min(score, 99)
}

// ── EXTRACT REQUIREMENTS FROM DESCRIPTION ────────────────
function extractRequirements(description: string): string[] {
  if (!description) return []
  // Common tech keywords to surface as requirement badges
  const keywords = [
    'Python','JavaScript','TypeScript','Java','C++','C#','Go','Rust','Ruby','PHP','Scala','Kotlin',
    'React','Vue','Angular','Node.js','Next.js','Express','Django','Flask','Spring',
    'AWS','Azure','GCP','Kubernetes','Docker','Terraform','Ansible','Jenkins','GitLab CI',
    'SQL','PostgreSQL','MySQL','MongoDB','Redis','Kafka','Elasticsearch','Snowflake',
    'Machine Learning','Deep Learning','NLP','TensorFlow','PyTorch','LLM',
    'Agile','Scrum','DevOps','CI/CD','Microservices','REST','GraphQL','gRPC',
    'Power BI','Tableau','Excel','SAP','Salesforce','Jira','Confluence',
    'Risk','Compliance','FCA','PRA','CCAR','IFRS','Basel','AML',
    'Product Management','Roadmap','OKR','A/B Testing','Analytics',
  ]
  return keywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(description)).slice(0, 12)
}

export async function GET(req: NextRequest) {
  try {
    const sp       = req.nextUrl.searchParams
    const title    = sp.get('title')    || 'Software Engineer'
    const location = sp.get('location') || 'London'
    const userId   = sp.get('userId')   || null
    const streams  = sp.get('stream')?.split(',').filter(Boolean) || []
    const minScore = parseInt(sp.get('minScore') || '65')

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }}
    )

    // Get user's CV skills for better match scoring
    let userSkills: string[] = []
    let userTitle = title
    if (userId) {
      const { data: prof } = await supabase.from('master_profiles').select('skills,current_role,raw_resume_text').eq('user_id', userId).single()
      if (prof?.skills?.length) userSkills = prof.skills
      if (prof?.current_role)   userTitle  = prof.current_role
      // Extract skills from raw CV text if no structured skills
      if (!userSkills.length && prof?.raw_resume_text) {
        const techRe = /\b(Python|JavaScript|TypeScript|Java|React|Node|AWS|Azure|GCP|Kubernetes|Docker|SQL|Terraform|DevOps|Machine Learning|Agile)\b/gi
        userSkills = [...new Set([...(prof.raw_resume_text.match(techRe)||[])].map(s=>s.toLowerCase()))].slice(0,20)
      }
    }

    // ── 1. CHECK SUPABASE CACHE FIRST (6hr TTL) ──────────
    const { data: cached } = await supabase.from('job_cache')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .eq('sponsor_verified', true)
      .limit(60)

    let rawJobs: any[] = []
    let source = 'cache'

    // ── 2. FETCH FROM REED API ────────────────────────────
    const reedKey = process.env.REED_API_KEY
    if (reedKey && (!cached || cached.length < 10)) {
      try {
        // Search across all user streams
        const searchTerms = streams.length > 0 ? streams.slice(0, 3) : [title]
        const reedResults = await Promise.allSettled(
          searchTerms.map(term =>
            fetch(`https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(term)}&locationName=${encodeURIComponent(location)}&resultsToTake=25&minimumSalary=30000`, {
              headers: { Authorization: `Basic ${Buffer.from(reedKey + ':').toString('base64')}` }
            }).then(r => r.ok ? r.json() : null)
          )
        )

        for (const result of reedResults) {
          if (result.status === 'fulfilled' && result.value?.results) {
            rawJobs.push(...result.value.results)
          }
        }

        // Fetch full job descriptions for top results
        const topJobs = rawJobs.slice(0, 20)
        const detailResults = await Promise.allSettled(
          topJobs.map(j =>
            fetch(`https://www.reed.co.uk/api/1.0/jobs/${j.jobId}`, {
              headers: { Authorization: `Basic ${Buffer.from(reedKey + ':').toString('base64')}` }
            }).then(r => r.ok ? r.json() : null)
          )
        )

        // Merge full descriptions
        detailResults.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            topJobs[i] = { ...topJobs[i], ...r.value }
          }
        })
        rawJobs = [...topJobs, ...rawJobs.slice(20)]
        source = 'reed_api'
      } catch(e) { console.warn('[jobs/search] Reed API error:', e) }
    }

    // ── 3. ALSO SEARCH CONTRACT ROLES ────────────────────
    if (reedKey && streams.length > 0) {
      try {
        const contractRes = await fetch(
          `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(streams[0]+' contract')}&locationName=${encodeURIComponent(location)}&resultsToTake=15`,
          { headers: { Authorization: `Basic ${Buffer.from(reedKey + ':').toString('base64')}` }}
        )
        if (contractRes.ok) {
          const contractData = await contractRes.json()
          rawJobs.push(...(contractData.results || []))
        }
      } catch(e) { /* non-critical */ }
    }

    // ── 4. TRANSFORM & CLASSIFY ───────────────────────────
    let jobs: any[] = []

    if (rawJobs.length > 0) {
      // De-duplicate by jobId
      const seen = new Set<string>()
      jobs = rawJobs
        .filter(j => { const id = String(j.jobId||j.id); if (seen.has(id)) return false; seen.add(id); return true })
        .map(j => {
          const ir35 = classifyIR35(j.jobTitle || '', j.jobDescription || '')
          const isSponsor = SPONSOR_REGISTER.has(j.employerName || '')
          const score = calcMatchScore(j, { title: userTitle, skills: userSkills, streams })
          const daysAgo = j.date ? Math.floor((Date.now() - new Date(j.date).getTime()) / 86400000) : 7
          const req = extractRequirements(j.jobDescription || '')
          return {
            external_id:       `reed_${j.jobId}`,
            job_title:         j.jobTitle,
            company:           j.employerName,
            location:          j.locationName,
            description:       j.jobDescription || j.jobDescription || '',
            requirements:      req,
            salary_range:      j.minimumSalary ? `£${Number(j.minimumSalary).toLocaleString()}${j.maximumSalary ? ` – £${Number(j.maximumSalary).toLocaleString()}` : '+'}` : undefined,
            job_url:           j.jobUrl,
            job_board:         'Reed',
            sponsor_verified:  isSponsor,
            contract_type:     ir35 === 'permanent' ? 'permanent' : 'contract',
            ir35_status:       ir35,
            match_score:       score,
            posted_days_ago:   daysAgo,
            posted_at:         j.date,
          }
        })
        .filter(j => j.match_score >= minScore)
        .sort((a, b) => b.match_score - a.match_score)

      // Cache in Supabase
      const toCache = jobs.map(j => ({
        ...j, expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      }))
      if (toCache.length > 0) {
        await supabase.from('job_cache').upsert(toCache, { onConflict: 'external_id', ignoreDuplicates: false })
          .then(({ error }) => { if (error) console.warn('[jobs/search] cache write:', error.message) })
      }
    } else if (cached?.length) {
      // Use Supabase cache
      jobs = cached.map(j => ({
        ...j,
        match_score: calcMatchScore(j, { title: userTitle, skills: userSkills, streams }),
      })).sort((a,b) => b.match_score - a.match_score)
    } else {
      // ── FALLBACK: Rich realistic demo data ───────────────
      source = 'demo'
      jobs = DEMO_JOBS.map(j => ({
        ...j,
        match_score: calcMatchScore(j, { title: userTitle, skills: userSkills, streams }),
      })).sort((a,b) => b.match_score - a.match_score)
    }

    const sponsored   = jobs.filter(j => j.sponsor_verified && j.contract_type !== 'contract')
    const outside     = jobs.filter(j => j.ir35_status === 'outside')
    const inside      = jobs.filter(j => j.ir35_status === 'inside')

    return NextResponse.json({
      success: true, source,
      jobs,
      summary: { total: jobs.length, sponsored: sponsored.length, outside_ir35: outside.length, inside_ir35: inside.length },
    })
  } catch (err: any) {
    console.error('[/api/jobs/search]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── REALISTIC DEMO JOBS (shown when REED_API_KEY not set) ──
const DEMO_JOBS: any[] = [
  // ── SPONSORED PERMANENT ──
  {
    external_id:'d_sp1', job_title:'Senior DevOps Engineer', company:'Revolut', location:'London',
    salary_range:'£75,000 – £95,000', job_board:'LinkedIn', sponsor_verified:true, contract_type:'permanent', ir35_status:'permanent',
    posted_days_ago:1, job_url:'https://careers.revolut.com',
    description:`We're looking for a Senior DevOps Engineer to join Revolut's rapidly growing infrastructure team. You will design, build and maintain the CI/CD pipelines and cloud infrastructure that power our products for 35+ million customers worldwide.\n\nYou'll work closely with software engineering teams to ensure fast, reliable, and secure deployments across our global infrastructure.\n\nWhat you'll be doing:\n• Design and maintain Kubernetes clusters on AWS and GCP\n• Build and optimise CI/CD pipelines using GitHub Actions and ArgoCD\n• Implement infrastructure as code using Terraform\n• Drive reliability improvements through SLO/SLI frameworks\n• Mentor junior engineers and lead incident response\n\nWhat we're looking for:\n• 5+ years of DevOps/Platform engineering experience\n• Strong Kubernetes and Docker expertise\n• Experience with AWS or GCP at scale\n• Proficiency in Python or Go for tooling\n• Terraform or Pulumi for IaC`,
    requirements:['Kubernetes','Docker','AWS','GCP','Terraform','Python','CI/CD','GitHub Actions'],
  },
  {
    external_id:'d_sp2', job_title:'Backend Engineer — Payments', company:'Monzo', location:'London',
    salary_range:'£70,000 – £90,000', job_board:'LinkedIn', sponsor_verified:true, contract_type:'permanent', ir35_status:'permanent',
    posted_days_ago:2, job_url:'https://monzo.com/careers',
    description:`Monzo is on a mission to make money work for everyone. As a Backend Engineer on our Payments team, you'll build the systems that process millions of transactions every day with five nines of reliability.\n\nYou'll work in a small, autonomous team that owns a critical part of our payments infrastructure from design to production.\n\nResponsibilities:\n• Build and maintain high-throughput payment processing services in Go\n• Design APIs consumed by mobile clients and third-party integrators\n• Participate in on-call rotation and drive reliability improvements\n• Work with product and design to shape features\n\nRequirements:\n• Strong Go or similar backend language experience\n• Knowledge of distributed systems and eventual consistency\n• Experience with PostgreSQL or similar relational databases\n• Understanding of payment schemes (Faster Payments, SEPA, SWIFT) a plus`,
    requirements:['Go','PostgreSQL','Distributed Systems','REST','Microservices','Kubernetes'],
  },
  {
    external_id:'d_sp3', job_title:'Data Engineer', company:'Wise', location:'London',
    salary_range:'£65,000 – £85,000', job_board:'Indeed', sponsor_verified:true, contract_type:'permanent', ir35_status:'permanent',
    posted_days_ago:1, job_url:'https://wise.com/gb/careers',
    description:`Wise is seeking a Data Engineer to join our Analytics Platform team. You'll build and maintain the data pipelines that enable data-driven decisions across Wise's products serving 16+ million customers.\n\nYou'll own the end-to-end lifecycle of data pipelines from ingestion to transformation to serving.\n\nWhat you'll do:\n• Design and build scalable ETL/ELT pipelines using Python and dbt\n• Maintain our Snowflake data warehouse\n• Work with data scientists to productionise ML features\n• Ensure data quality through testing frameworks\n\nRequirements:\n• 3+ years data engineering experience\n• Strong SQL and Python skills\n• Experience with Snowflake, BigQuery, or Redshift\n• Familiarity with Airflow or similar orchestration tools\n• dbt experience strongly preferred`,
    requirements:['Python','SQL','Snowflake','dbt','Airflow','BigQuery','ETL'],
  },
  {
    external_id:'d_sp4', job_title:'Cloud Infrastructure Engineer', company:'Starling Bank', location:'London',
    salary_range:'£70,000 – £88,000', job_board:'Reed', sponsor_verified:true, contract_type:'permanent', ir35_status:'permanent',
    posted_days_ago:3, job_url:'https://starlingbank.com/careers',
    description:`Starling Bank is looking for a Cloud Infrastructure Engineer to help us build and maintain our AWS-based banking infrastructure. We're one of the UK's fastest-growing challenger banks with over 3 million accounts.\n\nYou'll be part of the infrastructure team responsible for the reliability and scalability of our cloud platform.\n\nKey responsibilities:\n• Manage and evolve our AWS infrastructure using Terraform\n• Implement security best practices across our cloud estate\n• Build monitoring and alerting using Datadog and PagerDuty\n• Participate in on-call rotation\n\nRequired skills:\n• AWS (EC2, RDS, EKS, Lambda, VPC)\n• Terraform for infrastructure as code\n• Linux systems administration\n• Python or Bash scripting\n• Security-first mindset`,
    requirements:['AWS','Terraform','Linux','Python','Kubernetes','Datadog','Security'],
  },
  {
    external_id:'d_sp5', job_title:'Machine Learning Engineer', company:'Darktrace', location:'Cambridge',
    salary_range:'£80,000 – £105,000', job_board:'LinkedIn', sponsor_verified:true, contract_type:'permanent', ir35_status:'permanent',
    posted_days_ago:0, job_url:'https://darktrace.com/careers',
    description:`Darktrace is the world leader in AI-powered cybersecurity. As a Machine Learning Engineer, you'll work on the core AI that detects novel cyberattacks across thousands of enterprise networks in real time.\n\nYou'll collaborate with world-class researchers and engineers to take ML models from research to production.\n\nResponsibilities:\n• Develop and productionise anomaly detection models\n• Work with petabyte-scale network telemetry data\n• Build model serving infrastructure on AWS\n• Collaborate with research team on novel AI approaches\n\nRequirements:\n• MSc or PhD in Computer Science, Mathematics, or related field\n• Strong Python and ML frameworks (PyTorch, TensorFlow, scikit-learn)\n• Experience deploying ML models to production\n• Knowledge of network protocols and cybersecurity a plus`,
    requirements:['Python','PyTorch','TensorFlow','Machine Learning','AWS','Kubernetes','SQL'],
  },
  {
    external_id:'d_sp6', job_title:'Product Manager — Core Banking', company:'Monzo', location:'London',
    salary_range:'£85,000 – £110,000', job_board:'LinkedIn', sponsor_verified:true, contract_type:'permanent', ir35_status:'permanent',
    posted_days_ago:2, job_url:'https://monzo.com/careers',
    description:`We're looking for a Product Manager to lead our Core Banking product area. You'll shape how millions of customers manage their money through Monzo's current account.\n\nYou'll own the roadmap for core banking features and work with engineering, design, data science and operations to deliver.\n\nWhat you'll do:\n• Define and execute the product strategy for core banking\n• Work with engineers to deliver reliable, scalable features\n• Analyse data to identify opportunities and measure impact\n• Engage with regulators and compliance teams\n\nWhat we need:\n• 4+ years of product management experience\n• Experience in fintech or financial services strongly preferred\n• Data-driven mindset — comfortable with SQL and analytics tools\n• Track record of shipping products used at scale`,
    requirements:['Product Management','SQL','Analytics','Agile','Roadmap','Fintech'],
  },
  // ── OUTSIDE IR35 ──
  {
    external_id:'d_out1', job_title:'Senior DevOps Consultant', company:'Accenture', location:'London',
    salary_range:'£600 – £750 per day', job_board:'Reed', sponsor_verified:false, contract_type:'contract', ir35_status:'outside',
    posted_days_ago:1, job_url:'https://accenture.com/gb-en/careers',
    description:`6-month contract engagement for a Senior DevOps Consultant to join a major digital transformation programme at a Tier 1 UK bank. This role is OUTSIDE IR35 and suited to an experienced contractor operating through their own limited company.\n\nYou will embed in the client's platform engineering team and lead the migration from legacy Jenkins pipelines to GitHub Actions.\n\nKey deliverables:\n• Full CI/CD pipeline migration (Jenkins → GitHub Actions)\n• Kubernetes cluster upgrade from 1.24 to 1.28\n• Infrastructure as code coverage target: 90% via Terraform\n• Technical documentation and knowledge transfer\n\nRequirements:\n• Minimum 7 years DevOps experience\n• Kubernetes, Docker, AWS essential\n• Terraform proficiency required\n• Financial services experience preferred\n• Limited company/PSC required — umbrella not accepted`,
    requirements:['Kubernetes','Docker','AWS','Terraform','GitHub Actions','CI/CD','Python'],
  },
  {
    external_id:'d_out2', job_title:'Data Engineering Contractor', company:'Experian', location:'Nottingham (Hybrid)',
    salary_range:'£500 – £620 per day', job_board:'LinkedIn', sponsor_verified:false, contract_type:'contract', ir35_status:'outside',
    posted_days_ago:2, job_url:'https://experian.com/careers',
    description:`12-month contract for a Data Engineering Contractor to join Experian's data platform team. Outside IR35. Remote-first with occasional visits to Nottingham.\n\nYou'll build and maintain the data pipelines powering Experian's credit decisioning platform — critical infrastructure processing millions of records daily.\n\nDeliverables:\n• Build new Snowflake data pipelines from scratch\n• Migrate legacy Oracle ETL processes to modern dbt/Python stack\n• Implement data quality monitoring using Great Expectations\n• Collaborate with data scientists on feature engineering pipelines\n\nRequirements:\n• Strong Python and SQL\n• Snowflake and dbt expertise\n• Airflow or Prefect experience\n• Experience with credit data or financial datasets a strong plus\n• Outside IR35 — limited company required`,
    requirements:['Python','SQL','Snowflake','dbt','Airflow','Spark','ETL'],
  },
  {
    external_id:'d_out3', job_title:'Cloud Solutions Architect', company:'Capgemini', location:'London',
    salary_range:'£700 – £850 per day', job_board:'Indeed', sponsor_verified:false, contract_type:'contract', ir35_status:'outside',
    posted_days_ago:0, job_url:'https://capgemini.com/gb-en/careers',
    description:`We're seeking an experienced Cloud Solutions Architect for a 9-month contract engagement supporting a major UK government digital transformation initiative. Outside IR35. SC clearance required or willingness to obtain.\n\nYou'll define the target architecture for migrating legacy on-premise workloads to AWS GovCloud and create the technical reference architecture used across 8 programme workstreams.\n\nKey responsibilities:\n• Lead technical architecture design sessions with stakeholders\n• Produce architecture decision records (ADRs)\n• Define cloud landing zone and account structure\n• AWS Well-Architected Framework reviews\n\nRequirements:\n• AWS Solutions Architect Professional certification strongly preferred\n• 10+ years enterprise architecture experience\n• Public sector experience advantageous\n• Experience with TOGAF or similar frameworks\n• Outside IR35 / SoW`,
    requirements:['AWS','Azure','Terraform','Kubernetes','Architecture','Security','DevOps'],
  },
  // ── INSIDE IR35 ──
  {
    external_id:'d_in1', job_title:'Senior Java Developer', company:'HSBC', location:'London',
    salary_range:'£450 – £550 per day (PAYE)', job_board:'Reed', sponsor_verified:false, contract_type:'contract', ir35_status:'inside',
    posted_days_ago:3, job_url:'https://hsbc.com/careers',
    description:`HSBC Global Banking & Markets Technology is looking for a Senior Java Developer for a 6-month PAYE contract. This role is INSIDE IR35 — all payments through our approved umbrella company partners.\n\nYou'll join the Fixed Income electronic trading platform team, working on the low-latency order management system that processes billions of pounds of transactions daily.\n\nResponsibilities:\n• Develop and maintain Java-based trading platform components\n• Optimise performance of latency-sensitive execution paths\n• Write comprehensive unit and integration tests\n• Collaborate with quants on algorithm implementation\n\nRequirements:\n• Java 11+ with strong concurrency knowledge\n• Spring Boot and microservices architecture\n• FIX protocol experience desirable\n• Low-latency or high-frequency background preferred\n• Inside IR35 — PAYE via umbrella required`,
    requirements:['Java','Spring Boot','Microservices','SQL','REST','Docker','Kubernetes'],
  },
  {
    external_id:'d_in2', job_title:'Business Analyst — Payments', company:'Barclays', location:'London',
    salary_range:'£400 – £500 per day (PAYE)', job_board:'LinkedIn', sponsor_verified:false, contract_type:'contract', ir35_status:'inside',
    posted_days_ago:1, job_url:'https://home.barclays/careers',
    description:`Barclays Transaction Banking requires an experienced Business Analyst to support the implementation of new ISO 20022 payment messaging standards. This role is inside IR35.\n\nYou'll work as part of a cross-functional programme team delivering regulatory-driven changes to Barclays' correspondent banking infrastructure.\n\nKey activities:\n• Elicit and document business requirements from payments SMEs\n• Produce functional specifications for ISO 20022 migration\n• Facilitate workshops and maintain RAID log\n• Manage UAT and support business sign-off\n\nRequirements:\n• 6+ years BA experience in financial services\n• Payments domain knowledge (SWIFT, SEPA, Faster Payments)\n• ISO 20022 experience highly desirable\n• Proficient with Jira, Confluence\n• Inside IR35`,
    requirements:['Business Analysis','Agile','Jira','SQL','Payments','Risk','Compliance'],
  },
]