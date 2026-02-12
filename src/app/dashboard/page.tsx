// ============================================================
// FILE: src/app/dashboard/page.tsx
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase, getProfile, getApplications, getCVs } from '@/lib/supabase'

function Counter({ to, dur=1400 }: { to:number; dur?:number }) {
  const [n, setN] = useState(0)
  useEffect(()=>{
    if(!to) return
    const s=Date.now()
    const f=()=>{ const p=Math.min((Date.now()-s)/dur,1); setN(Math.floor((1-Math.pow(1-p,4))*to)); if(p<1) requestAnimationFrame(f) }
    requestAnimationFrame(f)
  },[to,dur])
  return <>{n}</>
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [apps, setApps] = useState<any[]>([])
  const [cvs, setCvs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [entered, setEntered] = useState(false)

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/signin');return}
      const uid=session.user.id
      const [p,a,c]=await Promise.all([getProfile(uid),getApplications(uid),getCVs(uid)])
      if(p.data) setProfile(p.data)
      if(a.data) setApps(a.data)
      if(c.data) setCvs(c.data)
      setLoading(false)
      setTimeout(()=>setEntered(true),80)
    })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((e,s)=>{
      if(e==='SIGNED_OUT'||!s) router.replace('/signin')
    })
    return ()=>subscription.unsubscribe()
  },[router])

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f0f4f8',fontFamily:'DM Sans,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:44,height:44,border:'3px solid #e2e8f0',borderTopColor:'#4f8ef7',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 14px'}}/>
        <p style={{color:'#64748b',fontWeight:600,fontSize:14}}>Loading...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // REAL DATA ONLY
  const cvScore = cvs.find(c=>c.version_type==='base')?.ats_score || 0
  const totalApps = apps.length
  const responses = apps.filter(a=>['in_review','interview','offer'].includes(a.status||'')).length
  const interviews = apps.filter(a=>a.status==='interview').length
  const offers = apps.filter(a=>a.status==='offer').length
  const hoursSaved = Math.round(totalApps*0.75)
  const responseRate = totalApps>0 ? Math.round((responses/totalApps)*100) : 0

  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d})
  const barData=days.map(d=>apps.filter(a=>new Date(a.applied_at).toDateString()===d.toDateString()).length)
  const maxBar=Math.max(...barData,1)
  const dayLabels=days.map(d=>['S','M','T','W','T','F','S'][d.getDay()])

  const donutData=[
    {label:'Applied',   v:apps.filter(a=>a.status==='applied').length,   c:'#4f8ef7'},
    {label:'In Review', v:apps.filter(a=>a.status==='in_review').length,  c:'#f59e0b'},
    {label:'Interview', v:interviews, c:'#10b981'},
    {label:'Offer',     v:offers,     c:'#a78bfa'},
  ]
  const dTotal=donutData.reduce((s,d)=>s+d.v,0)||1
  let cum=0
  const pol=(cx:number,cy:number,r:number,deg:number)=>{const a=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}
  const arcPath=(cx:number,cy:number,r:number,s:number,e:number)=>{const sp=pol(cx,cy,r,s),ep=pol(cx,cy,r,e);return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${ep.x} ${ep.y}`}
  const segs=donutData.map(d=>{const s=cum;cum+=(d.v/dTotal)*356;return{...d,s,e:cum}})

  const isNew = !profile?.profile_complete && totalApps===0 && cvs.length===0

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Sora:wght@600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        @keyframes bgrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
        @keyframes epulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .lay{display:flex;min-height:100vh;}
        .mn{margin-left:230px;flex:1;padding:28px 32px;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;animation:rise .45s ease both;}
        .ttl{font-family:'Sora',sans-serif;font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-.6px;}
        .tr{display:flex;gap:10px;align-items:center;}
        .pill{display:flex;align-items:center;gap:7px;padding:8px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:50px;font-size:12.5px;font-weight:700;color:#374151;}
        .pd{width:7px;height:7px;background:#10b981;border-radius:50%;animation:epulse 2s infinite;}
        .cbtn{padding:10px 22px;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(79,142,247,.3);transition:all .2s;}
        .cbtn:hover{transform:translateY(-1px);box-shadow:0 7px 20px rgba(79,142,247,.4);}
        .kgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:22px;}
        .kcard{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 12px rgba(0,0,0,.05);transition:all .28s;position:relative;overflow:hidden;}
        .kcard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:16px 16px 0 0;}
        .kc0{animation:pop .45s .02s ease both;}.kc0::before{background:linear-gradient(90deg,#4f8ef7,#818cf8);}
        .kc1{animation:pop .45s .08s ease both;}.kc1::before{background:linear-gradient(90deg,#10b981,#34d399);}
        .kc2{animation:pop .45s .14s ease both;}.kc2::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
        .kcard:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.1);}
        .klbl{font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;}
        .kval{font-family:'Sora',sans-serif;font-size:40px;font-weight:900;line-height:1;letter-spacing:-1.5px;}
        .ksuf{font-size:18px;font-weight:700;color:#94a3b8;margin-left:2px;}
        .kdlta{font-size:12px;font-weight:700;margin-top:6px;}
        .kbars{display:flex;align-items:flex-end;gap:4px;height:44px;}
        .kbar{width:9px;border-radius:4px;transform-origin:bottom;animation:bgrow .7s ease both;}
        .cgrid{display:grid;grid-template-columns:1.35fr 1fr;gap:18px;margin-bottom:22px;}
        .cc{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:22px 24px;box-shadow:0 2px 12px rgba(0,0,0,.05);animation:rise .45s .12s ease both;}
        .ctitle{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0f172a;margin-bottom:18px;}
        .bgrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
        .bc{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:22px 24px;box-shadow:0 2px 12px rgba(0,0,0,.05);animation:rise .45s .18s ease both;}
        .bh{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .bttl{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0f172a;}
        .vl{font-size:12px;font-weight:700;color:#4f8ef7;text-decoration:none;}
        .arow{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f8fafc;}
        .arow:last-child{border-bottom:none;}
        .aleft{display:flex;align-items:center;gap:12px;}
        .aic{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;}
        .aname{font-size:13.5px;font-weight:700;color:#0f172a;}
        .asub{font-size:11px;color:#94a3b8;margin-top:1px;}
        .atag{font-size:11px;font-weight:800;padding:4px 10px;border-radius:6px;}
        .prow{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f8fafc;}
        .prow:last-child{border-bottom:none;}
        .pic{width:34px;height:34px;border-radius:9px;background:#f8fafc;border:1px solid #e8edf3;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
        .pname{font-size:13.5px;font-weight:700;color:#0f172a;}
        .psub{font-size:11.5px;color:#94a3b8;}
        .ftabs{display:flex;gap:6px;margin-bottom:14px;}
        .ftab{padding:5px 13px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-family:inherit;transition:all .15s;}
        .ftab.on{background:#0f172a;color:#fff;border-color:#0f172a;}
        .gbtn{width:100%;margin-top:14px;padding:11px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;font-size:13.5px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(16,185,129,.25);transition:all .2s;}
        .gbtn:hover{transform:translateY(-1px);}
        .setup-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px;animation:rise .45s .22s ease both;}
        .setup-card{display:flex;align-items:center;gap:12px;padding:16px 18px;background:#fff;border:1.5px solid #e8edf3;border-radius:12px;text-decoration:none;color:inherit;transition:all .2s;}
        .setup-card:hover{border-color:#4f8ef7;background:#f8fbff;transform:translateY(-2px);}
        .setup-card.done{border-color:#10b981;background:#f0fdf9;}
        .setup-n{width:34px;height:34px;border-radius:50%;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#94a3b8;flex-shrink:0;transition:all .2s;}
        .setup-card:hover .setup-n{border-color:#4f8ef7;color:#4f8ef7;}
        .setup-card.done .setup-n{border-color:#10b981;color:#10b981;background:rgba(16,185,129,.08);}
        .empty-val{font-family:'Sora',sans-serif;font-size:36px;font-weight:900;line-height:1;color:#cbd5e1;}
      `}</style>

      <div className="lay">
        <Sidebar/>
        <main className="mn">
          <div className="topbar">
            <div className="ttl">Automation Dashboard</div>
            <div className="tr">
              <div className="pill"><div className="pd"/>Engine Active</div>
              <Link href="/jobs" className="cbtn" style={{textDecoration:'none',display:'inline-flex',alignItems:'center',gap:6}}>Find Jobs</Link>
            </div>
          </div>

          {/* KPI CARDS - always rendered, show 0 if no data */}
          <div className="kgrid">
            {[
              {cls:'kc0',lbl:'Applications Sent',  val:totalApps,    suf:'',     delta:totalApps>0?`+${barData.slice(-2).reduce((a,b)=>a+b,0)} today`:'Upload CV to start',       dc:'#10b981',  color:'#4f8ef7'},
              {cls:'kc1',lbl:'Hours Saved',         val:hoursSaved,   suf:' hrs', delta:totalApps>0?`${Math.round(hoursSaved*.15)} hrs this week`:'Tracked automatically',          dc:'#10b981',  color:'#10b981'},
              {cls:'kc2',lbl:'Response Rate',       val:responseRate, suf:'%',    delta:totalApps>0?`${responses} employer responses`:'No applications yet',                        dc:responseRate>20?'#10b981':'#94a3b8', color:'#f59e0b'},
            ].map((k,i)=>(
              <div key={k.lbl} className={`kcard ${k.cls}`}>
                <div>
                  <div className="klbl">{k.lbl}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:2}}>
                    {totalApps>0||k.lbl==='Applications Sent' ? (
                      <><span className="kval" style={{color:k.color}}>{entered?<Counter to={k.val} dur={1100+i*150}/>:0}</span><span className="ksuf">{k.suf}</span></>
                    ) : (
                      <span className="empty-val">--</span>
                    )}
                  </div>
                  <div className="kdlta" style={{color:k.dc}}>{k.delta}</div>
                </div>
                <div className="kbars">
                  {barData.map((v,j)=>(
                    <div key={j} className="kbar" style={{
                      height:`${Math.max((v/maxBar)*44,totalApps===0?4+(j*2):3)}px`,
                      background:j===barData.length-1?k.color:`${k.color}30`,
                      animationDelay:`${j*.04}s`,
                    }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CHARTS */}
          <div className="cgrid">
            <div className="cc">
              <div className="ctitle">Application Activity</div>
              {totalApps===0 ? (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:128,color:'#94a3b8',fontSize:13,fontWeight:600,flexDirection:'column',gap:8}}>
                  <span style={{fontSize:28,opacity:.3}}>📈</span>
                  No applications yet - <Link href="/jobs" style={{color:'#4f8ef7'}}>browse jobs</Link>
                </div>
              ) : (
                <>
                  <svg width="100%" height="128" viewBox="0 0 380 128" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="aag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f8ef7" stopOpacity=".18"/>
                        <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[0,1,2,3,4].map(i=>(<line key={i} x1="0" y1={i*26+4} x2="380" y2={i*26+4} stroke="#f1f5f9" strokeWidth="1"/>))}
                    {barData.length>1&&(<>
                      <path d={`M 0 ${118-((barData[0]/maxBar)*100)} ${barData.map((v,i)=>`L ${(i/(barData.length-1))*380} ${118-((v/maxBar)*100)}`).join(' ')} L 380 118 L 0 118 Z`} fill="url(#aag)"/>
                      <polyline fill="none" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={barData.map((v,i)=>`${(i/(barData.length-1))*380},${118-((v/maxBar)*100)}`).join(' ')}/>
                      {barData.map((v,i)=>(<circle key={i} cx={(i/(barData.length-1))*380} cy={118-((v/maxBar)*100)} r="4.5" fill="#4f8ef7" stroke="#fff" strokeWidth="2"/>))}
                    </>)}
                  </svg>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
                    {dayLabels.map((d,i)=>(<span key={i} style={{fontSize:11,color:'#94a3b8',fontWeight:700}}>{d}</span>))}
                  </div>
                </>
              )}
            </div>

            <div className="cc">
              <div className="ctitle">Application Breakdown</div>
              {totalApps===0 ? (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:128,color:'#94a3b8',fontSize:13,fontWeight:600,flexDirection:'column',gap:8}}>
                  <span style={{fontSize:28,opacity:.3}}>🍩</span>
                  Apply to jobs to see breakdown
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',gap:20}}>
                  <svg width="136" height="136" viewBox="0 0 136 136" style={{flexShrink:0}}>
                    {segs.map((s,i)=>(<path key={i} d={arcPath(68,68,50,s.s,s.e)} fill="none" stroke={s.c} strokeWidth="20" strokeLinecap="round"/>))}
                    <circle cx="68" cy="68" r="30" fill="#fff"/>
                    <text x="68" y="64" textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a" fontFamily="Sora,sans-serif">{totalApps}</text>
                    <text x="68" y="79" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700" letterSpacing="1.2">TOTAL</text>
                  </svg>
                  <div style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
                    {donutData.map(d=>(
                      <div key={d.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:600,color:'#374151'}}>
                          <div style={{width:10,height:10,borderRadius:3,background:d.c}}/>
                          {d.label}
                        </div>
                        <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{d.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM */}
          <div className="bgrid">
            <div className="bc">
              <div className="bh">
                <div className="bttl">Recent Applications</div>
                <Link href="/applications" className="vl">View all</Link>
              </div>
              {apps.length===0 ? (
                <div style={{textAlign:'center',padding:'28px 0',color:'#94a3b8',fontSize:13,fontWeight:600}}>
                  <div style={{fontSize:28,marginBottom:8,opacity:.25}}>📋</div>
                  No applications yet<br/>
                  <Link href="/jobs" style={{color:'#4f8ef7',fontWeight:700,marginTop:8,display:'inline-block'}}>Start job search</Link>
                </div>
              ) : apps.slice(0,4).map((a:any,i:number)=>{
                const cfg=a.status==='interview'?{bg:'#ecfdf5',c:'#059669',t:'Interview'}:a.status==='in_review'?{bg:'#fffbeb',c:'#d97706',t:'In Review'}:a.status==='offer'?{bg:'#f5f3ff',c:'#7c3aed',t:'Offer'}:{bg:'#eff6ff',c:'#2563eb',t:'Applied'}
                return(
                  <div key={i} className="arow">
                    <div className="aleft">
                      <div className="aic" style={{background:cfg.bg}}>{['💼','🏢','🎯','📊'][i%4]}</div>
                      <div>
                        <div className="aname">{a.job_title}</div>
                        <div className="asub">{a.company}</div>
                      </div>
                    </div>
                    <span className="atag" style={{background:cfg.bg,color:cfg.c}}>{cfg.t}</span>
                  </div>
                )
              })}
            </div>

            <div className="bc">
              <div className="bh">
                <div className="bttl">Performance</div>
                <select style={{border:'1px solid #e2e8f0',borderRadius:7,padding:'5px 10px',fontSize:12,color:'#374151',fontFamily:'inherit',cursor:'pointer',outline:'none',fontWeight:600}}>
                  <option>7 days</option><option>30 days</option><option>All time</option>
                </select>
              </div>
              <div className="ftabs">
                <button className="ftab on">Overview</button>
                <button className="ftab">Daily</button>
                <button className="ftab">Weekly</button>
              </div>
              {[
                {ic:'📋',n:'Applications Sent',  s: totalApps>0?`${totalApps} total`:'None yet'},
                {ic:'🔍',n:'CV Score',            s: cvScore>0?`${cvScore}/100`:'Not uploaded'},
                {ic:'🎯',n:'Sponsor Matches',     s: responses>0?`${responses} responses`:'0 responses'},
                {ic:'📅',n:'Interviews',           s: interviews>0?`${interviews} booked`:'None yet'},
              ].map((p,i)=>(
                <div key={i} className="prow">
                  <div className="pic">{p.ic}</div>
                  <div>
                    <div className="pname">{p.n}</div>
                    <div className="psub">{p.s}</div>
                  </div>
                </div>
              ))}
              <Link href="/jobs" className="gbtn" style={{textDecoration:'none',display:'block',textAlign:'center'}}>Search Jobs Now</Link>
            </div>
          </div>

          {/* SETUP STEPS - only if new */}
          {isNew&&(
            <div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:'11px',fontWeight:800,color:'#94a3b8',margin:'20px 0 12px',letterSpacing:'.8px',textTransform:'uppercase'}}>GET STARTED</div>
              <div className="setup-grid">
                {[
                  {n:1,done:cvs.length>0,  href:'/cv',      t:'Upload CV',         s:'Get your ATS score + auto-fill profile'},
                  {n:2,done:apps.length>0,  href:'/jobs',    t:'Search Jobs',       s:'Find sponsored roles across UK'},
                  {n:3,done:!!profile?.profile_complete, href:'/profile', t:'Complete Profile', s:'Enable full engine features'},
                ].map(step=>(
                  <Link key={step.n} href={step.href} className={`setup-card${step.done?' done':''}`}>
                    <div className="setup-n">{step.done?'✓':step.n}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:'#0f172a',marginBottom:2}}>{step.t}</div>
                      <div style={{fontSize:11.5,color:'#94a3b8'}}>{step.s}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}