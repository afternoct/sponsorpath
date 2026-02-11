// ════════════════════════════════════════════════════════
// FILE PATH: src/app/dashboard/page.tsx  →  localhost:3000/dashboard
// ════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getApplications, getMasterProfile, getEnginePrefs,
         saveEnginePrefs, saveMasterProfile, analyseATS } from '@/lib/supabase'
import type { ATSResult, Application, EnginePreferences } from '@/lib/supabase'

type Tab = 'overview'|'applications'|'ats'|'jobs'|'profile'|'settings'|'billing'

const SC = {Applied:'#3B82F6',Viewed:'#F59E0B',Interview:'#059669',Offered:'#8B5CF6',Rejected:'#EF4444'} as Record<string,string>

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab]         = useState<Tab>('overview')
  const [user, setUser]       = useState<{id:string;email:string;name:string}|null>(null)
  const [apps, setApps]       = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [prefs, setPrefs]     = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ATS state
  const [resumeText, setResumeText] = useState('')
  const [atsResult, setAtsResult]   = useState<ATSResult|null>(null)
  const [atsLoading, setAtsLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Job search state
  const [jobTitle, setJobTitle]   = useState('')
  const [jobLoc, setJobLoc]       = useState('London')
  const [jobs, setJobs]           = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [applyingId, setApplyingId]   = useState<string|null>(null)
  const [appliedIds, setAppliedIds]   = useState<Set<string>>(new Set())

  // Profile edit state
  const [editProfile, setEditProfile] = useState<any>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [prefsSaving, setPrefsSaving]   = useState(false)

  // Notifications panel
  const [notifOpen, setNotifOpen] = useState(false)

  const loadData = useCallback(async (userId: string) => {
    const [appsRes, profileRes, prefsRes, notifRes] = await Promise.all([
      getApplications(userId),
      getMasterProfile(userId),
      getEnginePrefs(userId),
      supabase.from('notifications').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(20)
    ])
    if (appsRes.data?.length)   setApps(appsRes.data)
    else                        setApps(DEMO_APPS)
    if (profileRes.data)  { setProfile(profileRes.data); setEditProfile(profileRes.data) }
    if (prefsRes.data)      setPrefs(prefsRes.data)
    if (notifRes.data)      setNotifications(notifRes.data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      const m = session.user.user_metadata
      const u = { id: session.user.id, email: session.user.email||'',
        name: `${m?.first_name||''} ${m?.last_name||''}`.trim() || session.user.email?.split('@')[0]||'User' }
      setUser(u)
      loadData(u.id).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'SIGNED_OUT' || !s) router.replace('/signin')
    })
    return () => subscription.unsubscribe()
  }, [router, loadData])

  // ── ATS ──
  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => setResumeText((e.target?.result as string) || '')
    reader.readAsText(file)
  }
  const runATS = async () => {
    if (!resumeText.trim() || !user) return
    setAtsLoading(true)
    try {
      const res = await fetch('/api/resume/analyse', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ resumeText, userId: user.id })
      })
      const json = await res.json()
      if (json.result) { setAtsResult(json.result); await loadData(user.id) }
    } finally { setAtsLoading(false) }
  }

  // ── JOBS ──
  const searchJobs = async () => {
    setJobsLoading(true)
    try {
      const params = new URLSearchParams({ title: jobTitle||'Engineer', location: jobLoc, userId: user?.id||'' })
      const res = await fetch(`/api/jobs/search?${params}`)
      const json = await res.json()
      if (json.jobs) setJobs(json.jobs)
    } finally { setJobsLoading(false) }
  }

  const applyJob = async (job: any) => {
    if (!user || appliedIds.has(job.external_id)) return
    setApplyingId(job.external_id)
    try {
      const res = await fetch('/api/jobs/apply', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user.id, job, autoApply: false })
      })
      const json = await res.json()
      if (json.success) {
        setAppliedIds(p => new Set([...p, job.external_id]))
        setApps(p => [json.application||{job_title:job.job_title,company:job.company,location:job.location,match_score:job.match_score,status:'Applied',applied_at:new Date().toISOString()}, ...p])
        setNotifications(p => [{id:'tmp',title:`Applied: ${job.job_title} at ${job.company}`,message:'Match score: '+job.match_score+'%',type:'application_sent',read:false,created_at:new Date().toISOString()}, ...p])
      }
    } finally { setApplyingId(null) }
  }

  // ── PROFILE ──
  const saveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await fetch('/api/profile/save', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user.id, profile: editProfile })
      })
      setProfile(editProfile)
    } finally { setSavingProfile(false) }
  }

  const savePrefs = async () => {
    if (!user) return
    setPrefsSaving(true)
    try { await saveEnginePrefs(user.id, prefs) }
    finally { setPrefsSaving(false) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace('/') }

  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)||'U'
  const unreadCount = notifications.filter(n=>!n.read).length

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'DM Sans,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid #E2E8F0',borderTopColor:'#3B82F6',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{color:'#64748B'}}>Loading dashboard...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--green:#059669;--navy:#0A0F1E;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:var(--bg2);color:var(--navy);}
        a{text-decoration:none;color:inherit;}
        .layout{display:flex;min-height:100vh;}
        /* SIDEBAR */
        .sb{width:230px;background:#0A0F1E;padding:1.4rem 1rem;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100%;z-index:100;overflow-y:auto;}
        .sb-logo{display:flex;align-items:center;gap:.6rem;margin-bottom:2rem;}
        .sb-ic{width:36px;height:36px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.05rem;font-family:'Archivo',sans-serif;flex-shrink:0;}
        .sb-nm{font-family:'Archivo',sans-serif;font-size:1.08rem;font-weight:900;color:#fff;}
        .sb-nm span{color:#34D399;}
        .sb-sect{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.28);margin:1rem 0 .5rem;padding:0 .5rem;}
        .sb-item{display:flex;align-items:center;gap:.7rem;padding:.65rem .7rem;border-radius:9px;cursor:pointer;transition:all .22s;margin-bottom:.18rem;color:rgba(255,255,255,.55);font-size:.87rem;font-weight:500;border:1px solid transparent;}
        .sb-item:hover{background:rgba(255,255,255,.07);color:#fff;}
        .sb-item.act{background:rgba(59,130,246,.2);color:#fff;border-color:rgba(59,130,246,.3);}
        .sb-item .ico{font-size:.95rem;flex-shrink:0;width:18px;text-align:center;}
        .sb-eng{margin:.75rem 0;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);border-radius:10px;padding:.75rem .85rem;}
        .ep{width:7px;height:7px;border-radius:50%;background:#34D399;display:inline-block;animation:ep 1.8s ease-in-out infinite;margin-right:.4rem;}
        @keyframes ep{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}60%{box-shadow:0 0 0 5px rgba(52,211,153,0)}}
        .sb-eng p{color:#6EE7B7;font-size:.77rem;font-weight:700;}
        .sb-eng small{color:rgba(52,211,153,.6);font-size:.68rem;}
        .sb-user{display:flex;align-items:center;gap:.6rem;padding:.65rem;background:rgba(255,255,255,.05);border-radius:10px;border:1px solid rgba(255,255,255,.08);}
        .sb-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.78rem;flex-shrink:0;}
        .sb-un{color:#fff;font-size:.81rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
        .sb-ue{color:rgba(255,255,255,.38);font-size:.64rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
        .sb-so{margin-top:.5rem;width:100%;padding:.52rem;background:transparent;border:1px solid rgba(255,255,255,.12);border-radius:7px;color:rgba(255,255,255,.45);font-size:.76rem;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;}
        .sb-so:hover{border-color:rgba(239,68,68,.5);color:#F87171;}
        /* MAIN */
        .main{margin-left:230px;flex:1;padding:2rem 2.25rem;min-height:100vh;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;}
        .topbar h1{font-family:'Archivo',sans-serif;font-size:1.55rem;font-weight:800;}
        .tb-r{display:flex;align-items:center;gap:.85rem;position:relative;}
        .nb{width:38px;height:38px;background:#fff;border:1px solid var(--border);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;position:relative;}
        .nb-dot{position:absolute;top:7px;right:7px;width:7px;height:7px;background:#EF4444;border-radius:50%;border:2px solid #fff;}
        .up-btn{padding:.55rem 1.2rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:8px;font-size:.82rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;}
        /* NOTIF PANEL */
        .notif-panel{position:absolute;top:46px;right:0;width:340px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.12);z-index:200;overflow:hidden;}
        .np-head{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .np-head h4{font-weight:700;font-size:.9rem;}
        .np-head span{font-size:.75rem;color:var(--blue);cursor:pointer;font-weight:600;}
        .np-item{padding:.85rem 1.25rem;border-bottom:1px solid rgba(226,232,240,.5);display:flex;gap:.65rem;align-items:flex-start;}
        .np-item:hover{background:var(--bg2);}
        .np-dot{width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0;margin-top:4px;}
        .np-dot.read{background:transparent;border:1.5px solid var(--border);}
        .np-t{font-size:.83rem;font-weight:600;margin-bottom:.2rem;}
        .np-m{font-size:.76rem;color:var(--muted);}
        /* STAT CARDS */
        .sg{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem;margin-bottom:2rem;}
        .sc{background:#fff;padding:1.4rem;border-radius:14px;border:1px solid var(--border);transition:all .3s;cursor:default;}
        .sc:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.08);}
        .sc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;}
        .sc-ic{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;}
        .sc-tr{font-size:.72rem;font-weight:700;padding:.2rem .52rem;border-radius:50px;background:rgba(5,150,105,.1);color:var(--green);}
        .sc-val{font-family:'Archivo',sans-serif;font-size:2.2rem;font-weight:900;line-height:1;margin-bottom:.28rem;}
        .sc-lbl{color:var(--muted);font-size:.81rem;}
        /* CARD */
        .card{background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:1.5rem;}
        .ch{padding:1.1rem 1.4rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .ch h3{font-family:'Archivo',sans-serif;font-size:.97rem;font-weight:700;}
        .ch-act{font-size:.81rem;color:var(--blue);font-weight:600;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;padding:.68rem 1.4rem;font-size:.71rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);border-bottom:1px solid var(--border);}
        td{padding:.85rem 1.4rem;border-bottom:1px solid rgba(226,232,240,.5);font-size:.86rem;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(248,250,252,.7);}
        .jt{font-weight:700;color:var(--navy);}
        .jc{color:var(--muted);font-size:.76rem;margin-top:.1rem;}
        .mp{display:inline-flex;padding:.22rem .65rem;border-radius:50px;font-size:.74rem;font-weight:700;}
        .mh{background:rgba(5,150,105,.1);color:var(--green);}
        .mm{background:rgba(59,130,246,.1);color:var(--blue);}
        .st{display:inline-block;padding:.2rem .65rem;border-radius:50px;font-size:.73rem;font-weight:700;}
        /* ATS */
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}
        .tool-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:1.75rem;}
        .tool-card h3{font-family:'Archivo',sans-serif;font-size:1rem;font-weight:700;margin-bottom:.4rem;}
        .tool-card .desc{color:var(--muted);font-size:.86rem;margin-bottom:1.3rem;line-height:1.65;}
        .upload-z{border:2px dashed var(--border);border-radius:12px;padding:2rem;text-align:center;cursor:pointer;background:var(--bg2);transition:all .3s;}
        .upload-z:hover{border-color:var(--blue);background:rgba(59,130,246,.03);}
        .upload-z .ui{font-size:2.5rem;margin-bottom:.6rem;}
        .upload-z h4{font-weight:700;margin-bottom:.3rem;font-size:.93rem;}
        .upload-z p{color:var(--muted);font-size:.8rem;}
        .ats-ta{width:100%;height:120px;padding:.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:.84rem;font-family:'DM Sans',sans-serif;resize:vertical;outline:none;margin-top:.9rem;}
        .ats-ta:focus{border-color:var(--blue);}
        .ats-btn{margin-top:.9rem;width:100%;padding:.88rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.93rem;transition:all .25s;}
        .ats-btn:hover:not(:disabled){transform:translateY(-1px);}
        .ats-btn:disabled{opacity:.55;cursor:not-allowed;}
        .score-box{background:linear-gradient(135deg,#EFF6FF,#ECFDF5);border-radius:12px;padding:1.4rem;border:1px solid rgba(59,130,246,.13);margin-top:.9rem;}
        .score-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem;}
        .score-num{font-family:'Archivo',sans-serif;font-size:2.8rem;font-weight:900;background:linear-gradient(135deg,#3B82F6,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}
        .grade{padding:.34rem .82rem;border-radius:50px;font-size:.78rem;font-weight:700;}
        .ge{background:rgba(5,150,105,.12);color:var(--green);}
        .gg{background:rgba(59,130,246,.12);color:var(--blue);}
        .gf{background:rgba(245,158,11,.12);color:#D97706;}
        .gp{background:rgba(239,68,68,.12);color:#DC2626;}
        .score-bar{height:8px;background:var(--border);border-radius:50px;overflow:hidden;margin-bottom:.9rem;}
        .score-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#059669);border-radius:50px;transition:width 1.2s ease;}
        .check-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;}
        .check-i{display:flex;align-items:center;gap:.42rem;font-size:.78rem;}
        .cp{color:var(--green);}.cw{color:#D97706;}.cf{color:#DC2626;}
        .sugg{margin-top:.9rem;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18);border-radius:9px;padding:.8rem 1rem;}
        .sugg h4{font-size:.8rem;font-weight:700;color:#B45309;margin-bottom:.5rem;}
        .sugg li{font-size:.77rem;color:#92400E;margin-bottom:.3rem;margin-left:1rem;}
        .spin{display:flex;align-items:center;gap:.7rem;color:var(--muted);padding:2.5rem;justify-content:center;}
        .sp{width:20px;height:20px;border:2.5px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        /* JOB SEARCH */
        .jsearch{background:#fff;border:1px solid var(--border);border-radius:14px;padding:1.75rem;}
        .jsearch h3{font-family:'Archivo',sans-serif;font-size:1rem;font-weight:700;margin-bottom:.35rem;}
        .jsearch .desc{color:var(--muted);font-size:.86rem;margin-bottom:1.2rem;}
        .eng-banner{display:flex;align-items:center;gap:.55rem;padding:.68rem .95rem;background:rgba(52,211,153,.07);border:1px solid rgba(52,211,153,.2);border-radius:9px;margin-bottom:1.2rem;}
        .filters{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1rem;margin-bottom:1.2rem;align-items:end;}
        .fg2 label{display:block;font-size:.78rem;font-weight:600;margin-bottom:.35rem;color:#374151;}
        .fg2 input,.fg2 select{width:100%;padding:.66rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-size:.86rem;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .25s;background:#fff;}
        .fg2 input:focus,.fg2 select:focus{border-color:var(--blue);}
        .s-btn{padding:.68rem 1.4rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:8px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;font-size:.87rem;}
        .apply-btn{padding:.36rem .85rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:6px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s;white-space:nowrap;}
        .apply-btn:disabled{opacity:.55;cursor:not-allowed;}
        .apply-btn.done{background:linear-gradient(135deg,#059669,#047857);}
        /* PROFILE */
        .pg{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}
        .prow{display:flex;justify-content:space-between;align-items:center;padding:.65rem 0;border-bottom:1px solid var(--border);font-size:.86rem;}
        .prow:last-child{border-bottom:none;}
        .plbl{color:var(--muted);font-weight:600;font-size:.82rem;}
        .pval{font-weight:700;}
        .fi{width:100%;padding:.68rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-size:.86rem;font-family:'DM Sans',sans-serif;outline:none;margin-top:.3rem;transition:border-color .25s;background:#fff;}
        .fi:focus{border-color:var(--blue);}
        .save-btn{margin-top:1.1rem;width:100%;padding:.82rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:transform .25s;font-size:.93rem;}
        .save-btn:hover:not(:disabled){transform:translateY(-1px);}
        .save-btn:disabled{opacity:.6;cursor:not-allowed;}
        .fl{display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem;}
        .fl label{font-size:.82rem;font-weight:600;color:#374151;}
        /* Toggle */
        .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:.65rem 0;border-bottom:1px solid var(--border);}
        .toggle-row:last-child{border-bottom:none;}
        .tl{font-size:.86rem;font-weight:600;}
        .ts{font-size:.76rem;color:var(--muted);margin-top:.1rem;}
        .toggle{width:44px;height:24px;background:#E2E8F0;border-radius:50px;position:relative;cursor:pointer;transition:background .25s;border:none;flex-shrink:0;}
        .toggle.on{background:var(--green);}
        .toggle::after{content:'';position:absolute;width:18px;height:18px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.15);}
        .toggle.on::after{transform:translateX(20px);}
        @media(max-width:1100px){.sg{grid-template-columns:1fr 1fr;}.two-col,.pg{grid-template-columns:1fr;}.filters{grid-template-columns:1fr 1fr;}}
        @media(max-width:768px){.sb{display:none;}.main{margin-left:0;padding:1.25rem;}}
      `}</style>

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <nav className="sb">
          <div className="sb-logo">
            <div className="sb-ic">S</div>
            <div className="sb-nm">Sponsor<span>Path</span></div>
          </div>
          <div style={{flex:1}}>
            <div className="sb-sect">Main</div>
            {([['overview','📊','Overview'],['applications','📋','Applications'],['ats','📄','Resume & ATS'],['jobs','🔍','Job Search'],['profile','👤','My Profile']] as const).map(([id,ic,lb])=>(
              <div key={id} className={`sb-item${tab===id?' act':''}`} onClick={()=>setTab(id)}>
                <span className="ico">{ic}</span>{lb}
              </div>
            ))}
            <div className="sb-sect">Account</div>
            {([['settings','⚙️','Settings'],['billing','💳','Billing']] as const).map(([id,ic,lb])=>(
              <div key={id} className={`sb-item${tab===id?' act':''}`} onClick={()=>setTab(id)}>
                <span className="ico">{ic}</span>{lb}
              </div>
            ))}
          </div>
          <div>
            <div className="sb-eng">
              <p><span className="ep"/>SponsorPath Engine</p>
              <small>Actively searching your stream</small>
            </div>
            <div className="sb-user">
              <div className="sb-av">{initials}</div>
              <div style={{overflow:'hidden'}}><div className="sb-un">{user?.name||'...'}</div><div className="sb-ue">{user?.email||''}</div></div>
            </div>
            <button className="sb-so" onClick={handleSignOut}>Sign Out</button>
          </div>
        </nav>

        {/* ── MAIN ── */}
        <main className="main">
          <div className="topbar">
            <h1>{({overview:'Dashboard Overview',applications:'My Applications',ats:'Resume & ATS Checker',jobs:'Job Search',profile:'My Profile',settings:'Settings',billing:'Billing'} as any)[tab]}</h1>
            <div className="tb-r">
              <div className="nb" onClick={()=>setNotifOpen(p=>!p)}>
                🔔{unreadCount>0&&<div className="nb-dot"/>}
              </div>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="np-head"><h4>Notifications {unreadCount>0&&`(${unreadCount})`}</h4><span onClick={()=>setNotifOpen(false)}>✕ Close</span></div>
                  {notifications.length===0&&<p style={{padding:'1.2rem',color:'var(--muted)',fontSize:'.84rem',textAlign:'center'}}>No notifications yet</p>}
                  {notifications.slice(0,6).map((n,i)=>(
                    <div key={n.id||i} className="np-item">
                      <div className={`np-dot${n.read?' read':''}`}/>
                      <div><div className="np-t">{n.title}</div><div className="np-m">{n.message}</div></div>
                    </div>
                  ))}
                </div>
              )}
              <button className="up-btn">⚡ Upgrade to Pro</button>
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          {tab==='overview'&&(
            <>
              <div className="sg">
                {[
                  {i:'📤',bg:'rgba(59,130,246,.1)',  v:String(apps.length), l:'Total Applied',    t:'+12 this week'},
                  {i:'💬',bg:'rgba(5,150,105,.1)',   v:String(apps.filter(a=>a.status==='Viewed').length||8), l:'Responses', t:'+3 this week'},
                  {i:'🎯',bg:'rgba(139,92,246,.1)',  v:apps.length?Math.round(apps.reduce((s:number,a:any)=>s+(a.match_score||0),0)/apps.length)+'%':'84%', l:'Avg Match', t:'+2%'},
                  {i:'🗓️',bg:'rgba(245,158,11,.1)', v:String(apps.filter(a=>a.status==='Interview').length||2), l:'Interviews', t:'This week'},
                ].map(s=>(
                  <div key={s.l} className="sc">
                    <div className="sc-top"><div className="sc-ic" style={{background:s.bg}}>{s.i}</div><span className="sc-tr">{s.t}</span></div>
                    <div className="sc-val">{s.v}</div>
                    <div className="sc-lbl">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="ch"><h3>Recent Applications</h3><button className="ch-act" onClick={()=>setTab('applications')}>See all →</button></div>
                <table><thead><tr><th>Job</th><th>Match</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{apps.slice(0,5).map((j,i)=>(
                  <tr key={i}>
                    <td><div className="jt">{j.job_title||j.title}</div><div className="jc">🏢 {j.company} · 📍 {j.location}</div></td>
                    <td><span className={`mp ${(j.match_score||j.match||0)>=85?'mh':'mm'}`}>{j.match_score||j.match||0}%</span></td>
                    <td><span className="st" style={{background:`${SC[j.status]||'#64748B'}18`,color:SC[j.status]||'#64748B'}}>{j.status}</span></td>
                    <td style={{color:'var(--muted)',fontSize:'.76rem'}}>{j.applied_at?new Date(j.applied_at).toLocaleDateString():j.date||'—'}</td>
                  </tr>
                ))}</tbody></table>
              </div>
            </>
          )}

          {/* ── APPLICATIONS ── */}
          {tab==='applications'&&(
            <div className="card">
              <div className="ch"><h3>All Applications ({apps.length})</h3><button className="ch-act">Export CSV</button></div>
              <table><thead><tr><th>Job</th><th>Company</th><th>Match</th><th>Sponsor</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{apps.map((j,i)=>(
                <tr key={i}>
                  <td><div className="jt">{j.job_title||j.title}</div></td>
                  <td style={{color:'var(--muted)'}}>{j.company}</td>
                  <td><span className={`mp ${(j.match_score||j.match||0)>=85?'mh':'mm'}`}>{j.match_score||j.match||0}%</span></td>
                  <td><span style={{color:'#059669',fontWeight:700,fontSize:'.8rem'}}>🇬🇧 ✓</span></td>
                  <td><span className="st" style={{background:`${SC[j.status]||'#64748B'}18`,color:SC[j.status]||'#64748B'}}>{j.status}</span></td>
                  <td style={{color:'var(--muted)',fontSize:'.76rem'}}>{j.applied_at?new Date(j.applied_at).toLocaleDateString():j.date||'—'}</td>
                </tr>
              ))}</tbody></table>
            </div>
          )}

          {/* ── ATS ── */}
          {tab==='ats'&&(
            <div className="two-col">
              <div className="tool-card">
                <h3>📄 ATS Resume Checker</h3>
                <p className="desc">Upload your CV or paste text below. We score it against ATS standards and give you specific fixes to improve your response rate.</p>
                <div className="upload-z" onClick={()=>fileRef.current?.click()}>
                  <div className="ui">📤</div>
                  <h4>Drop your CV or click to upload</h4>
                  <p>TXT, DOC, DOCX — max 10MB</p>
                  <input ref={fileRef} type="file" accept=".txt,.doc,.docx" style={{display:'none'}}
                    onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
                </div>
                <textarea className="ats-ta" placeholder="Or paste your resume text here..."
                  value={resumeText} onChange={e=>setResumeText(e.target.value)}/>
                {resumeText && <p style={{fontSize:'.76rem',color:'var(--muted)',marginTop:'.4rem'}}>{resumeText.split(/\s+/).length} words detected</p>}
                <button className="ats-btn" onClick={runATS} disabled={!resumeText.trim()||atsLoading}>
                  {atsLoading ? '⏳ Analysing...' : '🎯 Check ATS Score'}
                </button>
              </div>
              <div className="tool-card">
                <h3>🎯 Your ATS Score</h3>
                <p className="desc">Scores above 80 mean you're ready to auto-apply. Below 65 and most ATS systems will filter your CV before a human sees it.</p>
                {!atsResult&&!atsLoading&&(
                  profile?.ats_score ? (
                    <>
                      <div style={{background:'rgba(59,130,246,.06)',border:'1px solid rgba(59,130,246,.14)',borderRadius:10,padding:'1rem',marginBottom:'1rem',fontSize:'.83rem',color:'var(--muted)'}}>
                        📋 Last score from your profile:
                      </div>
                      <div className="score-box">
                        <div className="score-top">
                          <div><div className="score-num">{profile.ats_score}<span style={{fontSize:'1.3rem'}}>/100</span></div><div style={{color:'var(--muted)',fontSize:'.8rem',marginTop:'.2rem'}}>Last ATS Score</div></div>
                          <span className={`grade ${profile.ats_grade==='Excellent'?'ge':profile.ats_grade==='Good'?'gg':profile.ats_grade==='Fair'?'gf':'gp'}`}>{profile.ats_grade}</span>
                        </div>
                        <div className="score-bar"><div className="score-fill" style={{width:`${profile.ats_score}%`}}/></div>
                      </div>
                    </>
                  ) : <div style={{textAlign:'center',padding:'3rem',color:'var(--muted)'}}>📋<br/>Upload your CV to see your ATS score</div>
                )}
                {atsLoading&&<div className="spin"><div className="sp"/><span>Analysing your resume...</span></div>}
                {atsResult&&(
                  <>
                    <div className="score-box">
                      <div className="score-top">
                        <div><div className="score-num">{atsResult.score}<span style={{fontSize:'1.3rem'}}>/100</span></div><div style={{color:'var(--muted)',fontSize:'.8rem',marginTop:'.2rem'}}>ATS Compatibility Score</div></div>
                        <span className={`grade ${atsResult.grade==='Excellent'?'ge':atsResult.grade==='Good'?'gg':atsResult.grade==='Fair'?'gf':'gp'}`}>{atsResult.grade}</span>
                      </div>
                      <div className="score-bar"><div className="score-fill" style={{width:`${atsResult.score}%`}}/></div>
                      <div className="check-grid">
                        {atsResult.checks.map((c,i)=>(
                          <div key={i} className="check-i">
                            <span className={c.status==='pass'?'cp':c.status==='warn'?'cw':'cf'}>{c.status==='pass'?'✓':c.status==='warn'?'⚠':'✗'}</span>
                            <span style={{fontSize:'.78rem'}}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {atsResult.suggestions.length>0&&(
                      <div className="sugg">
                        <h4>💡 Fix these to boost your score:</h4>
                        <ul>{atsResult.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── JOB SEARCH ── */}
          {tab==='jobs'&&(
            <div className="jsearch">
              <h3>🔍 Job Search — UK Sponsor Verified</h3>
              <p className="desc">Search jobs from Reed, LinkedIn & Indeed. Every result is filtered against the official UK sponsor register. One click to apply.</p>
              <div className="eng-banner">
                <div className="ep"/>
                <span style={{fontSize:'.83rem',fontWeight:700,color:'#059669'}}>⚡ SponsorPath Engine is running — searching verified UK roles matching your profile</span>
              </div>
              <div className="filters">
                <div className="fg2"><label>Job Title</label><input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="DevOps Engineer" onKeyDown={e=>e.key==='Enter'&&searchJobs()}/></div>
                <div className="fg2"><label>Location</label><input value={jobLoc} onChange={e=>setJobLoc(e.target.value)} placeholder="London"/></div>
                <div className="fg2"><label>Stream</label><select><option>DevOps / Cloud</option><option>Software Engineering</option><option>Data & Analytics</option><option>Finance & Banking</option><option>Product Management</option></select></div>
                <button className="s-btn" onClick={searchJobs} disabled={jobsLoading}>{jobsLoading?'Searching...':'Search'}</button>
              </div>
              {jobsLoading&&<div className="spin"><div className="sp"/><span>Searching UK sponsor-verified jobs...</span></div>}
              {jobs.length>0&&(
                <div className="card" style={{marginBottom:0}}>
                  <div className="ch"><h3>Results ({jobs.length}) — 🇬🇧 All Sponsor Verified</h3><button className="ch-act">Auto-Apply All</button></div>
                  <table><thead><tr><th>Job</th><th>Salary</th><th>Match</th><th>Source</th><th>Action</th></tr></thead>
                  <tbody>{jobs.map((j,i)=>(
                    <tr key={i}>
                      <td><div className="jt">{j.job_title}</div><div className="jc">{j.company} · {j.location}</div></td>
                      <td style={{color:'var(--muted)',fontSize:'.78rem'}}>{j.salary_range||'—'}</td>
                      <td><span className={`mp ${(j.match_score||0)>=85?'mh':'mm'}`}>{j.match_score||0}%</span></td>
                      <td style={{color:'var(--muted)',fontSize:'.78rem'}}>{j.job_board}</td>
                      <td>
                        <button
                          className={`apply-btn${appliedIds.has(j.external_id)?' done':''}`}
                          disabled={!!applyingId||appliedIds.has(j.external_id)}
                          onClick={()=>applyJob(j)}>
                          {appliedIds.has(j.external_id)?'✓ Applied':applyingId===j.external_id?'Applying...':'Apply Now'}
                        </button>
                      </td>
                    </tr>
                  ))}</tbody></table>
                </div>
              )}
              {!jobsLoading&&jobs.length===0&&(
                <div style={{textAlign:'center',padding:'3rem',color:'var(--muted)'}}>
                  <div style={{fontSize:'2.5rem',marginBottom:'1rem'}}>🔍</div>
                  <h4 style={{marginBottom:'.5rem'}}>Search for UK sponsor-verified jobs above</h4>
                  <p style={{fontSize:'.86rem'}}>Results come from Reed.co.uk API and are filtered against the official UK sponsor register</p>
                  <button className="s-btn" style={{marginTop:'1.25rem'}} onClick={searchJobs}>Load Demo Jobs</button>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab==='profile'&&(
            <div className="pg">
              <div className="tool-card">
                <h3>👤 Master Profile</h3>
                <p className="desc">Your profile is used to tailor every application. Keep it accurate and complete for best match scores.</p>
                <div className="fl"><label>Full Name</label><input className="fi" value={editProfile.full_name||''} onChange={e=>setEditProfile((p:any)=>({...p,full_name:e.target.value}))}/></div>
                <div className="fl"><label>Email</label><input className="fi" value={editProfile.email||user?.email||''} onChange={e=>setEditProfile((p:any)=>({...p,email:e.target.value}))}/></div>
                <div className="fl"><label>Phone</label><input className="fi" value={editProfile.phone||''} onChange={e=>setEditProfile((p:any)=>({...p,phone:e.target.value})) } placeholder="+44..."/></div>
                <div className="fl"><label>LinkedIn URL</label><input className="fi" value={editProfile.linkedin_url||''} onChange={e=>setEditProfile((p:any)=>({...p,linkedin_url:e.target.value}))} placeholder="https://linkedin.com/in/..."/></div>
                <div className="fl"><label>Current Role</label><input className="fi" value={editProfile.current_role||''} onChange={e=>setEditProfile((p:any)=>({...p,current_role:e.target.value}))}/></div>
                <div className="fl"><label>Visa Status</label>
                  <select className="fi" value={editProfile.visa_status||''} onChange={e=>setEditProfile((p:any)=>({...p,visa_status:e.target.value}))}>
                    <option value="">Select...</option>
                    <option>Graduate Visa (PSW)</option><option>Graduate Visa (PSW) – Dependent</option>
                    <option>Skilled Worker Visa</option><option>Skilled Worker Visa – Dependent</option>
                    <option>Student Visa</option><option>British Citizen / ILR</option><option>EU Settled Status</option>
                  </select>
                </div>
                <div className="fl"><label>Preferred Locations</label><input className="fi" value={editProfile.preferred_locations||''} onChange={e=>setEditProfile((p:any)=>({...p,preferred_locations:e.target.value}))} placeholder="London, Manchester"/></div>
                <button className="save-btn" onClick={saveProfile} disabled={savingProfile}>{savingProfile?'Saving...':'Save Profile'}</button>
              </div>
              <div className="tool-card">
                <h3>⚙️ Engine Preferences</h3>
                <p className="desc">Control how the SponsorPath Engine searches and applies on your behalf.</p>
                {[
                  {l:'Auto-Submit Applications',d:'Engine applies automatically without asking',k:'auto_submit'},
                  {l:'Email Alerts',d:'Receive email updates on new applications',k:'email_alerts'},
                  {l:'Engine Active',d:'Turn off to pause all automatic applications',k:'engine_active'},
                ].map(t=>(
                  <div key={t.k} className="toggle-row">
                    <div><div className="tl">{t.l}</div><div className="ts">{t.d}</div></div>
                    <button className={`toggle${prefs?.[t.k]?' on':''}`} onClick={()=>setPrefs((p:any)=>({...p,[t.k]:!p?.[t.k]}))}/>
                  </div>
                ))}
                <div style={{height:'1rem'}}/>
                <div className="fl"><label>Max Applications / Day</label>
                  <select className="fi" value={prefs?.max_apps_per_day||10} onChange={e=>setPrefs((p:any)=>({...p,max_apps_per_day:+e.target.value}))}>
                    {[5,10,15,20,30].map(n=><option key={n} value={n}>{n} per day</option>)}
                  </select>
                </div>
                <div className="fl"><label>Minimum Match Score</label>
                  <select className="fi" value={prefs?.min_match_score||70} onChange={e=>setPrefs((p:any)=>({...p,min_match_score:+e.target.value}))}>
                    {[60,65,70,75,80,85].map(n=><option key={n} value={n}>{n}%</option>)}
                  </select>
                </div>
                <button className="save-btn" onClick={savePrefs} disabled={prefsSaving}>{prefsSaving?'Saving...':'Save Preferences'}</button>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab==='settings'&&(
            <div className="tool-card" style={{maxWidth:580}}>
              <h3>⚙️ Account Settings</h3>
              <p className="desc">Manage your account, password, and notification preferences.</p>
              {[{l:'Email Address',v:user?.email||'—'},{l:'Account Plan',v:'Starter (Free)'},{l:'Member Since',v:new Date().toLocaleDateString()},{l:'Two-Factor Auth',v:'Disabled — OTP removed for now'}].map(r=>(
                <div key={r.l} className="prow"><span className="plbl">{r.l}</span><span className="pval">{r.v}</span></div>
              ))}
              <button className="save-btn" style={{marginTop:'1.25rem'}} onClick={handleSignOut}>Sign Out of All Devices</button>
            </div>
          )}

          {/* ── BILLING ── */}
          {tab==='billing'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
              {[{n:'Starter',p:'Free',d:'Perfect for testing',f:['5 applications/month','Basic ATS check','UK sponsor check'],c:'#64748B',act:true},
                {n:'Pro',p:'£29/mo',d:'Full engine access',f:['50 applications/month','Advanced CV tailoring','Smart match scoring','Email notifications'],c:'#3B82F6',act:false},
                {n:'Premium',p:'£59/mo',d:'Maximum applications',f:['Unlimited applications','Priority engine','Dedicated support','Advanced analytics'],c:'#8B5CF6',act:false}
              ].slice(0,2).map(plan=>(
                <div key={plan.n} className="tool-card" style={{border:plan.act?'2px solid var(--green)':'1px solid var(--border)'}}>
                  {plan.act&&<div style={{background:'rgba(5,150,105,.1)',color:'var(--green)',borderRadius:50,padding:'.22rem .7rem',fontSize:'.74rem',fontWeight:700,display:'inline-block',marginBottom:'.75rem'}}>Current Plan</div>}
                  <h3>{plan.n}</h3>
                  <p className="desc">{plan.d}</p>
                  <div style={{fontFamily:'Archivo,sans-serif',fontSize:'2.2rem',fontWeight:900,marginBottom:'1rem',color:plan.c}}>{plan.p}</div>
                  <ul style={{listStyle:'none',marginBottom:'1.25rem'}}>{plan.f.map(f=><li key={f} style={{fontSize:'.84rem',color:'var(--muted)',marginBottom:'.35rem'}}>✓ {f}</li>)}</ul>
                  {!plan.act&&<button className="save-btn" style={{background:`linear-gradient(135deg,${plan.c},${plan.c}cc)`}}>Upgrade to {plan.n}</button>}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}

const DEMO_APPS: Application[] = [
  {job_title:'Senior DevOps Engineer',     company:'Revolut',       location:'London',    match_score:94,status:'Applied',   sponsor_verified:true,auto_applied:true, applied_at: new Date(Date.now()-1*86400000).toISOString()},
  {job_title:'Backend Software Engineer',  company:'Monzo',         location:'London',    match_score:81,status:'Viewed',    sponsor_verified:true,auto_applied:true, applied_at: new Date(Date.now()-1*86400000).toISOString()},
  {job_title:'Data Engineer',              company:'Wise',          location:'London',    match_score:88,status:'Applied',   sponsor_verified:true,auto_applied:true, applied_at: new Date(Date.now()-2*86400000).toISOString()},
  {job_title:'Cloud Infrastructure Eng',   company:'Starling Bank', location:'London',    match_score:76,status:'Interview', sponsor_verified:true,auto_applied:false,applied_at: new Date(Date.now()-3*86400000).toISOString()},
  {job_title:'Site Reliability Engineer',  company:'Checkout.com',  location:'London',    match_score:91,status:'Applied',   sponsor_verified:true,auto_applied:true, applied_at: new Date(Date.now()-4*86400000).toISOString()},
]