// ════════════════════════════════════════════════════════
// FILE PATH: src/app/dashboard/page.tsx
// ════════════════════════════════════════════════════════
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getApplications, getMasterProfile, getEnginePrefs,
         saveEnginePrefs, saveMasterProfile, analyseATS } from '@/lib/supabase'
import type { ATSResult } from '@/lib/supabase'

type Tab = 'overview'|'ats'|'jobs'|'profile'|'applications'|'settings'|'billing'
type JobGroup = 'sponsored'|'outside_ir35'|'inside_ir35'
type ATSMode = 'upload'|'builder'
type BuilderStep = 'personal'|'summary'|'experience'|'education'|'skills'|'generating'|'done'

const SC: Record<string,string> = { Applied:'#3B82F6',Viewed:'#F59E0B',Interview:'#059669',Offered:'#8B5CF6',Rejected:'#EF4444' }

async function extractPDF(file: File): Promise<string> {
  const lib = (window as any).pdfjsLib
  if (!lib) throw new Error('PDF.js not loaded')
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const pg = await pdf.getPage(i)
    const c  = await pg.getTextContent()
    text += c.items.map((s: any) => s.str).join(' ') + '\n'
  }
  return text.trim()
}
async function extractDOCX(file: File): Promise<string> {
  const m = (window as any).mammoth
  if (!m) throw new Error('Mammoth.js not loaded')
  return (await m.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim()
}

// Pull structured data from raw CV text
function parseProfileFromCV(text: string) {
  const emailMatch   = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const phoneMatch   = text.match(/(\+44|0044|0)[0-9\s\-().]{9,15}/)
  const linkedinMatch= text.match(/linkedin\.com\/in\/[\w\-]+/i)
  const nameMatch    = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/)
  const techKeywords = ['Python','JavaScript','TypeScript','Java','Go','React','Node','AWS','Azure','GCP',
    'Kubernetes','Docker','Terraform','SQL','PostgreSQL','MongoDB','Redis','Kafka','Machine Learning',
    'DevOps','CI/CD','Agile','Scrum','Power BI','Tableau','Salesforce','SAP','Excel','C++','C#','Rust']
  const skills = techKeywords.filter(k => new RegExp(`\\b${k}\\b`,'i').test(text))
  return {
    email:        emailMatch?.[0]     || '',
    phone:        phoneMatch?.[0]     || '',
    linkedin_url: linkedinMatch       ? `https://${linkedinMatch[0]}` : '',
    full_name:    nameMatch?.[1]      || '',
    skills,
  }
}

// Simple sparkline SVG
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const w = 80, h = 32, pad = 2
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={`${pad},${h} ${pts} ${w-pad},${h}`} fill={color} fillOpacity=".12" stroke="none"/>
    </svg>
  )
}

// Mini donut chart
function Donut({ segments }: { segments: {label:string;value:number;color:string}[] }) {
  const total = segments.reduce((s,x) => s+x.value, 0) || 1
  let offset = 0
  const r = 42, cx = 52, cy = 52, stroke = 26
  return (
    <svg width="104" height="104" viewBox="0 0 104 104">
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * 2 * Math.PI * r
        const gap  = 2 * Math.PI * r - dash
        const rot  = offset * 2 * Math.PI * r
        offset += pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-rot + 2 * Math.PI * r * 0.25}
            style={{transition:'stroke-dasharray .6s ease'}}/>
        )
      })}
      <circle cx={cx} cy={cy} r={r - stroke/2 - 2} fill="#fff"/>
    </svg>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab]         = useState<Tab>('overview')
  const [user, setUser]       = useState<any>(null)
  const [apps, setApps]       = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [prefs, setPrefs]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [scriptsOk, setScriptsOk] = useState(false)

  // ATS
  const [atsMode, setAtsMode]     = useState<ATSMode>('upload')
  const [resumeText, setResumeText] = useState('')
  const [atsResult, setAtsResult]   = useState<ATSResult|null>(null)
  const [atsLoading, setAtsLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileName, setFileName]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // AI CV Builder
  const [builderStep, setBuilderStep] = useState<BuilderStep>('personal')
  const [builderData, setBuilderData] = useState<any>({
    full_name:'', email:'', phone:'', location:'', linkedin:'',
    summary:'', target_role:'', visa_status:'',
    experiences:[{ title:'', company:'', duration:'', bullets:'' }],
    education:[{ degree:'', institution:'', year:'' }],
    skills:'', certifications:'',
  })
  const [generatedCV, setGeneratedCV] = useState('')
  const [cvGenerating, setCVGenerating] = useState(false)

  // Jobs
  const [jobs, setJobs]           = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [expandedJob, setExpandedJob] = useState<string|null>(null)
  const [activeGroup, setActiveGroup] = useState<JobGroup>('sponsored')
  const [applyingId, setApplyingId]   = useState<string|null>(null)
  const [appliedIds, setAppliedIds]   = useState<Set<string>>(new Set())

  // Profile edit
  const [ep, setEp]               = useState<any>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved]   = useState(false)
  const [prefsSaving, setPrefsSaving]     = useState(false)

  const isNewUser = !profile?.profile_complete && apps.length === 0

  // Load PDF.js + mammoth
  useEffect(() => {
    const load = (src: string, id: string) => new Promise<void>(res => {
      if (document.getElementById(id)) { res(); return }
      const s = document.createElement('script'); s.src=src; s.id=id; s.onload=()=>res(); document.head.appendChild(s)
    })
    Promise.all([
      load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjs'),
      load('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js','mammoth'),
    ]).then(() => {
      const p = (window as any).pdfjsLib
      if (p) p.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      setScriptsOk(true)
    })
  }, [])

  const loadData = useCallback(async (uid: string) => {
    const [a, p, pr] = await Promise.all([getApplications(uid), getMasterProfile(uid), getEnginePrefs(uid)])
    if (a.data?.length)  setApps(a.data)
    if (p.data)        { setProfile(p.data); setEp(p.data) }
    else                 setEp({})
    setPrefs(pr.data || { max_apps_per_day:10, min_match_score:70, auto_submit:true, email_alerts:true, engine_active:true })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) { router.replace('/signin'); return }
      const m = s.user.user_metadata
      const n = `${m?.first_name||''} ${m?.last_name||''}`.trim() || s.user.email?.split('@')[0]||'User'
      setUser({ id:s.user.id, email:s.user.email||'', name:n })
      loadData(s.user.id).finally(() => setLoading(false))
    })
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((e,s) => { if (!s) router.replace('/signin') })
    return () => sub.unsubscribe()
  }, [router, loadData])

  // ── FILE UPLOAD ──
  const handleFile = async (file: File) => {
    if (!scriptsOk) { alert('Libraries still loading — please wait a moment.'); return }
    setFileLoading(true); setFileName(file.name); setAtsResult(null)
    try {
      let text = ''
      if (file.name.endsWith('.pdf') || file.type==='application/pdf') text = await extractPDF(file)
      else if (file.name.match(/\.docx?$/i) || file.type.includes('word')) text = await extractDOCX(file)
      else if (file.name.endsWith('.txt')) text = await file.text()
      else { alert('Upload a PDF, DOCX, DOC or TXT file.'); setFileLoading(false); return }
      if (!text || text.length < 50) { alert('Could not read text from this file. Try pasting your CV instead.'); setFileLoading(false); return }
      setResumeText(text)
    } catch(e:any) { alert('Error: '+e.message) }
    setFileLoading(false)
  }

  // ── ATS + AUTO-FILL PROFILE ──
  const runATS = async () => {
    if (!resumeText.trim() || !user) return
    setAtsLoading(true)
    try {
      const res = await fetch('/api/resume/analyse', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ resumeText, userId: user.id })
      })
      const json = await res.json()
      if (json.result) {
        setAtsResult(json.result)
        // ── AUTO-FILL PROFILE: merge server-extracted + client-extracted ──
        const serverExtracted = json.extracted || {}
        const clientExtracted = parseProfileFromCV(resumeText)
        const merged = { ...ep, ...clientExtracted, ...serverExtracted }
        // Remove undefined/null/empty keys so we don't overwrite existing data with blanks
        const clean = Object.fromEntries(
          Object.entries(merged).filter(([,v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && (v as any[]).length === 0))
        )
        setEp(clean)
        await loadData(user.id)
      }
    } catch(e){ console.error(e) } finally { setAtsLoading(false) }
  }

  // ── AI CV BUILDER ──
  const generateCV = async () => {
    setCVGenerating(true)
    try {
      const prompt = `You are an expert UK CV writer. Create a professional, ATS-optimised CV for the following person. Format it cleanly as plain text with clear sections. Make it compelling, use strong action verbs, quantify where possible.

PERSONAL DETAILS:
Name: ${builderData.full_name}
Email: ${builderData.email}
Phone: ${builderData.phone}
Location: ${builderData.location}
LinkedIn: ${builderData.linkedin}
Visa: ${builderData.visa_status}

TARGET ROLE: ${builderData.target_role}

PROFESSIONAL SUMMARY: ${builderData.summary}

EXPERIENCE:
${builderData.experiences.map((e:any,i:number)=>`${i+1}. ${e.title} at ${e.company} (${e.duration})\n${e.bullets}`).join('\n\n')}

EDUCATION:
${builderData.education.map((e:any)=>`${e.degree} — ${e.institution} (${e.year})`).join('\n')}

SKILLS: ${builderData.skills}
CERTIFICATIONS: ${builderData.certifications}

Write a complete, professional UK CV. Include all sections. Make it ATS-optimised with relevant keywords for ${builderData.target_role}.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-5-20250929', max_tokens:2000,
          messages:[{ role:'user', content: prompt }]
        })
      })
      const data = await res.json()
      const cvText = data.content?.[0]?.text || ''
      setGeneratedCV(cvText)
      setResumeText(cvText)
      setBuilderStep('done')
      // Auto-fill profile from builder data
      setEp((prev:any) => ({ ...prev,
        full_name: builderData.full_name, email: builderData.email,
        phone: builderData.phone, linkedin_url: builderData.linkedin,
        visa_status: builderData.visa_status, current_role: builderData.target_role,
      }))
    } catch(e:any) { alert('CV generation failed: '+e.message) }
    setCVGenerating(false)
  }

  // ── JOB ENGINE ──
  const runEngine = useCallback(async () => {
    if (!user) return
    setJobsLoading(true)
    try {
      const streams = profile?.target_streams || prefs?.target_streams || []
      const location = Array.isArray(profile?.preferred_locations) ? profile.preferred_locations[0] : (profile?.preferred_locations || 'London')
      const params = new URLSearchParams({ title: streams[0]||'Engineer', location, userId: user.id, stream: streams.join(','), minScore: String(prefs?.min_match_score||65) })
      const res = await fetch(`/api/jobs/search?${params}`)
      const json = await res.json()
      if (json.jobs) setJobs(json.jobs)
    } catch(e){ console.error(e) } finally { setJobsLoading(false) }
  }, [user, profile, prefs])

  useEffect(() => { if (tab==='jobs'&&user&&jobs.length===0) runEngine() }, [tab, user])

  // ── APPLY ──
  const applyJob = async (job: any) => {
    if (!user) return
    const jid = job.external_id||job.id
    if (appliedIds.has(jid)) return
    setApplyingId(jid)
    try {
      const res = await fetch('/api/jobs/apply', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId:user.id, job, autoApply:false }) })
      const json = await res.json()
      if (json.success) { setAppliedIds(p=>new Set([...p,jid])); setApps(p=>[json.application||{...job,status:'Applied',applied_at:new Date().toISOString()},...p]) }
    } finally { setApplyingId(null) }
  }

  // ── SAVE PROFILE ──
  const saveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await saveMasterProfile(user.id, { ...ep, profile_complete:true })
      setProfile({ ...ep, profile_complete:true })
      setProfileSaved(true); setTimeout(()=>setProfileSaved(false),3000)
    } finally { setSavingProfile(false) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace('/') }

  // ── OVERVIEW CHARTS DATA ──
  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-6+i)
    const ds = d.toDateString()
    return apps.filter(a=>new Date(a.applied_at).toDateString()===ds).length
  })
  const totalApps     = apps.length
  const totalReplies  = apps.filter(a=>['Viewed','Interview','Offered'].includes(a.status)).length
  const totalInt      = apps.filter(a=>a.status==='Interview'||a.status==='Offered').length
  const replyRate     = totalApps ? Math.round(totalReplies/totalApps*100) : 0
  const hoursSaved    = totalApps * 0.75
  const streamGroups  = apps.reduce((acc:any,a:any)=>{ const k=a.job_title?.split(' ').slice(-1)[0]||'Other'; acc[k]=(acc[k]||0)+1; return acc },{})
  const donutSegs     = Object.entries(streamGroups).slice(0,5).map(([label,value],i)=>({
    label, value:value as number,
    color:['#3B82F6','#059669','#8B5CF6','#F59E0B','#EF4444'][i]
  }))
  const sponsoredJobs   = jobs.filter(j=>j.sponsor_verified&&j.contract_type!=='contract')
  const outsideIR35Jobs = jobs.filter(j=>j.ir35_status==='outside')
  const insideIR35Jobs  = jobs.filter(j=>j.ir35_status==='inside')
  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)||'U'

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'DM Sans,sans-serif',background:'#0A0F1E'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:44,height:44,border:'3px solid rgba(59,130,246,.3)',borderTopColor:'#3B82F6',borderRadius:'50%',animation:'sp 1s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{color:'rgba(255,255,255,.5)',fontWeight:600,fontSize:'.9rem'}}>Loading SponsorPath Engine...</p>
        <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--bd:#1D4ED8;--green:#059669;--navy:#0A0F1E;--muted:#64748B;--bdr:#E2E8F0;--bg:#F1F5F9;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--navy);}
        a{text-decoration:none;color:inherit;}
        .layout{display:flex;min-height:100vh;}
        /* SIDEBAR */
        .sb{width:210px;background:#0A0F1E;padding:1.25rem .85rem;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100%;z-index:100;overflow-y:auto;}
        .sb-logo{display:flex;align-items:center;gap:.55rem;margin-bottom:1.75rem;}
        .sb-ic{width:34px;height:34px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1rem;font-family:'Archivo',sans-serif;flex-shrink:0;}
        .sb-nm{font-family:'Archivo',sans-serif;font-size:1rem;font-weight:900;color:#fff;}
        .sb-nm span{color:#34D399;}
        .sb-sect{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.25);margin:.9rem 0 .4rem;padding:0 .4rem;}
        .sb-item{display:flex;align-items:center;gap:.6rem;padding:.58rem .6rem;border-radius:8px;cursor:pointer;transition:all .2s;margin-bottom:.14rem;color:rgba(255,255,255,.5);font-size:.83rem;font-weight:500;border:1px solid transparent;}
        .sb-item:hover{background:rgba(255,255,255,.07);color:#fff;}
        .sb-item.act{background:rgba(59,130,246,.2);color:#fff;border-color:rgba(59,130,246,.3);}
        .sb-item .ico{font-size:.88rem;width:16px;text-align:center;flex-shrink:0;}
        .sb-eng{margin:.7rem 0;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);border-radius:9px;padding:.65rem .75rem;}
        .ep{width:6px;height:6px;border-radius:50%;background:#34D399;display:inline-block;animation:ep 1.8s ease-in-out infinite;margin-right:.38rem;}
        @keyframes ep{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}60%{box-shadow:0 0 0 5px rgba(52,211,153,0)}}
        .sb-eng p{color:#6EE7B7;font-size:.74rem;font-weight:700;}
        .sb-eng small{color:rgba(52,211,153,.55);font-size:.66rem;}
        .sb-user{display:flex;align-items:center;gap:.55rem;padding:.6rem;background:rgba(255,255,255,.05);border-radius:9px;border:1px solid rgba(255,255,255,.07);}
        .sb-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.74rem;flex-shrink:0;}
        .sb-un{color:#fff;font-size:.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;}
        .sb-ue{color:rgba(255,255,255,.35);font-size:.62rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;}
        .sb-so{margin-top:.45rem;width:100%;padding:.48rem;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:7px;color:rgba(255,255,255,.4);font-size:.74rem;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;}
        .sb-so:hover{border-color:rgba(239,68,68,.5);color:#F87171;}
        /* MAIN */
        .main{margin-left:210px;flex:1;padding:1.75rem 2rem;min-height:100vh;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.75rem;}
        .topbar h1{font-family:'Archivo',sans-serif;font-size:1.45rem;font-weight:800;}
        .up-btn{padding:.52rem 1.1rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:8px;font-size:.8rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;}
        /* ONBOARDING */
        .ob-wrap{background:#fff;border:1px solid var(--bdr);border-radius:16px;padding:2.5rem;max-width:680px;margin:0 auto;}
        .ob-wrap h2{font-family:'Archivo',sans-serif;font-size:1.5rem;font-weight:900;margin-bottom:.5rem;}
        .ob-sub{color:var(--muted);font-size:.9rem;margin-bottom:2rem;line-height:1.7;}
        .ob-steps{display:flex;flex-direction:column;gap:.9rem;}
        .ob-step{display:flex;align-items:center;gap:1rem;padding:1rem 1.2rem;border:1.5px solid var(--bdr);border-radius:12px;cursor:pointer;transition:all .25s;}
        .ob-step:hover{border-color:var(--blue);background:#EFF6FF;transform:translateX(3px);}
        .ob-step.done{border-color:var(--green);background:#ECFDF5;}
        .ob-n{width:36px;height:36px;border-radius:50%;border:2px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.88rem;color:var(--muted);flex-shrink:0;}
        .ob-step:hover .ob-n{border-color:var(--blue);color:var(--blue);}
        .ob-step.done .ob-n{border-color:var(--green);color:var(--green);}
        .ob-t{font-weight:700;font-size:.91rem;margin-bottom:.15rem;}
        .ob-d{color:var(--muted);font-size:.79rem;line-height:1.5;}
        /* FUTURISTIC OVERVIEW */
        .ov-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;margin-bottom:1.4rem;}
        .kpi{background:linear-gradient(145deg,#0F172A,#1E293B);border:1px solid rgba(59,130,246,.2);border-radius:14px;padding:1.3rem;position:relative;overflow:hidden;}
        .kpi::before{content:'';position:absolute;top:-30px;right:-30px;width:100px;height:100px;border-radius:50%;background:var(--kpi-clr,rgba(59,130,246,.12));pointer-events:none;}
        .kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem;}
        .kpi-label{color:rgba(255,255,255,.5);font-size:.73rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;}
        .kpi-badge{font-size:.68rem;font-weight:800;padding:.18rem .5rem;border-radius:50px;background:rgba(52,211,153,.15);color:#34D399;}
        .kpi-val{font-family:'Archivo',sans-serif;font-size:2.4rem;font-weight:900;color:#fff;line-height:1;margin-bottom:.25rem;}
        .kpi-sub{color:rgba(255,255,255,.38);font-size:.74rem;}
        .kpi-spark{position:absolute;bottom:1rem;right:1rem;opacity:.8;}
        /* CHARTS ROW */
        .chart-row{display:grid;grid-template-columns:1.6fr 1fr;gap:1.1rem;margin-bottom:1.4rem;}
        .chart-card{background:#fff;border:1px solid var(--bdr);border-radius:14px;padding:1.3rem;}
        .chart-card h4{font-family:'Archivo',sans-serif;font-size:.88rem;font-weight:700;margin-bottom:.3rem;}
        .chart-sub{color:var(--muted);font-size:.73rem;margin-bottom:1rem;}
        /* Bar chart */
        .bar-chart{display:flex;align-items:flex-end;gap:4px;height:80px;}
        .bar{flex:1;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#3B82F6,#1D4ED8);transition:height .6s ease;min-height:4px;cursor:default;}
        .bar:hover{background:linear-gradient(180deg,#60A5FA,#3B82F6);}
        .bar-labels{display:flex;gap:4px;margin-top:.35rem;}
        .bar-lbl{flex:1;text-align:center;font-size:.6rem;color:var(--muted);}
        /* Activity feed */
        .activity-card{background:#fff;border:1px solid var(--bdr);border-radius:14px;padding:1.3rem;margin-bottom:1.4rem;}
        .activity-card h4{font-family:'Archivo',sans-serif;font-size:.88rem;font-weight:700;margin-bottom:.9rem;}
        .act-row{display:flex;align-items:center;gap:.85rem;padding:.6rem 0;border-bottom:1px solid rgba(226,232,240,.5);}
        .act-row:last-child{border-bottom:none;}
        .act-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.88rem;flex-shrink:0;}
        .act-t{font-size:.83rem;font-weight:600;margin-bottom:.1rem;}
        .act-d{font-size:.73rem;color:var(--muted);}
        .act-time{margin-left:auto;font-size:.7rem;color:var(--muted);white-space:nowrap;}
        /* CARDS */
        .card{background:#fff;border:1px solid var(--bdr);border-radius:13px;overflow:hidden;margin-bottom:1.3rem;}
        .ch{padding:1rem 1.3rem;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;}
        .ch h3{font-family:'Archivo',sans-serif;font-size:.91rem;font-weight:700;}
        .ch-act{font-size:.78rem;color:var(--blue);font-weight:600;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;padding:.6rem 1.25rem;font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);border-bottom:1px solid var(--bdr);}
        td{padding:.78rem 1.25rem;border-bottom:1px solid rgba(226,232,240,.45);font-size:.83rem;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(248,250,252,.7);}
        .jtn{font-weight:700;}
        .jcm{color:var(--muted);font-size:.72rem;margin-top:.07rem;}
        .mp{display:inline-flex;padding:.18rem .58rem;border-radius:50px;font-size:.71rem;font-weight:700;}
        .mh{background:rgba(5,150,105,.1);color:var(--green);}
        .mm{background:rgba(59,130,246,.1);color:var(--blue);}
        .st{display:inline-block;padding:.17rem .58rem;border-radius:50px;font-size:.7rem;font-weight:700;}
        /* ATS */
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;}
        .tool-card{background:#fff;border:1px solid var(--bdr);border-radius:13px;padding:1.5rem;}
        .tool-card h3{font-family:'Archivo',sans-serif;font-size:.94rem;font-weight:700;margin-bottom:.3rem;}
        .tc-desc{color:var(--muted);font-size:.81rem;margin-bottom:1.1rem;line-height:1.65;}
        /* Mode tabs */
        .mode-tabs{display:flex;gap:.5rem;margin-bottom:1.1rem;}
        .mt-btn{flex:1;padding:.55rem;border-radius:8px;font-size:.81rem;font-weight:700;cursor:pointer;border:1.5px solid var(--bdr);background:#fff;color:var(--muted);transition:all .22s;font-family:'DM Sans',sans-serif;text-align:center;}
        .mt-btn.act{background:var(--navy);color:#fff;border-color:var(--navy);}
        /* Upload zone */
        .upload-z{border:2px dashed var(--bdr);border-radius:11px;padding:1.6rem;text-align:center;cursor:pointer;background:var(--bg);transition:all .3s;}
        .upload-z:hover{border-color:var(--blue);background:rgba(59,130,246,.03);}
        .upload-z.ok{border-color:var(--green);background:rgba(5,150,105,.03);}
        .upload-z .ui{font-size:2rem;margin-bottom:.45rem;}
        .upload-z h4{font-weight:700;font-size:.88rem;margin-bottom:.22rem;}
        .upload-z p{color:var(--muted);font-size:.74rem;}
        .fmt-b{display:flex;gap:.35rem;justify-content:center;margin-top:.45rem;flex-wrap:wrap;}
        .fmt{padding:.16rem .5rem;background:rgba(59,130,246,.08);color:var(--blue);border-radius:5px;font-size:.67rem;font-weight:700;}
        .ats-ta{width:100%;height:95px;padding:.65rem;border:1.5px solid var(--bdr);border-radius:8px;font-size:.81rem;font-family:'DM Sans',sans-serif;resize:vertical;outline:none;margin-top:.7rem;}
        .ats-ta:focus{border-color:var(--blue);}
        .wc{font-size:.72rem;color:var(--muted);margin-top:.28rem;}
        .ats-btn{margin-top:.8rem;width:100%;padding:.82rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.88rem;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:.5rem;}
        .ats-btn:hover:not(:disabled){transform:translateY(-1px);}
        .ats-btn:disabled{opacity:.5;cursor:not-allowed;}
        .score-box{background:linear-gradient(135deg,#EFF6FF,#ECFDF5);border-radius:11px;padding:1.2rem;border:1px solid rgba(59,130,246,.12);margin-top:.8rem;}
        .score-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem;}
        .score-num{font-family:'Archivo',sans-serif;font-size:2.5rem;font-weight:900;background:linear-gradient(135deg,#3B82F6,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}
        .grade{padding:.28rem .7rem;border-radius:50px;font-size:.74rem;font-weight:700;}
        .ge{background:rgba(5,150,105,.12);color:var(--green);}
        .gg{background:rgba(59,130,246,.12);color:var(--blue);}
        .gf{background:rgba(245,158,11,.12);color:#D97706;}
        .gp{background:rgba(239,68,68,.12);color:#DC2626;}
        .score-bar{height:6px;background:var(--bdr);border-radius:50px;overflow:hidden;margin-bottom:.8rem;}
        .score-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#059669);border-radius:50px;transition:width 1.2s ease;}
        .check-grid{display:grid;grid-template-columns:1fr 1fr;gap:.42rem;}
        .check-i{display:flex;align-items:center;gap:.35rem;font-size:.74rem;}
        .cp{color:var(--green);}.cw{color:#D97706;}.cf{color:#DC2626;}
        .sugg{margin-top:.8rem;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18);border-radius:8px;padding:.7rem .9rem;}
        .sugg h4{font-size:.76rem;font-weight:700;color:#B45309;margin-bottom:.4rem;}
        .sugg li{font-size:.73rem;color:#92400E;margin-bottom:.26rem;margin-left:1rem;}
        .spin{display:flex;align-items:center;gap:.55rem;color:var(--muted);padding:2rem;justify-content:center;}
        .sp2{width:17px;height:17px;border:2.5px solid var(--bdr);border-top-color:var(--blue);border-radius:50%;animation:sp 1s linear infinite;}
        @keyframes sp{to{transform:rotate(360deg)}}
        /* AI BUILDER */
        .builder-steps{display:flex;gap:.35rem;margin-bottom:1.2rem;flex-wrap:wrap;}
        .bs{padding:.32rem .7rem;border-radius:50px;font-size:.72rem;font-weight:700;border:1.5px solid var(--bdr);background:#fff;color:var(--muted);transition:all .22s;}
        .bs.act{background:var(--blue);color:#fff;border-color:var(--blue);}
        .bs.done{background:rgba(5,150,105,.1);color:var(--green);border-color:rgba(5,150,105,.25);}
        .builder-form{display:flex;flex-direction:column;gap:.75rem;}
        .bf-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;}
        .bf{display:flex;flex-direction:column;gap:.3rem;}
        .bf label{font-size:.78rem;font-weight:600;color:#374151;}
        .bf input,.bf select,.bf textarea{width:100%;padding:.6rem .8rem;border:1.5px solid var(--bdr);border-radius:8px;font-size:.83rem;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .22s;background:#fff;}
        .bf input:focus,.bf select:focus,.bf textarea:focus{border-color:var(--blue);}
        .bf textarea{resize:vertical;min-height:70px;}
        .add-btn{padding:.42rem .9rem;background:rgba(59,130,246,.08);border:1.5px solid rgba(59,130,246,.2);border-radius:7px;font-size:.75rem;font-weight:700;color:var(--blue);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .22s;align-self:flex-start;}
        .add-btn:hover{background:rgba(59,130,246,.15);}
        .gen-btn{padding:.85rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;gap:.5rem;}
        .gen-btn:disabled{opacity:.5;cursor:not-allowed;}
        .cv-output{background:#F8FAFC;border:1px solid var(--bdr);border-radius:9px;padding:1rem;font-size:.78rem;line-height:1.8;white-space:pre-wrap;max-height:350px;overflow-y:auto;margin-top:.75rem;font-family:monospace;}
        .autofill-banner{background:rgba(5,150,105,.08);border:1px solid rgba(5,150,105,.2);border-radius:9px;padding:.7rem 1rem;font-size:.79rem;color:#047857;font-weight:600;display:flex;align-items:center;gap:.5rem;margin-top:.75rem;}
        /* JOB ENGINE */
        .eng-banner{background:linear-gradient(135deg,rgba(5,150,105,.06),rgba(59,130,246,.06));border:1px solid rgba(52,211,153,.22);border-radius:12px;padding:.95rem 1.2rem;margin-bottom:1.3rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;}
        .eb-t{font-weight:700;font-size:.87rem;margin-bottom:.1rem;}
        .eb-s{color:var(--muted);font-size:.76rem;}
        .ref-btn{padding:.46rem .95rem;background:rgba(59,130,246,.1);border:1.5px solid rgba(59,130,246,.22);border-radius:8px;color:var(--blue);font-size:.76rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;}
        .job-tabs{display:flex;gap:.45rem;margin-bottom:1.1rem;flex-wrap:wrap;}
        .jt-btn{padding:.46rem 1rem;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid var(--bdr);background:#fff;color:var(--muted);transition:all .22s;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:.38rem;}
        .jt-btn:hover{border-color:var(--blue);color:var(--blue);}
        .jt-btn.act{background:var(--navy);color:#fff;border-color:var(--navy);}
        .jt-cnt{background:rgba(59,130,246,.15);color:var(--blue);border-radius:50px;padding:.04rem .4rem;font-size:.67rem;font-weight:800;}
        .jt-btn.act .jt-cnt{background:rgba(255,255,255,.2);color:#fff;}
        .job-card{background:#fff;border:1px solid var(--bdr);border-radius:12px;margin-bottom:.8rem;overflow:hidden;transition:all .22s;}
        .job-card:hover{border-color:rgba(59,130,246,.28);box-shadow:0 4px 14px rgba(0,0,0,.06);}
        .job-card.exp{border-color:var(--blue);}
        .jc-top{padding:1rem 1.2rem;display:flex;align-items:flex-start;gap:.9rem;cursor:pointer;}
        .jc-co-ic{width:38px;height:38px;border-radius:9px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;}
        .jc-body{flex:1;min-width:0;}
        .jc-title{font-weight:700;font-size:.9rem;margin-bottom:.22rem;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;}
        .jc-meta{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;}
        .jc-co{color:var(--muted);font-size:.76rem;font-weight:600;}
        .jc-loc{color:var(--muted);font-size:.73rem;}
        .jc-sal{color:var(--green);font-size:.73rem;font-weight:700;}
        .badge{display:inline-flex;align-items:center;padding:.16rem .52rem;border-radius:50px;font-size:.68rem;font-weight:700;}
        .b-sp{background:rgba(5,150,105,.1);color:var(--green);}
        .b-out{background:rgba(139,92,246,.1);color:#7C3AED;}
        .b-in{background:rgba(245,158,11,.1);color:#D97706;}
        .b-new{background:rgba(239,68,68,.1);color:#DC2626;}
        .jc-right{display:flex;flex-direction:column;align-items:flex-end;gap:.38rem;flex-shrink:0;}
        .match-ring{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.79rem;font-family:'Archivo',sans-serif;border:2.5px solid;}
        .mh-r{color:var(--green);border-color:var(--green);background:rgba(5,150,105,.07);}
        .mm-r{color:var(--blue);border-color:var(--blue);background:rgba(59,130,246,.07);}
        .jc-act{display:flex;gap:.42rem;}
        .apply-btn{padding:.35rem .85rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:7px;font-size:.73rem;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .22s;}
        .apply-btn:disabled{opacity:.5;cursor:not-allowed;}
        .apply-btn.done{background:linear-gradient(135deg,#059669,#047857);}
        .exp-btn{padding:.35rem .65rem;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);border-radius:7px;font-size:.73rem;font-weight:700;cursor:pointer;color:var(--blue);font-family:'DM Sans',sans-serif;}
        /* JD PANEL */
        .jd-panel{border-top:1px solid var(--bdr);padding:1.2rem;background:#FAFBFF;animation:fdIn .22s ease;}
        @keyframes fdIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        .jd-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;margin-bottom:1rem;}
        .jd-s{background:#fff;border:1px solid var(--bdr);border-radius:9px;padding:.65rem .8rem;text-align:center;}
        .jd-sv{font-weight:800;font-size:.87rem;}
        .jd-sl{color:var(--muted);font-size:.66rem;margin-top:.12rem;}
        .jd-h{font-weight:700;font-size:.81rem;margin-bottom:.55rem;}
        .jd-txt{font-size:.8rem;color:#374151;line-height:1.75;white-space:pre-line;}
        .jd-skills{display:flex;flex-wrap:wrap;gap:.32rem;margin-top:.45rem;}
        .jd-sk{padding:.2rem .55rem;background:rgba(59,130,246,.08);border-radius:5px;font-size:.7rem;font-weight:700;color:var(--blue);}
        .jd-footer{display:flex;gap:.65rem;margin-top:1rem;flex-wrap:wrap;}
        .jd-apply{padding:.62rem 1.3rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.84rem;}
        .jd-apply:disabled{opacity:.5;}
        .jd-ext{padding:.62rem 1.1rem;background:#fff;border:1.5px solid var(--bdr);border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.84rem;}
        /* PROFILE */
        .pg{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;}
        .pg-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;}
        .fl{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.8rem;}
        .fl label{font-size:.78rem;font-weight:600;color:#374151;}
        .fi{width:100%;padding:.62rem .82rem;border:1.5px solid var(--bdr);border-radius:8px;font-size:.83rem;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .22s;background:#fff;}
        .fi:focus{border-color:var(--blue);}
        .save-btn{margin-top:.9rem;width:100%;padding:.78rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.88rem;transition:all .22s;}
        .save-btn:hover:not(:disabled){transform:translateY(-1px);}
        .save-btn:disabled{opacity:.6;cursor:not-allowed;}
        .saved-b{display:inline-flex;align-items:center;gap:.38rem;background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.2);color:var(--green);padding:.38rem .8rem;border-radius:7px;font-size:.78rem;font-weight:700;margin-top:.65rem;}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:.55rem 0;border-bottom:1px solid var(--bdr);}
        .toggle-row:last-child{border-bottom:none;}
        .tl{font-size:.83rem;font-weight:600;}
        .ts{font-size:.72rem;color:var(--muted);}
        .toggle{width:40px;height:22px;background:#E2E8F0;border-radius:50px;position:relative;cursor:pointer;transition:background .22s;border:none;flex-shrink:0;}
        .toggle.on{background:var(--green);}
        .toggle::after{content:'';position:absolute;width:16px;height:16px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform .22s;box-shadow:0 1px 3px rgba(0,0,0,.15);}
        .toggle.on::after{transform:translateX(18px);}
        .empty{text-align:center;padding:3rem 1.5rem;color:var(--muted);}
        .empty-ico{font-size:2.8rem;margin-bottom:.9rem;}
        .empty h3{font-family:'Archivo',sans-serif;font-size:1.02rem;font-weight:700;color:var(--navy);margin-bottom:.38rem;}
        .empty p{font-size:.82rem;line-height:1.6;}
        @media(max-width:1200px){.ov-grid{grid-template-columns:1fr 1fr;}.chart-row{grid-template-columns:1fr;}.jd-grid{grid-template-columns:1fr 1fr;}.pg-3{grid-template-columns:1fr 1fr;}}
        @media(max-width:900px){.sb{display:none;}.main{margin-left:0;padding:1.25rem;}.two-col,.pg{grid-template-columns:1fr;}}
      `}</style>

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <nav className="sb">
          <div className="sb-logo"><div className="sb-ic">S</div><div className="sb-nm">Sponsor<span>Path</span></div></div>
          <div style={{flex:1}}>
            <div className="sb-sect">Main</div>
            {([['overview','📊','Overview'],['applications','📋','Applications'],['ats','📄','Resume & ATS'],['jobs','🤖','Job Engine'],['profile','👤','My Profile']] as const).map(([id,ic,lb])=>(
              <div key={id} className={`sb-item${tab===id?' act':''}`} onClick={()=>setTab(id)}><span className="ico">{ic}</span>{lb}</div>
            ))}
            <div className="sb-sect">Account</div>
            {([['settings','⚙️','Settings'],['billing','💳','Billing']] as const).map(([id,ic,lb])=>(
              <div key={id} className={`sb-item${tab===id?' act':''}`} onClick={()=>setTab(id)}><span className="ico">{ic}</span>{lb}</div>
            ))}
          </div>
          <div>
            <div className="sb-eng"><p><span className="ep"/>SponsorPath Engine</p><small>{prefs?.engine_active!==false?'Actively searching':'Engine paused'}</small></div>
            <div className="sb-user"><div className="sb-av">{initials}</div><div style={{overflow:'hidden'}}><div className="sb-un">{user?.name}</div><div className="sb-ue">{user?.email}</div></div></div>
            <button className="sb-so" onClick={handleSignOut}>Sign Out</button>
          </div>
        </nav>

        <main className="main">
          <div className="topbar">
            <h1>{({overview:'Dashboard Overview',applications:'My Applications',ats:'Resume & ATS',jobs:'Job Engine',profile:'My Profile',settings:'Settings',billing:'Billing'} as any)[tab]}</h1>
            <button className="up-btn">⚡ Upgrade to Pro</button>
          </div>

          {/* ══ OVERVIEW ══ */}
          {tab==='overview'&&(isNewUser ? (
            <div className="ob-wrap">
              <h2>Welcome to SponsorPath 👋</h2>
              <p className="ob-sub">3 steps to having the engine apply to UK sponsor-verified jobs for you — automatically.</p>
              <div className="ob-steps">
                {[
                  {n:'1',t:'Upload your CV & get ATS score',d:'Extracts your profile automatically. PDF and DOCX supported.',done:!!profile?.ats_score,tab:'ats'},
                  {n:'2',t:'Run the Job Engine',d:'Auto-searches sponsored roles, contract (Outside IR35) and contract (Inside IR35).',done:apps.length>0,tab:'jobs'},
                  {n:'3',t:'Complete your profile',d:'Add visa expiry, salary expectations, UK address so the engine can apply on your behalf.',done:!!profile?.profile_complete,tab:'profile'},
                ].map(s=>(
                  <div key={s.n} className={`ob-step${s.done?' done':''}`} onClick={()=>setTab(s.tab as Tab)}>
                    <div className="ob-n">{s.done?'✓':s.n}</div>
                    <div><div className="ob-t">{s.t}</div><div className="ob-d">{s.d}</div></div>
                    <div style={{marginLeft:'auto',color:'var(--muted)'}}>{s.done?'✅':'→'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="ov-grid">
                {[
                  {label:'Applications Sent',val:totalApps,badge:`+${last7.reduce((a,b)=>a+b,0)} this week`,sub:'Total auto-applied',color:'rgba(59,130,246,.15)',sparkColor:'#60A5FA',data:last7},
                  {label:'Hours Saved',val:`${hoursSaved.toFixed(0)}h`,badge:'vs manual',sub:`${totalApps} CVs tailored`,color:'rgba(52,211,153,.12)',sparkColor:'#34D399',data:last7.map(v=>v*0.75)},
                  {label:'Response Rate',val:`${replyRate}%`,badge:`${totalReplies} replies`,sub:`${totalInt} interview${totalInt!==1?'s':''}`,color:'rgba(139,92,246,.12)',sparkColor:'#A78BFA',data:last7.map((_,i)=>i)},
                ].map(k=>(
                  <div key={k.label} className="kpi" style={{'--kpi-clr':k.color} as any}>
                    <div className="kpi-top"><span className="kpi-label">{k.label}</span><span className="kpi-badge">{k.badge}</span></div>
                    <div className="kpi-val">{k.val}</div>
                    <div className="kpi-sub">{k.sub}</div>
                    <div className="kpi-spark"><Sparkline data={k.data} color={k.sparkColor}/></div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="chart-row">
                <div className="chart-card">
                  <h4>Applications Activity</h4>
                  <div className="chart-sub">Last 7 days — daily applications sent</div>
                  <div className="bar-chart">
                    {last7.map((v,i)=>{
                      const max = Math.max(...last7,1)
                      return <div key={i} className="bar" style={{height:`${Math.max((v/max)*100,6)}%`}} title={`${v} apps`}/>
                    })}
                  </div>
                  <div className="bar-labels">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><span key={d} className="bar-lbl">{d}</span>)}
                  </div>
                </div>
                <div className="chart-card">
                  <h4>By Job Type</h4>
                  <div className="chart-sub">Application breakdown</div>
                  {donutSegs.length > 0 ? (
                    <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                      <Donut segments={donutSegs}/>
                      <div style={{display:'flex',flexDirection:'column',gap:'.4rem'}}>
                        {donutSegs.map(s=>(
                          <div key={s.label} style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'.74rem'}}>
                            <div style={{width:9,height:9,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                            <span style={{color:'var(--muted)'}}>{s.label}</span>
                            <span style={{fontWeight:700,marginLeft:'auto'}}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div style={{textAlign:'center',padding:'1.5rem',color:'var(--muted)',fontSize:'.8rem'}}>No data yet</div>}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="activity-card">
                <h4>Engine Activity</h4>
                {apps.length===0 ? (
                  <div style={{color:'var(--muted)',fontSize:'.82rem',padding:'.5rem 0'}}>No activity yet. Run the Job Engine to start.</div>
                ) : apps.slice(0,5).map((a:any,i:number)=>(
                  <div key={i} className="act-row">
                    <div className="act-ic" style={{background:SC[a.status]+'18'}}>{a.status==='Interview'?'🗓️':a.status==='Viewed'?'👀':a.status==='Offered'?'🎉':'📤'}</div>
                    <div><div className="act-t">{a.job_title} — {a.company}</div><div className="act-d">📍 {a.location} · Match: {a.match_score}%</div></div>
                    <span className="st" style={{background:SC[a.status]+'18',color:SC[a.status]}}>{a.status}</span>
                    <span className="act-time">{new Date(a.applied_at).toLocaleDateString('en-GB')}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="ch"><h3>Recent Applications</h3><button className="ch-act" onClick={()=>setTab('applications')}>See all →</button></div>
                <table><thead><tr><th>Job</th><th>Match</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{apps.slice(0,5).map((j:any,i:number)=>(
                  <tr key={i}>
                    <td><div className="jtn">{j.job_title}</div><div className="jcm">🏢 {j.company} · 📍 {j.location}</div></td>
                    <td><span className={`mp ${(j.match_score||0)>=80?'mh':'mm'}`}>{j.match_score||0}%</span></td>
                    <td><span className="st" style={{background:`${SC[j.status]||'#64748B'}18`,color:SC[j.status]||'#64748B'}}>{j.status}</span></td>
                    <td style={{color:'var(--muted)',fontSize:'.72rem'}}>{j.applied_at?new Date(j.applied_at).toLocaleDateString('en-GB'):'-'}</td>
                  </tr>
                ))}</tbody></table>
              </div>
            </>
          ))}

          {/* ══ APPLICATIONS ══ */}
          {tab==='applications'&&(
            <div className="card">
              <div className="ch"><h3>All Applications ({apps.length})</h3></div>
              {apps.length===0?<div className="empty"><div className="empty-ico">📭</div><h3>No applications yet</h3><p>Run the Job Engine to start.</p></div>
              :<table><thead><tr><th>Job</th><th>Company</th><th>Match</th><th>Sponsor</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{apps.map((j:any,i:number)=>(
                <tr key={i}>
                  <td><div className="jtn">{j.job_title}</div></td>
                  <td style={{color:'var(--muted)'}}>{j.company}</td>
                  <td><span className={`mp ${(j.match_score||0)>=80?'mh':'mm'}`}>{j.match_score||0}%</span></td>
                  <td><span style={{color:'#059669',fontWeight:700,fontSize:'.76rem'}}>🇬🇧 ✓</span></td>
                  <td><span className="st" style={{background:`${SC[j.status]||'#64748B'}18`,color:SC[j.status]||'#64748B'}}>{j.status}</span></td>
                  <td style={{color:'var(--muted)',fontSize:'.72rem'}}>{j.applied_at?new Date(j.applied_at).toLocaleDateString('en-GB'):'-'}</td>
                </tr>
              ))}</tbody></table>}
            </div>
          )}

          {/* ══ ATS ══ */}
          {tab==='ats'&&(
            <div className="two-col">
              <div className="tool-card">
                <h3>CV Upload & ATS Check</h3>
                <p className="tc-desc">Upload your CV or build one with AI. The engine scores it, extracts your profile, and auto-fills your details.</p>
                <div className="mode-tabs">
                  <div className={`mt-btn${atsMode==='upload'?' act':''}`} onClick={()=>setAtsMode('upload')}>📤 Upload CV</div>
                  <div className={`mt-btn${atsMode==='builder'?' act':''}`} onClick={()=>setAtsMode('builder')}>🤖 AI CV Builder</div>
                </div>

                {atsMode==='upload'&&(
                  <>
                    <div className={`upload-z${fileName?' ok':''}`} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}}>
                      <div className="ui">{fileLoading?'⏳':fileName?'✅':'📤'}</div>
                      <h4>{fileLoading?'Reading...':fileName?'File loaded':'Drop CV or click to upload'}</h4>
                      <p>{fileName||'PDF, DOCX, DOC, TXT'}</p>
                      <div className="fmt-b">{['PDF','DOCX','DOC','TXT'].map(f=><span key={f} className="fmt">{f}</span>)}</div>
                      {!scriptsOk&&<p style={{color:'#D97706',marginTop:'.35rem',fontSize:'.7rem'}}>⏳ Loading libraries...</p>}
                      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
                    </div>
                    <div style={{marginTop:'.55rem',color:'var(--muted)',fontSize:'.72rem',textAlign:'center'}}>or paste below</div>
                    <textarea className="ats-ta" placeholder="Paste CV text..." value={resumeText} onChange={e=>setResumeText(e.target.value)}/>
                    {resumeText&&<div className="wc">{resumeText.split(/\s+/).filter(Boolean).length} words</div>}
                    <button className="ats-btn" onClick={runATS} disabled={!resumeText.trim()||atsLoading||!user}>
                      {atsLoading?<><div className="sp2"/>Analysing & auto-filling profile...</>:<>🎯 Check ATS Score & Build Profile</>}
                    </button>
                  </>
                )}

                {atsMode==='builder'&&(
                  <>
                    <div className="builder-steps">
                      {(['personal','summary','experience','education','skills'] as BuilderStep[]).map((s,i)=>(
                        <div key={s} className={`bs${builderStep===s?' act':(['personal','summary','experience','education','skills'].indexOf(builderStep)>i?' done':'')}`}
                          onClick={()=>(['generating','done'] as BuilderStep[]).includes(builderStep)?null:setBuilderStep(s)}>
                          {s.charAt(0).toUpperCase()+s.slice(1)}
                        </div>
                      ))}
                    </div>

                    {builderStep==='personal'&&(
                      <div className="builder-form">
                        <div className="bf-row">
                          <div className="bf"><label>Full Name *</label><input value={builderData.full_name} onChange={e=>setBuilderData((p:any)=>({...p,full_name:e.target.value}))} placeholder="John Smith"/></div>
                          <div className="bf"><label>Target Role *</label><input value={builderData.target_role} onChange={e=>setBuilderData((p:any)=>({...p,target_role:e.target.value}))} placeholder="DevOps Engineer"/></div>
                        </div>
                        <div className="bf-row">
                          <div className="bf"><label>Email *</label><input value={builderData.email} onChange={e=>setBuilderData((p:any)=>({...p,email:e.target.value}))} placeholder="john@email.com"/></div>
                          <div className="bf"><label>Phone</label><input value={builderData.phone} onChange={e=>setBuilderData((p:any)=>({...p,phone:e.target.value}))} placeholder="+44 7700 000000"/></div>
                        </div>
                        <div className="bf-row">
                          <div className="bf"><label>UK Location</label><input value={builderData.location} onChange={e=>setBuilderData((p:any)=>({...p,location:e.target.value}))} placeholder="London, UK"/></div>
                          <div className="bf"><label>LinkedIn URL</label><input value={builderData.linkedin} onChange={e=>setBuilderData((p:any)=>({...p,linkedin:e.target.value}))} placeholder="linkedin.com/in/..."/></div>
                        </div>
                        <div className="bf"><label>Visa Status</label>
                          <select value={builderData.visa_status} onChange={e=>setBuilderData((p:any)=>({...p,visa_status:e.target.value}))}>
                            <option value="">Select...</option>
                            {['Graduate Visa (PSW)','Skilled Worker Visa','Student Visa','British Citizen / ILR','EU Settled Status'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <button className="ats-btn" onClick={()=>setBuilderStep('summary')} disabled={!builderData.full_name||!builderData.email}>Next: Summary →</button>
                      </div>
                    )}
                    {builderStep==='summary'&&(
                      <div className="builder-form">
                        <div className="bf"><label>Professional Summary — describe yourself in 3–4 sentences</label><textarea value={builderData.summary} onChange={e=>setBuilderData((p:any)=>({...p,summary:e.target.value}))} placeholder="Graduate Software Engineer with 2 years experience in Python and cloud infrastructure..."/></div>
                        <button className="ats-btn" onClick={()=>setBuilderStep('experience')}>Next: Experience →</button>
                        <button className="add-btn" onClick={()=>setBuilderStep('personal')} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}>← Back</button>
                      </div>
                    )}
                    {builderStep==='experience'&&(
                      <div className="builder-form">
                        {builderData.experiences.map((ex:any,i:number)=>(
                          <div key={i} style={{background:'#F8FAFC',borderRadius:9,padding:'.85rem',border:'1px solid var(--bdr)',marginBottom:'.65rem'}}>
                            <div style={{fontWeight:700,fontSize:'.78rem',marginBottom:'.5rem'}}>Experience {i+1}</div>
                            <div className="bf-row">
                              <div className="bf"><label>Job Title</label><input value={ex.title} onChange={e=>setBuilderData((p:any)=>({...p,experiences:p.experiences.map((x:any,j:number)=>j===i?{...x,title:e.target.value}:x)}))} placeholder="Software Engineer"/></div>
                              <div className="bf"><label>Company</label><input value={ex.company} onChange={e=>setBuilderData((p:any)=>({...p,experiences:p.experiences.map((x:any,j:number)=>j===i?{...x,company:e.target.value}:x)}))} placeholder="Revolut"/></div>
                            </div>
                            <div className="bf"><label>Duration</label><input value={ex.duration} onChange={e=>setBuilderData((p:any)=>({...p,experiences:p.experiences.map((x:any,j:number)=>j===i?{...x,duration:e.target.value}:x)}))} placeholder="Jan 2022 – Present"/></div>
                            <div className="bf"><label>Key achievements (one per line)</label><textarea value={ex.bullets} onChange={e=>setBuilderData((p:any)=>({...p,experiences:p.experiences.map((x:any,j:number)=>j===i?{...x,bullets:e.target.value}:x)}))} placeholder="Led migration of 50+ microservices to Kubernetes, reducing costs by 40%&#10;Built CI/CD pipelines processing 200+ deployments per day"/></div>
                          </div>
                        ))}
                        <button className="add-btn" onClick={()=>setBuilderData((p:any)=>({...p,experiences:[...p.experiences,{title:'',company:'',duration:'',bullets:''}]}))}>+ Add another role</button>
                        <button className="ats-btn" onClick={()=>setBuilderStep('education')}>Next: Education →</button>
                      </div>
                    )}
                    {builderStep==='education'&&(
                      <div className="builder-form">
                        {builderData.education.map((ed:any,i:number)=>(
                          <div key={i} style={{background:'#F8FAFC',borderRadius:9,padding:'.85rem',border:'1px solid var(--bdr)',marginBottom:'.65rem'}}>
                            <div className="bf-row">
                              <div className="bf"><label>Degree</label><input value={ed.degree} onChange={e=>setBuilderData((p:any)=>({...p,education:p.education.map((x:any,j:number)=>j===i?{...x,degree:e.target.value}:x)}))} placeholder="BSc Computer Science"/></div>
                              <div className="bf"><label>Institution</label><input value={ed.institution} onChange={e=>setBuilderData((p:any)=>({...p,education:p.education.map((x:any,j:number)=>j===i?{...x,institution:e.target.value}:x)}))} placeholder="University of London"/></div>
                            </div>
                            <div className="bf"><label>Year</label><input value={ed.year} onChange={e=>setBuilderData((p:any)=>({...p,education:p.education.map((x:any,j:number)=>j===i?{...x,year:e.target.value}:x)}))} placeholder="2023"/></div>
                          </div>
                        ))}
                        <button className="add-btn" onClick={()=>setBuilderData((p:any)=>({...p,education:[...p.education,{degree:'',institution:'',year:''}]}))}>+ Add another</button>
                        <button className="ats-btn" onClick={()=>setBuilderStep('skills')}>Next: Skills →</button>
                      </div>
                    )}
                    {builderStep==='skills'&&(
                      <div className="builder-form">
                        <div className="bf"><label>Technical Skills (comma separated)</label><input value={builderData.skills} onChange={e=>setBuilderData((p:any)=>({...p,skills:e.target.value}))} placeholder="Python, AWS, Kubernetes, React, SQL, Docker, Terraform"/></div>
                        <div className="bf"><label>Certifications (optional)</label><input value={builderData.certifications} onChange={e=>setBuilderData((p:any)=>({...p,certifications:e.target.value}))} placeholder="AWS Solutions Architect, CKA, Google Cloud Professional"/></div>
                        <button className="gen-btn" onClick={()=>{setBuilderStep('generating');generateCV()}} disabled={cvGenerating||!builderData.full_name||!builderData.target_role}>
                          {cvGenerating?<><div className="sp2"/>AI is writing your CV...</>:<>✨ Generate ATS-Optimised CV</>}
                        </button>
                      </div>
                    )}
                    {(builderStep==='generating'||builderStep==='done')&&(
                      <div>
                        {cvGenerating&&<div className="spin"><div className="sp2"/><span>AI is crafting your professional CV...</span></div>}
                        {generatedCV&&(
                          <>
                            <div style={{fontWeight:700,fontSize:'.84rem',marginBottom:'.5rem'}}>✅ Your ATS-Optimised CV</div>
                            <div className="cv-output">{generatedCV}</div>
                            <div className="autofill-banner">✅ Profile auto-filled from your CV builder data</div>
                            <button className="ats-btn" style={{marginTop:'.75rem'}} onClick={runATS} disabled={!resumeText.trim()||atsLoading}>
                              🎯 Check ATS Score
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ATS Score Panel */}
              <div className="tool-card">
                <h3>🎯 ATS Score</h3>
                <p className="tc-desc">Scores above 80 mean you're ATS-ready. Below 65 and most companies' software filters your CV before a human sees it.</p>
                {!atsResult&&!atsLoading&&(profile?.ats_score?(
                  <div className="score-box">
                    <div className="score-top">
                      <div><div className="score-num">{profile.ats_score}<span style={{fontSize:'1.2rem'}}>/100</span></div><div style={{color:'var(--muted)',fontSize:'.74rem',marginTop:'.12rem'}}>Last saved score</div></div>
                      <span className={`grade ${profile.ats_grade==='Excellent'?'ge':profile.ats_grade==='Good'?'gg':profile.ats_grade==='Fair'?'gf':'gp'}`}>{profile.ats_grade}</span>
                    </div>
                    <div className="score-bar"><div className="score-fill" style={{width:`${profile.ats_score}%`}}/></div>
                    <p style={{color:'var(--muted)',fontSize:'.78rem'}}>Upload a new CV to re-score.</p>
                  </div>
                ):<div className="empty"><div className="empty-ico">📋</div><h3>No score yet</h3><p>Upload your CV or use the AI Builder to get your ATS score.</p></div>)}
                {atsLoading&&<div className="spin"><div className="sp2"/><span>Analysing CV + auto-filling profile...</span></div>}
                {atsResult&&(
                  <>
                    <div className="score-box">
                      <div className="score-top">
                        <div><div className="score-num">{atsResult.score}<span style={{fontSize:'1.2rem'}}>/100</span></div><div style={{color:'var(--muted)',fontSize:'.74rem',marginTop:'.12rem'}}>ATS Compatibility</div></div>
                        <span className={`grade ${atsResult.grade==='Excellent'?'ge':atsResult.grade==='Good'?'gg':atsResult.grade==='Fair'?'gf':'gp'}`}>{atsResult.grade}</span>
                      </div>
                      <div className="score-bar"><div className="score-fill" style={{width:`${atsResult.score}%`}}/></div>
                      <div className="check-grid">{atsResult.checks.map((c,i)=>(
                        <div key={i} className="check-i"><span className={c.status==='pass'?'cp':c.status==='warn'?'cw':'cf'}>{c.status==='pass'?'✓':c.status==='warn'?'⚠':'✗'}</span><span style={{fontSize:'.74rem'}}>{c.label}</span></div>
                      ))}</div>
                    </div>
                    {atsResult.suggestions.length>0&&<div className="sugg"><h4>💡 Fix these:</h4><ul>{atsResult.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
                    <div className="autofill-banner">✅ Profile auto-filled — check the Profile tab to review extracted data.</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══ JOBS ══ */}
          {tab==='jobs'&&(
            <>
              <div className="eng-banner">
                <div>
                  <div className="eb-t"><span className="ep"/>SponsorPath Engine — Auto Mode</div>
                  <div className="eb-s">Searching for: {profile?.target_streams?.join(', ')||'complete your profile'} · {Array.isArray(profile?.preferred_locations)?profile.preferred_locations[0]:profile?.preferred_locations||'London'} · {profile?.visa_status||'add visa status'}</div>
                </div>
                <button className="ref-btn" onClick={runEngine} disabled={jobsLoading}>{jobsLoading?'Searching...':'🔄 Refresh'}</button>
              </div>
              <div className="job-tabs">
                {([['sponsored','🇬🇧 Sponsored',sponsoredJobs.length],['outside_ir35','📋 Outside IR35',outsideIR35Jobs.length],['inside_ir35','📋 Inside IR35',insideIR35Jobs.length]] as const).map(([id,lb,cnt])=>(
                  <button key={id} className={`jt-btn${activeGroup===id?' act':''}`} onClick={()=>setActiveGroup(id)}>{lb}<span className="jt-cnt">{cnt}</span></button>
                ))}
              </div>
              {jobsLoading&&<div className="spin"><div className="sp2"/><span>Engine scanning...</span></div>}
              {!jobsLoading&&jobs.length===0&&<div className="empty"><div className="empty-ico">🤖</div><h3>Engine ready</h3><p>{profile?.target_streams?.length?'Click Refresh to search.':'Complete your profile so the engine knows what to search.'}</p></div>}
              {!jobsLoading&&jobs.length>0&&(()=>{
                const list = activeGroup==='sponsored'?sponsoredJobs:activeGroup==='outside_ir35'?outsideIR35Jobs:insideIR35Jobs
                if (!list.length) return <div className="empty"><div className="empty-ico">🔍</div><h3>No {activeGroup.replace(/_/g,' ')} roles found</h3><p>Try refreshing.</p></div>
                return list.map((job:any,idx:number)=>{
                  const jid = job.external_id||String(idx)
                  const isExp = expandedJob===jid
                  const applied = appliedIds.has(jid)
                  const score = job.match_score||0
                  return (
                    <div key={jid} className={`job-card${isExp?' exp':''}`}>
                      <div className="jc-top" onClick={()=>setExpandedJob(isExp?null:jid)}>
                        <div className="jc-co-ic">🏢</div>
                        <div className="jc-body">
                          <div className="jc-title">
                            {job.job_title}
                            {activeGroup==='sponsored'&&<span className="badge b-sp">🇬🇧 Sponsored</span>}
                            {activeGroup==='outside_ir35'&&<span className="badge b-out">Outside IR35</span>}
                            {activeGroup==='inside_ir35'&&<span className="badge b-in">Inside IR35</span>}
                            {(job.posted_days_ago||7)<=2&&<span className="badge b-new">New</span>}
                          </div>
                          <div className="jc-meta">
                            <span className="jc-co">🏢 {job.company}</span>
                            <span className="jc-loc">📍 {job.location}</span>
                            {job.salary_range&&<span className="jc-sal">💰 {job.salary_range}</span>}
                            {job.job_board&&<span style={{color:'var(--muted)',fontSize:'.7rem'}}>via {job.job_board}</span>}
                          </div>
                        </div>
                        <div className="jc-right">
                          <div className={`match-ring ${score>=80?'mh-r':'mm-r'}`}>{score}%</div>
                          <div className="jc-act">
                            <span className="exp-btn">{isExp?'▲':'▼ JD'}</span>
                            <button className={`apply-btn${applied?' done':''}`} disabled={!!applyingId||applied} onClick={e=>{e.stopPropagation();applyJob(job)}}>
                              {applied?'✓ Applied':applyingId===jid?'...':'Apply'}
                            </button>
                          </div>
                        </div>
                      </div>
                      {isExp&&(
                        <div className="jd-panel">
                          <div className="jd-grid">
                            {[{v:job.salary_range||'Competitive',l:'Salary'},{v:activeGroup==='sponsored'?'Permanent':'Contract',l:'Type'},{v:activeGroup==='outside_ir35'?'Outside IR35':activeGroup==='inside_ir35'?'Inside IR35':'N/A',l:'IR35'},{v:job.job_board||'Direct',l:'Source'}].map(s=>(
                              <div key={s.l} className="jd-s"><div className="jd-sv">{s.v}</div><div className="jd-sl">{s.l}</div></div>
                            ))}
                          </div>
                          {job.description&&(<><div className="jd-h">Job Description</div><div className="jd-txt">{job.description.length>900?job.description.slice(0,900)+'...':job.description}</div></>)}
                          {job.requirements?.length>0&&(<><div className="jd-h" style={{marginTop:'.8rem'}}>Requirements</div><div className="jd-skills">{(Array.isArray(job.requirements)?job.requirements:job.requirements.split(/[,\n]/).filter(Boolean)).slice(0,12).map((r:string,i:number)=><span key={i} className="jd-sk">{r.trim()}</span>)}</div></>)}
                          <div className="jd-footer">
                            <button className={`jd-apply${applied?' done':''}`} disabled={!!applyingId||applied} onClick={()=>applyJob(job)}>{applied?'✓ Applied':'Apply Now'}</button>
                            {job.job_url&&<a href={job.job_url} target="_blank" rel="noreferrer"><button className="jd-ext">View Posting ↗</button></a>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </>
          )}

          {/* ══ PROFILE ══ */}
          {tab==='profile'&&(
            <div className="pg">
              <div className="tool-card">
                <h3>👤 Master Profile</h3>
                <p className="tc-desc">Used by the engine for every application. Extracted automatically from your CV when you upload one.</p>
                {[{k:'full_name',l:'Full Name',t:'text'},{k:'email',l:'Email',t:'email'},{k:'phone',l:'Phone',t:'text',ph:'+44...'},{k:'linkedin_url',l:'LinkedIn URL',t:'text',ph:'https://linkedin.com/in/...'},{k:'current_role',l:'Current Job Title',t:'text'}].map(f=>(
                  <div key={f.k} className="fl"><label>{f.l}</label><input className="fi" type={f.t} placeholder={(f as any).ph||''} value={ep[f.k]||''} onChange={e=>setEp((p:any)=>({...p,[f.k]:e.target.value}))}/></div>
                ))}
                <div className="fl"><label>Visa Status</label>
                  <select className="fi" value={ep.visa_status||''} onChange={e=>setEp((p:any)=>({...p,visa_status:e.target.value}))}>
                    <option value="">Select...</option>
                    {['Graduate Visa (PSW)','Graduate Visa (PSW) – Dependent','Skilled Worker Visa','Skilled Worker Visa – Dependent','Student Visa','British Citizen / ILR','EU Settled Status'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="pg-3">
                  <div className="fl"><label>Visa Expiry Date</label><input className="fi" type="date" value={ep.visa_expiry||''} onChange={e=>setEp((p:any)=>({...p,visa_expiry:e.target.value}))}/></div>
                  <div className="fl"><label>Years of Experience</label>
                    <select className="fi" value={ep.years_experience||''} onChange={e=>setEp((p:any)=>({...p,years_experience:e.target.value}))}>
                      <option value="">Select...</option>
                      {['Less than 1 year','1–2 years','2–3 years','3–5 years','5–7 years','7–10 years','10+ years'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="fl"><label>Salary Type</label>
                    <select className="fi" value={ep.salary_type||'annual'} onChange={e=>setEp((p:any)=>({...p,salary_type:e.target.value}))}>
                      <option value="annual">Annual (£/year)</option>
                      <option value="day">Day Rate (£/day)</option>
                    </select>
                  </div>
                </div>
                <div className="pg-3">
                  <div className="fl"><label>Min. Salary {ep.salary_type==='day'?'(£/day)':'(£/year)'}</label><input className="fi" type="number" value={ep.salary_min||''} onChange={e=>setEp((p:any)=>({...p,salary_min:e.target.value}))} placeholder={ep.salary_type==='day'?'400':'50000'}/></div>
                  <div className="fl"><label>Max. Salary {ep.salary_type==='day'?'(£/day)':'(£/year)'}</label><input className="fi" type="number" value={ep.salary_max||''} onChange={e=>setEp((p:any)=>({...p,salary_max:e.target.value}))} placeholder={ep.salary_type==='day'?'700':'80000'}/></div>
                  <div className="fl"><label>UK Postcode</label><input className="fi" value={ep.uk_postcode||''} onChange={e=>setEp((p:any)=>({...p,uk_postcode:e.target.value}))} placeholder="E1 6AN"/></div>
                </div>
                <div className="fl"><label>Full UK Address</label><input className="fi" value={ep.uk_address||''} onChange={e=>setEp((p:any)=>({...p,uk_address:e.target.value}))} placeholder="123 High Street, London E1 6AN"/></div>
                <div className="fl"><label>Preferred Locations</label><input className="fi" value={ep.preferred_locations||''} onChange={e=>setEp((p:any)=>({...p,preferred_locations:e.target.value}))} placeholder="London, Manchester, Remote"/></div>
                <button className="save-btn" onClick={saveProfile} disabled={savingProfile}>{savingProfile?'Saving...':'Save Profile'}</button>
                {profileSaved&&<div className="saved-b">✅ Saved — engine will use these preferences</div>}
              </div>
              <div className="tool-card">
                <h3>⚙️ Engine Preferences</h3>
                <p className="tc-desc">Control how the engine searches and applies for you.</p>
                {[{l:'Auto-Submit Applications',d:'Engine applies without asking',k:'auto_submit'},{l:'Email Alerts',d:'Get emailed when applications are sent',k:'email_alerts'},{l:'Engine Active',d:'Pause to stop all automatic applications',k:'engine_active'}].map(t=>(
                  <div key={t.k} className="toggle-row">
                    <div><div className="tl">{t.l}</div><div className="ts">{t.d}</div></div>
                    <button className={`toggle${prefs?.[t.k]?' on':''}`} onClick={()=>setPrefs((p:any)=>({...(p||{}),[t.k]:!p?.[t.k]}))}/>
                  </div>
                ))}
                <div style={{height:'.85rem'}}/>
                {[{k:'max_apps_per_day',l:'Max Applications / Day',opts:[5,10,15,20,30],fmt:(n:number)=>`${n} per day`},{k:'min_match_score',l:'Minimum Match Score',opts:[60,65,70,75,80,85],fmt:(n:number)=>`${n}%+`}].map(f=>(
                  <div key={f.k} className="fl"><label>{f.l}</label>
                    <select className="fi" value={prefs?.[f.k]||f.opts[1]} onChange={e=>setPrefs((p:any)=>({...(p||{}),[f.k]:+e.target.value}))}>
                      {f.opts.map(n=><option key={n} value={n}>{f.fmt(n)}</option>)}
                    </select>
                  </div>
                ))}
                <button className="save-btn" onClick={async()=>{setPrefsSaving(true);await saveEnginePrefs(user!.id,prefs);setPrefsSaving(false)}} disabled={prefsSaving}>{prefsSaving?'Saving...':'Save Preferences'}</button>
              </div>
            </div>
          )}

          {/* ══ SETTINGS ══ */}
          {tab==='settings'&&(
            <div className="tool-card" style={{maxWidth:540}}>
              <h3>⚙️ Account Settings</h3>
              <p className="tc-desc" style={{marginBottom:'1.2rem'}}>Manage your account.</p>
              {[{l:'Email',v:user?.email||'—'},{l:'Plan',v:'Starter (Free)'},{l:'Member Since',v:new Date().toLocaleDateString('en-GB')}].map(r=>(
                <div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'.62rem 0',borderBottom:'1px solid var(--bdr)',fontSize:'.84rem'}}>
                  <span style={{color:'var(--muted)',fontWeight:600}}>{r.l}</span><span style={{fontWeight:700}}>{r.v}</span>
                </div>
              ))}
              <button className="save-btn" style={{marginTop:'1.2rem'}} onClick={handleSignOut}>Sign Out</button>
            </div>
          )}

          {/* ══ BILLING ══ */}
          {tab==='billing'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.4rem',maxWidth:800}}>
              {[{n:'Starter',p:'Free',d:'Get started',f:['5 applications/month','Basic ATS check','UK sponsor check'],c:'#64748B',act:true},
                {n:'Pro',p:'£29/mo',d:'Full automation',f:['Unlimited applications','PDF + DOCX parsing','AI CV Builder','CV tailored per job','IR35 filtering','Email notifications'],c:'#3B82F6',act:false}].map(plan=>(
                <div key={plan.n} className="tool-card" style={{border:plan.act?'2px solid var(--green)':'1px solid var(--bdr)'}}>
                  {plan.act&&<div style={{background:'rgba(5,150,105,.1)',color:'var(--green)',borderRadius:50,padding:'.2rem .68rem',fontSize:'.71rem',fontWeight:700,display:'inline-block',marginBottom:'.7rem'}}>Current Plan</div>}
                  <h3>{plan.n}</h3><p className="tc-desc">{plan.d}</p>
                  <div style={{fontFamily:'Archivo,sans-serif',fontSize:'2rem',fontWeight:900,marginBottom:'.85rem',color:plan.c}}>{plan.p}</div>
                  <ul style={{listStyle:'none',marginBottom:'1rem'}}>{plan.f.map(f=><li key={f} style={{fontSize:'.8rem',color:'var(--muted)',marginBottom:'.28rem'}}>✓ {f}</li>)}</ul>
                  {!plan.act&&<button className="save-btn">Upgrade to {plan.n}</button>}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}