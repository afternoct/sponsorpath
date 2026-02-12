// ============================================================
// FILE: src/app/jobs/page.tsx
// ============================================================
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

const TABS = [
  { key:'sponsored',     label:'UK Sponsored Roles', icon:'🇬🇧' },
  { key:'contract',      label:'Contract / IR35',    icon:'📝' },
  { key:'outside_ir35',  label:'Outside IR35',       icon:'✅' },
  { key:'non_sponsored', label:'All UK Roles',       icon:'🌐' },
]

export default function JobsPage() {
  const router = useRouter()
  const [tab, setTab] = useState('sponsored')
  const [jobsByTab, setJobsByTab] = useState<Record<string,any[]>>({})
  const [loading, setLoading] = useState<Record<string,boolean>>({})
  const [fetched, setFetched] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string|null>(null)
  const [applying, setApplying] = useState<string|null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string|null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [cvScore, setCvScore] = useState(0)
  const [hasCv, setHasCv] = useState(false)
  const [updated, setUpdated] = useState<Date|null>(null)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/signin');return}
      const uid = session.user.id
      setUserId(uid)
      const [{data:p},{data:cv}] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id',uid).single(),
        supabase.from('cvs').select('ats_score').eq('user_id',uid).eq('version_type','base').single(),
      ])
      if(p) setProfile(p)
      if(cv?.ats_score){ setCvScore(cv.ats_score); setHasCv(true) }
      setTimeout(()=>setVisible(true),50)
    })
  },[router])

  const fetchJobs = useCallback(async(tabKey:string, force=false)=>{
    if(!userId) return
    if(fetched.has(tabKey)&&!force) return
    setLoading(p=>({...p,[tabKey]:true}))
    setError('')
    try{
      const res = await fetch('/api/jobs/search',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          userId,
          filterType: tabKey,
          keywords: profile?.target_roles?.split(',')[0]?.trim() || 'software engineer',
          location: profile?.location_city || 'London',
          cvScore,        // 0 = no CV, no match scores shown
          targetRoles: profile?.target_roles || '',
        }),
      })
      const d = await res.json()
      if(!res.ok) throw new Error(d.error||'Search failed')
      setJobsByTab(p=>({...p,[tabKey]:d.jobs||[]}))
      setFetched(p=>new Set([...p,tabKey]))
      setUpdated(new Date())
    }catch(e:any){ setError(e.message||'Could not load jobs') }
    setLoading(p=>({...p,[tabKey]:false}))
  },[userId,fetched,profile,cvScore])

  useEffect(()=>{ if(userId) fetchJobs(tab) },[tab,userId])

  const handleApply = async(job:any)=>{
    if(!userId||applying) return
    setApplying(job.id)
    try {
      const { error:e } = await supabase.from('applications').insert({
        user_id:userId, job_title:job.title, company:job.company,
        location:job.location, job_url:job.url||'',
        status:'applied', applied_at:new Date().toISOString(),
      })
      if(e) throw e
      setApplied(p=>new Set([...p,job.id]))
    } catch(e:any){ setError('Could not save: '+e.message) }
    setApplying(null)
  }

  const jobs = jobsByTab[tab]||[]
  const isLoading = loading[tab]

  const scoreColor = (s:number|null) => s===null?'#94a3b8':s>=85?'#10b981':s>=70?'#4f8ef7':'#f59e0b'
  const scoreLabel = (s:number|null) => s===null?'No CV':''+s+'%'

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
        @keyframes slideDown{from{opacity:0;max-height:0}to{opacity:1;max-height:1200px}}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .lay{display:flex;min-height:100vh;}
        .mn{margin-left:230px;flex:1;padding:28px 34px;opacity:0;transition:opacity .3s;}
        .mn.v{opacity:1;}
        .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;}
        .ptitle{font-family:'Sora',sans-serif;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.5px;}
        .psub{font-size:13.5px;color:#64748b;margin-top:4px;}
        .ts{font-size:11.5px;color:#94a3b8;font-weight:600;}
        .banner{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(16,185,129,.07),rgba(79,142,247,.05));border:1.5px solid rgba(16,185,129,.2);border-radius:14px;padding:14px 20px;margin-bottom:16px;}
        .bl{display:flex;align-items:center;gap:12px;}
        .bdot{width:9px;height:9px;background:#10b981;border-radius:50%;animation:pulse 2s infinite;flex-shrink:0;}
        .btitle{font-size:13.5px;font-weight:800;color:#0f172a;}
        .bsub{font-size:12px;color:#64748b;margin-top:2px;}
        .src-wrap{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}
        .stag{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;background:#ecfdf5;color:#059669;border:1px solid rgba(5,150,105,.2);}
        .rbtn{padding:8px 16px;background:#fff;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;color:#374151;transition:all .2s;}
        .rbtn:hover{border-color:#4f8ef7;color:#4f8ef7;}
        .no-cv-tip{display:flex;align-items:center;gap:10px;padding:11px 16px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;font-size:12.5px;color:#92400e;margin-bottom:16px;font-weight:600;}
        .err-bar{padding:11px 16px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;font-size:13px;font-weight:600;color:#dc2626;margin-bottom:14px;}
        .tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
        .tab{display:flex;align-items:center;gap:7px;padding:10px 18px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-family:inherit;transition:all .2s;}
        .tab:hover{border-color:#4f8ef7;color:#4f8ef7;}
        .tab.on{background:#0f172a;color:#fff;border-color:#0f172a;box-shadow:0 4px 12px rgba(15,23,42,.2);}
        .tct{font-size:11px;font-weight:800;padding:2px 8px;border-radius:20px;}
        .tab.on .tct{background:rgba(255,255,255,.2);color:#fff;}
        .tab:not(.on) .tct{background:#f1f5f9;color:#64748b;}
        .jobs-list{display:flex;flex-direction:column;gap:12px;}
        .jcard{background:#fff;border:1.5px solid #e8edf3;border-radius:14px;overflow:hidden;transition:all .25s;animation:fadeUp .35s ease both;}
        .jcard:hover{border-color:rgba(79,142,247,.3);box-shadow:0 6px 22px rgba(0,0,0,.08);}
        .jhead{display:flex;align-items:flex-start;gap:16px;padding:18px 20px;}
        .jlogo{width:48px;height:48px;min-width:48px;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#eef2f7);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:20px;font-weight:900;color:#334155;}
        .jbody{flex:1;min-width:0;}
        .jtrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:7px;}
        .jtitle{font-family:'Sora',sans-serif;font-size:15.5px;font-weight:800;color:#0f172a;}
        .badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px;white-space:nowrap;}
        .bsp{background:#ecfdf5;color:#059669;border:1px solid rgba(5,150,105,.2);}
        .bct{background:#fffbeb;color:#d97706;border:1px solid rgba(217,119,6,.2);}
        .boi{background:#eff6ff;color:#2563eb;border:1px solid rgba(37,99,235,.2);}
        .bnw{background:#fef2f2;color:#dc2626;}
        .jmeta{display:flex;align-items:center;gap:14px;font-size:12.5px;color:#64748b;font-weight:500;flex-wrap:wrap;}
        .jright{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;min-width:110px;}
        .score-ring{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:12px;font-weight:800;border:2.5px solid;flex-direction:column;line-height:1.2;}
        .score-lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;}
        .jact{display:flex;gap:7px;}
        .btn-detail{padding:7px 14px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:#374151;background:#fff;transition:all .2s;}
        .btn-detail:hover,.btn-detail.open{border-color:#4f8ef7;color:#4f8ef7;background:#f0f7ff;}
        .btn-apply{padding:7px 18px;background:linear-gradient(135deg,#4f8ef7,#3b6fd4);color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;box-shadow:0 3px 8px rgba(79,142,247,.25);}
        .btn-apply:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 14px rgba(79,142,247,.35);}
        .btn-apply.done{background:linear-gradient(135deg,#10b981,#059669)!important;box-shadow:0 3px 8px rgba(16,185,129,.25)!important;}
        .btn-apply:disabled{opacity:.7;cursor:not-allowed;}
        .jdetail{border-top:1px solid #f0f4f8;padding:22px 24px;background:#fafbfd;animation:slideDown .25s ease;}
        .detail-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
        .dg-item{background:#fff;border:1px solid #e8edf3;border-radius:9px;padding:11px 14px;}
        .dg-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
        .dg-val{font-size:13.5px;font-weight:700;color:#0f172a;}
        .desc-title{font-family:'Sora',sans-serif;font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px;}
        .desc-body{font-size:13px;color:#374151;line-height:1.75;white-space:pre-wrap;word-break:break-word;}
        .skill-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;}
        .chip{padding:4px 11px;background:#eff6ff;color:#3b82f6;border-radius:6px;font-size:11.5px;font-weight:700;}
        .apply-bar{margin-top:18px;display:flex;align-items:center;gap:12px;}
        .loading-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;}
        .spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px;}
        .empty-wrap{text-align:center;padding:70px 0;}
        code{background:#fef3c7;padding:1px 6px;border-radius:4px;font-size:12px;font-weight:700;}
        a{color:inherit;}
      `}</style>

      <div className="lay">
        <Sidebar/>
        <main className={`mn${visible?' v':''}`}>
          <div className="ph">
            <div>
              <div className="ptitle">Job Engine</div>
              <div className="psub">Live search across Reed, Adzuna, LinkedIn, Indeed, TotalJobs and UK company portals</div>
            </div>
            {updated&&<div className="ts">Updated {updated.toLocaleTimeString()}</div>}
          </div>

          <div className="banner">
            <div className="bl">
              <div className="bdot"/>
              <div>
                <div className="btitle">SponsorPath Engine - Live Search</div>
                <div className="bsub">
                  Target: <strong>{profile?.target_roles?.split(',')[0]||<Link href="/profile" style={{color:'#4f8ef7'}}>Set target roles in profile</Link>}</strong>
                  {' '}in <strong>{profile?.location_city||'London'}</strong>
                </div>
                <div className="src-wrap">
                  {['Reed','Adzuna','LinkedIn','Indeed','TotalJobs','CV-Library','Direct Portals'].map(s=>(
                    <span key={s} className="stag">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <button className="rbtn" onClick={()=>{setFetched(p=>{const n=new Set(p);n.delete(tab);return n});setTimeout(()=>fetchJobs(tab,true),10)}} disabled={isLoading}>
              {isLoading?'Searching...':'Refresh'}
            </button>
          </div>

          {/* No CV warning */}
          {!hasCv&&(
            <div className="no-cv-tip">
              <span>📄</span>
              <span>
                <Link href="/cv" style={{fontWeight:800,color:'#d97706'}}>Upload your CV</Link>
                {' '}to see personalised match scores for each job
              </span>
            </div>
          )}

          {/* No API keys tip */}
          {!error&&jobs.length===0&&!isLoading&&(
            <div style={{padding:'11px 16px',background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:10,fontSize:12.5,color:'#92400e',marginBottom:16,fontWeight:600}}>
              Add free API keys to .env.local: <code>REED_API_KEY</code> (reed.co.uk/developers) and <code>ADZUNA_APP_ID</code> + <code>ADZUNA_API_KEY</code> (developer.adzuna.com).
              Also set your <Link href="/profile" style={{color:'#d97706',fontWeight:800}}>target roles in your profile</Link>.
            </div>
          )}

          {error&&<div className="err-bar">{error}</div>}

          <div className="tabs">
            {TABS.map(t=>(
              <button key={t.key} className={`tab${tab===t.key?' on':''}`} onClick={()=>setTab(t.key)}>
                {t.icon} {t.label}
                <span className="tct">{loading[t.key]?'...':jobsByTab[t.key]?.length||0}</span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="loading-wrap">
              <div className="spinner"/>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>Searching all portals...</div>
              <div style={{fontSize:13,color:'#64748b'}}>Reed + Adzuna + more for <strong>{profile?.target_roles?.split(',')[0]||'your role'}</strong></div>
            </div>
          ) : jobs.length===0 ? (
            <div className="empty-wrap">
              <div style={{fontSize:44,marginBottom:12,opacity:.2}}>🔍</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:8}}>No results yet</div>
              <p style={{fontSize:13.5,color:'#64748b',maxWidth:400,margin:'0 auto 18px',lineHeight:1.6}}>
                {tab==='outside_ir35'?'Outside IR35 roles are less common. Try Contract / IR35 tab or add Adzuna API key.':
                 tab==='contract'?'Add Adzuna API key and set target roles to find contract roles.':
                 'Add API keys or set your target roles in profile, then click Refresh.'}
              </p>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button onClick={()=>{setFetched(p=>{const n=new Set(p);n.delete(tab);return n});fetchJobs(tab,true)}} style={{padding:'9px 20px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Retry</button>
                <Link href="/profile" style={{padding:'9px 20px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:700,textDecoration:'none',color:'#374151',background:'#fff'}}>Update Profile</Link>
              </div>
            </div>
          ) : (
            <div className="jobs-list">
              {jobs.map((job:any,i:number)=>{
                const isOpen   = expanded===job.id
                const isApplied= applied.has(job.id)
                const isApplying=applying===job.id
                const color    = scoreColor(job.match)
                const techKeys = extractTech(job.description||'')
                const isContract=(job.contract_type||'').toLowerCase().includes('contract')
                return(
                  <div key={job.id||i} className="jcard" style={{animationDelay:`${i*.04}s`}}>
                    <div className="jhead">
                      <div className="jlogo">{(job.company||'J')[0].toUpperCase()}</div>
                      <div className="jbody">
                        <div className="jtrow">
                          <span className="jtitle">{job.title}</span>
                          {job.sponsor_verified&&<span className="badge bsp">SPONSOR</span>}
                          {isContract&&<span className="badge bct">CONTRACT</span>}
                          {job.ir35==='outside'&&<span className="badge boi">OUTSIDE IR35</span>}
                          {job.ir35==='tbc'&&<span className="badge boi">IR35 TBC</span>}
                          <span className="badge bnw">NEW</span>
                        </div>
                        <div className="jmeta">
                          <span>🏢 {job.company}</span>
                          <span>📍 {job.location}</span>
                          <span>💰 {job.salary||'Competitive'}</span>
                          <span>🕐 {job.time_ago||'Recently'}</span>
                          <span style={{color:'#94a3b8',fontSize:11}}>via {job.source}</span>
                        </div>
                      </div>
                      <div className="jright">
                        <div className="score-ring" style={{color,borderColor:color}}>
                          <span>{scoreLabel(job.match)}</span>
                          <span className="score-lbl">{job.match===null?'upload cv':'match'}</span>
                        </div>
                        <div className="jact">
                          <button className={`btn-detail${isOpen?' open':''}`} onClick={()=>setExpanded(isOpen?null:job.id)}>
                            {isOpen?'Hide':'Details'}
                          </button>
                          <button
                            className={`btn-apply${isApplied?' done':''}`}
                            disabled={isApplying||isApplied}
                            onClick={()=>handleApply(job)}
                          >
                            {isApplying?'Saving...':isApplied?'Applied':'Apply'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isOpen&&(
                      <div className="jdetail">
                        {/* Job detail grid */}
                        <div className="detail-grid">
                          <div className="dg-item">
                            <div className="dg-label">Salary</div>
                            <div className="dg-val">{job.salary||'Competitive'}</div>
                          </div>
                          <div className="dg-item">
                            <div className="dg-label">Contract</div>
                            <div className="dg-val">{job.contract_type||'Permanent'}</div>
                          </div>
                          <div className="dg-item">
                            <div className="dg-label">IR35 Status</div>
                            <div className="dg-val">{job.ir35==='outside'?'Outside IR35':job.ir35==='inside'?'Inside IR35':job.ir35==='tbc'?'TBC':'N/A'}</div>
                          </div>
                          <div className="dg-item">
                            <div className="dg-label">Match Score</div>
                            <div className="dg-val" style={{color}}>
                              {job.match===null ? (
                                <Link href="/cv" style={{color:'#4f8ef7',fontSize:12}}>Upload CV to see</Link>
                              ) : `${job.match}%`}
                            </div>
                          </div>
                        </div>

                        {/* FULL job description */}
                        <div className="desc-title">Full Job Description</div>
                        <div className="desc-body">
                          {job.description&&job.description.length>50
                            ? job.description
                            : 'No description available from this source.'}
                        </div>

                        {/* Tech skills extracted */}
                        {techKeys.length>0&&(
                          <div className="skill-chips">
                            {techKeys.map(k=>(<span key={k} className="chip">{k}</span>))}
                          </div>
                        )}

                        {/* Apply button at bottom of description */}
                        <div className="apply-bar">
                          <button
                            className={`btn-apply${isApplied?' done':''}`}
                            disabled={isApplying||isApplied}
                            onClick={()=>handleApply(job)}
                            style={{padding:'10px 24px',fontSize:14}}
                          >
                            {isApplied?'Applied':'Apply Now'}
                          </button>
                          {!hasCv&&(
                            <span style={{fontSize:12,color:'#64748b'}}>
                              <Link href="/cv" style={{color:'#4f8ef7',fontWeight:700}}>Upload CV</Link> to unlock match score
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function extractTech(desc: string): string[] {
  const keys=['JavaScript','TypeScript','Python','Java','React','Node.js','AWS','Azure','GCP','Kubernetes','Docker','SQL','PostgreSQL','MongoDB','GraphQL','REST','CI/CD','Git','Terraform','Kafka','Redis','Next.js','Go','Rust','C#','.NET','Spring','Django','FastAPI','SolidWorks','AutoCAD','MATLAB','Ansys','HVAC','CAD','Lean','Six Sigma','Agile','Scrum','Salesforce','SAP','Power BI','Tableau']
  return keys.filter(k=>new RegExp(k.replace('.','\\.'),'i').test(desc)).slice(0,10)
}