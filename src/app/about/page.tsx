'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getApplications, analyseATS } from '@/lib/supabase'
import type { ATSResult } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [user, setUser] = useState<{email:string, name:string} | null>(null)
  const [apps, setApps] = useState<any[]>([])
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [atsLoading, setAtsLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      const meta = session.user.user_metadata
      setUser({
        email: session.user.email || '',
        name: `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || session.user.email?.split('@')[0] || 'User'
      })
      // Load applications
      getApplications(session.user.id).then(({ data }) => {
        if (data && data.length > 0) setApps(data)
        else setApps(DEMO_APPS) // show demo data on fresh account
      })
    })
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) router.replace('/signin')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  // ATS file handler
  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setResumeText(text)
    }
    reader.readAsText(file)
  }

  const runATS = () => {
    if (!resumeText.trim()) return
    setAtsLoading(true)
    setTimeout(() => {
      setAtsResult(analyseATS(resumeText))
      setAtsLoading(false)
    }, 1800) // simulate processing
  }

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'U'
  const statusCol: Record<string,string> = {Applied:'#3B82F6',Viewed:'#F59E0B',Interview:'#059669',Rejected:'#EF4444'}

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
        .sb{width:232px;background:#0A0F1E;padding:1.4rem 1.1rem;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100%;z-index:100;overflow-y:auto;}
        .sb-logo{display:flex;align-items:center;gap:.6rem;margin-bottom:2rem;padding:.4rem 0;}
        .sb-ic{width:36px;height:36px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.05rem;font-family:'Archivo',sans-serif;flex-shrink:0;}
        .sb-nm{font-family:'Archivo',sans-serif;font-size:1.08rem;font-weight:900;color:#fff;}
        .sb-nm span{color:#34D399;}
        .sb-sect{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.28);margin:1.2rem 0 .55rem;padding:0 .5rem;}
        .sb-item{display:flex;align-items:center;gap:.7rem;padding:.68rem .72rem;border-radius:9px;cursor:pointer;transition:all .22s;margin-bottom:.22rem;color:rgba(255,255,255,.55);font-size:.88rem;font-weight:500;border:1px solid transparent;}
        .sb-item:hover{background:rgba(255,255,255,.07);color:#fff;}
        .sb-item.act{background:linear-gradient(135deg,rgba(59,130,246,.28),rgba(1,33,105,.22));color:#fff;border-color:rgba(59,130,246,.22);}
        .sb-item .ico{font-size:1rem;flex-shrink:0;}
        .sb-engine{margin:1rem 0;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);border-radius:10px;padding:.8rem .9rem;}
        .se-dot{width:7px;height:7px;border-radius:50%;background:#34D399;display:inline-block;animation:ep 1.8s ease-in-out infinite;margin-right:.45rem;}
        @keyframes ep{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}60%{box-shadow:0 0 0 5px rgba(52,211,153,0)}}
        .sb-engine p{color:#6EE7B7;font-size:.78rem;font-weight:700;}
        .sb-engine .ss{color:rgba(52,211,153,.62);font-size:.7rem;margin-top:.18rem;}
        .sb-user{display:flex;align-items:center;gap:.6rem;padding:.7rem;background:rgba(255,255,255,.05);border-radius:10px;border:1px solid rgba(255,255,255,.08);}
        .sb-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.8rem;flex-shrink:0;}
        .sb-uname{color:#fff;font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
        .sb-uemail{color:rgba(255,255,255,.38);font-size:.66rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
        .sb-signout{margin-top:.6rem;width:100%;padding:.55rem;background:transparent;border:1px solid rgba(255,255,255,.15);border-radius:7px;color:rgba(255,255,255,.5);font-size:.78rem;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;}
        .sb-signout:hover{border-color:rgba(239,68,68,.5);color:#F87171;}

        /* MAIN */
        .main{margin-left:232px;flex:1;padding:2rem 2.25rem;min-height:100vh;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;}
        .topbar h1{font-family:'Archivo',sans-serif;font-size:1.6rem;font-weight:800;}
        .tb-right{display:flex;align-items:center;gap:.85rem;}
        .notif-btn{width:38px;height:38px;background:#fff;border:1px solid var(--border);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.05rem;position:relative;}
        .nb-dot{position:absolute;top:7px;right:7px;width:7px;height:7px;background:#EF4444;border-radius:50%;border:2px solid #fff;}
        .up-btn{padding:.55rem 1.2rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:8px;font-size:.83rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;}

        /* STAT CARDS */
        .sg{display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem;margin-bottom:2rem;}
        .sc{background:#fff;padding:1.5rem;border-radius:14px;border:1px solid var(--border);transition:all .3s;cursor:default;}
        .sc:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.09);}
        .sc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;}
        .sc-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;}
        .sc-tr{font-size:.74rem;font-weight:700;padding:.22rem .55rem;border-radius:50px;}
        .tr-up{background:rgba(5,150,105,.1);color:var(--green);}
        .sc-val{font-family:'Archivo',sans-serif;font-size:2.25rem;font-weight:900;line-height:1;margin-bottom:.28rem;}
        .sc-lbl{color:var(--muted);font-size:.82rem;}

        /* TABS */
        .tabs{display:flex;gap:.22rem;background:#fff;border:1px solid var(--border);border-radius:12px;padding:.3rem;width:fit-content;margin-bottom:1.75rem;}
        .tab{padding:.52rem 1.15rem;border-radius:9px;font-size:.87rem;font-weight:600;cursor:pointer;transition:all .22s;color:var(--muted);}
        .tab.act{background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;}

        /* TABLE CARD */
        .card{background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:1.5rem;}
        .ch{padding:1.2rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .ch h3{font-family:'Archivo',sans-serif;font-size:1rem;font-weight:700;}
        .ch-act{font-size:.82rem;color:var(--blue);font-weight:600;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;padding:.72rem 1.5rem;font-size:.73rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);border-bottom:1px solid var(--border);}
        td{padding:.88rem 1.5rem;border-bottom:1px solid rgba(226,232,240,.55);font-size:.87rem;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(248,250,252,.7);}
        .jt{font-weight:700;color:var(--navy);}
        .jc{color:var(--muted);font-size:.78rem;margin-top:.12rem;}
        .mp{display:inline-flex;align-items:center;padding:.25rem .68rem;border-radius:50px;font-size:.76rem;font-weight:700;}
        .mh{background:rgba(5,150,105,.1);color:var(--green);}
        .mm{background:rgba(59,130,246,.1);color:var(--blue);}
        .sp2{display:inline-block;padding:.22rem .68rem;border-radius:50px;font-size:.74rem;font-weight:700;}

        /* ATS */
        .ats-wrap{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}
        .tool-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:2rem;}
        .tool-card h3{font-family:'Archivo',sans-serif;font-size:1.05rem;font-weight:700;margin-bottom:.45rem;}
        .tool-card .desc{color:var(--muted);font-size:.88rem;margin-bottom:1.4rem;line-height:1.65;}
        .upload-z{border:2px dashed var(--border);border-radius:12px;padding:2.5rem 2rem;text-align:center;cursor:pointer;background:var(--bg2);transition:all .3s;}
        .upload-z:hover{border-color:var(--blue);background:rgba(59,130,246,.03);}
        .upload-z .ui{font-size:2.8rem;margin-bottom:.65rem;}
        .upload-z h4{font-weight:700;margin-bottom:.35rem;font-size:.95rem;}
        .upload-z p{color:var(--muted);font-size:.82rem;}
        .upload-z textarea{width:100%;height:120px;padding:.8rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;font-family:'DM Sans',sans-serif;resize:vertical;outline:none;margin-top:1rem;}
        .upload-z textarea:focus{border-color:var(--blue);}
        .ats-btn{margin-top:1rem;width:100%;padding:.9rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:.95rem;}
        .ats-btn:hover:not(:disabled){transform:translateY(-1px);}
        .ats-btn:disabled{opacity:.55;cursor:not-allowed;}
        .score-box{background:linear-gradient(135deg,#EFF6FF,#ECFDF5);border-radius:12px;padding:1.5rem;border:1px solid rgba(59,130,246,.14);margin-top:1rem;}
        .score-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;}
        .score-num{font-family:'Archivo',sans-serif;font-size:3rem;font-weight:900;background:linear-gradient(135deg,#3B82F6,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}
        .score-grade{padding:.38rem .88rem;border-radius:50px;font-size:.8rem;font-weight:700;}
        .gr-ex{background:rgba(5,150,105,.12);color:var(--green);}
        .gr-go{background:rgba(59,130,246,.12);color:var(--blue);}
        .gr-fa{background:rgba(245,158,11,.12);color:#D97706;}
        .gr-po{background:rgba(239,68,68,.12);color:#DC2626;}
        .score-bar{height:8px;background:var(--border);border-radius:50px;overflow:hidden;margin-bottom:1rem;}
        .score-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#059669);border-radius:50px;transition:width 1.2s ease;}
        .check-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;}
        .check-item{display:flex;align-items:center;gap:.45rem;font-size:.8rem;}
        .c-pass{color:var(--green);}
        .c-warn{color:#D97706;}
        .c-fail{color:#DC2626;}
        .sugg{margin-top:1rem;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18);border-radius:9px;padding:.85rem 1rem;}
        .sugg h4{font-size:.82rem;font-weight:700;color:#B45309;margin-bottom:.55rem;}
        .sugg li{font-size:.79rem;color:#92400E;margin-bottom:.35rem;margin-left:1rem;}

        /* JOB SEARCH */
        .jsearch{background:#fff;border:1px solid var(--border);border-radius:14px;padding:2rem;}
        .jsearch h3{font-family:'Archivo',sans-serif;font-size:1.05rem;font-weight:700;margin-bottom:.45rem;}
        .jsearch .desc{color:var(--muted);font-size:.88rem;margin-bottom:1.35rem;}
        .eng-banner{display:flex;align-items:center;gap:.6rem;padding:.72rem 1rem;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:9px;margin-bottom:1.35rem;}
        .ep2{width:8px;height:8px;border-radius:50%;background:#34D399;animation:ep 1.5s ease-in-out infinite;}
        .eng-banner span{font-size:.83rem;font-weight:700;color:#059669;}
        .filters{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1rem;margin-bottom:1.35rem;align-items:end;}
        .fg2 label{display:block;font-size:.79rem;font-weight:600;margin-bottom:.38rem;color:#374151;}
        .fg2 input,.fg2 select{width:100%;padding:.68rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-size:.87rem;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .25s;}
        .fg2 input:focus,.fg2 select:focus{border-color:var(--blue);}
        .search-btn{padding:.7rem 1.5rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:8px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;height:40px;align-self:end;}

        /* PROFILE */
        .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}
        .prow{display:flex;justify-content:space-between;padding:.72rem 0;border-bottom:1px solid var(--border);font-size:.88rem;}
        .prow:last-child{border-bottom:none;}
        .plbl{color:var(--muted);font-weight:600;}
        .pval{font-weight:700;}
        .save-btn{margin-top:1.25rem;width:100%;padding:.85rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:transform .25s;}
        .save-btn:hover{transform:translateY(-1px);}

        /* LOADING */
        .loading{display:flex;align-items:center;justify-content:center;gap:.75rem;padding:3rem;color:var(--muted);}
        .spin{width:22px;height:22px;border:2.5px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        @media(max-width:1024px){.sg{grid-template-columns:1fr 1fr;}.ats-wrap,.profile-grid{grid-template-columns:1fr;}.filters{grid-template-columns:1fr 1fr;}}
        @media(max-width:768px){.sb{display:none;}.main{margin-left:0;padding:1.25rem;}.sg{grid-template-columns:1fr 1fr;}}
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <nav className="sb">
          <div className="sb-logo">
            <div className="sb-ic">S</div>
            <div className="sb-nm">Sponsor<span>Path</span></div>
          </div>

          <div style={{flex:1}}>
            <div className="sb-sect">Main</div>
            {[{id:'overview',i:'📊',l:'Overview'},{id:'applications',i:'📋',l:'Applications'},{id:'ats',i:'📄',l:'Resume & ATS'},{id:'jobs',i:'🔍',l:'Job Search'},{id:'profile',i:'👤',l:'My Profile'}].map(item=>(
              <div key={item.id} className={`sb-item${tab===item.id?' act':''}`} onClick={()=>setTab(item.id)}>
                <span className="ico">{item.i}</span>{item.l}
              </div>
            ))}
            <div className="sb-sect">Account</div>
            {[{id:'settings',i:'⚙️',l:'Settings'},{id:'billing',i:'💳',l:'Billing'}].map(item=>(
              <div key={item.id} className={`sb-item${tab===item.id?' act':''}`} onClick={()=>setTab(item.id)}>
                <span className="ico">{item.i}</span>{item.l}
              </div>
            ))}
          </div>

          <div>
            <div className="sb-engine">
              <p><span className="se-dot"/>SponsorPath Engine</p>
              <div className="ss">Actively searching your stream</div>
            </div>
            <div className="sb-user">
              <div className="sb-av">{initials}</div>
              <div style={{overflow:'hidden'}}>
                <div className="sb-uname">{user?.name || '...'}</div>
                <div className="sb-uemail">{user?.email || ''}</div>
              </div>
            </div>
            <button className="sb-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <h1>{({overview:'Dashboard Overview',applications:'My Applications',ats:'Resume & ATS Checker',jobs:'Job Search',profile:'My Profile',settings:'Settings',billing:'Billing'} as any)[tab] || 'Dashboard'}</h1>
            <div className="tb-right">
              <div className="notif-btn">🔔<div className="nb-dot"/></div>
              <button className="up-btn">⚡ Upgrade to Pro</button>
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          {tab==='overview'&&(
            <>
              <div className="sg">
                {[{i:'📤',bg:'rgba(59,130,246,.1)',v:String(apps.length||'47'),l:'Total Applied',t:'+12 this week'},{i:'💬',bg:'rgba(5,150,105,.1)',v:'8',l:'Responses',t:'+3 this week'},{i:'🎯',bg:'rgba(139,92,246,.1)',v:'84%',l:'Avg Match Score',t:'+2%'},{i:'🗓️',bg:'rgba(245,158,11,.1)',v:'2',l:'Interviews',t:'This week'}].map(s=>(
                  <div key={s.l} className="sc">
                    <div className="sc-top"><div className="sc-ico" style={{background:s.bg}}>{s.i}</div><span className="sc-tr tr-up">{s.t}</span></div>
                    <div className="sc-val">{s.v}</div>
                    <div className="sc-lbl">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="ch"><h3>Recent Applications</h3><button className="ch-act" onClick={()=>setTab('applications')}>See all →</button></div>
                <table><thead><tr><th>Job</th><th>Match</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{apps.slice(0,4).map((j,i)=>(
                  <tr key={i}>
                    <td><div className="jt">{j.job_title||j.title}</div><div className="jc">🏢 {j.company} · 📍 {j.location}</div></td>
                    <td><span className={`mp ${(j.match_score||j.match)>=85?'mh':'mm'}`}>{j.match_score||j.match}%</span></td>
                    <td><span className="sp2" style={{background:`${statusCol[j.status]}18`,color:statusCol[j.status]}}>{j.status}</span></td>
                    <td style={{color:'var(--muted)',fontSize:'.78rem'}}>{j.applied_at?new Date(j.applied_at).toLocaleDateString():j.date}</td>
                  </tr>
                ))}</tbody></table>
              </div>
            </>
          )}

          {/* ── APPLICATIONS ── */}
          {tab==='applications'&&(
            <div className="card">
              <div className="ch"><h3>All Applications ({apps.length})</h3><button className="ch-act">Export CSV</button></div>
              <table><thead><tr><th>Job</th><th>Company</th><th>Match</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{apps.map((j,i)=>(
                <tr key={i}>
                  <td><div className="jt">{j.job_title||j.title}</div></td>
                  <td style={{color:'var(--muted)'}}>{j.company}</td>
                  <td><span className={`mp ${(j.match_score||j.match)>=85?'mh':'mm'}`}>{j.match_score||j.match}%</span></td>
                  <td><span className="sp2" style={{background:`${statusCol[j.status]}18`,color:statusCol[j.status]}}>{j.status}</span></td>
                  <td style={{color:'var(--muted)',fontSize:'.78rem'}}>{j.applied_at?new Date(j.applied_at).toLocaleDateString():j.date}</td>
                </tr>
              ))}</tbody></table>
            </div>
          )}

          {/* ── ATS TOOL ── */}
          {tab==='ats'&&(
            <div className="ats-wrap">
              <div className="tool-card">
                <h3>📄 ATS Resume Checker</h3>
                <p className="desc">Upload your CV or paste the text below. We analyse it against ATS standards and give you a real score with specific improvements.</p>
                <div className="upload-z" onClick={()=>fileRef.current?.click()}>
                  <div className="ui">📤</div>
                  <h4>Drop your CV here or click to upload</h4>
                  <p>PDF, DOC, DOCX, TXT — max 10MB</p>
                  <input ref={fileRef} type="file" accept=".txt,.doc,.docx,.pdf" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
                  <textarea
                    placeholder="Or paste your resume text here to check it instantly..."
                    value={resumeText}
                    onChange={e=>setResumeText(e.target.value)}
                    onClick={e=>e.stopPropagation()}
                  />
                </div>
                <button className="ats-btn" onClick={runATS} disabled={!resumeText.trim()||atsLoading}>
                  {atsLoading ? '⏳ Analysing...' : '🎯 Check ATS Score'}
                </button>
              </div>
              <div className="tool-card">
                <h3>🎯 ATS Score Results</h3>
                <p className="desc">Your resume is analysed against 6 ATS criteria. A score above 80 means you&apos;re ready to auto-apply.</p>
                {!atsResult&&!atsLoading&&<div style={{textAlign:'center',padding:'3rem',color:'var(--muted)'}}>📋<br/>Upload or paste your CV to see your ATS score</div>}
                {atsLoading&&<div className="loading"><div className="spin"/><span>Analysing your resume...</span></div>}
                {atsResult&&(
                  <>
                    <div className="score-box">
                      <div className="score-top">
                        <div><div className="score-num">{atsResult.score}<span style={{fontSize:'1.4rem'}}>/100</span></div><div style={{color:'var(--muted)',fontSize:'.82rem',marginTop:'.2rem'}}>ATS Compatibility Score</div></div>
                        <span className={`score-grade ${atsResult.grade==='Excellent'?'gr-ex':atsResult.grade==='Good'?'gr-go':atsResult.grade==='Fair'?'gr-fa':'gr-po'}`}>{atsResult.grade}</span>
                      </div>
                      <div className="score-bar"><div className="score-fill" style={{width:`${atsResult.score}%`}}/></div>
                      <div className="check-grid">
                        {atsResult.checks.map((c,i)=>(
                          <div key={i} className="check-item">
                            <span className={c.status==='pass'?'c-pass':c.status==='warn'?'c-warn':'c-fail'}>{c.status==='pass'?'✓':c.status==='warn'?'⚠':'✗'}</span>
                            <span>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {atsResult.suggestions.length>0&&(
                      <div className="sugg">
                        <h4>💡 Improvements to boost your score:</h4>
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
              <h3>🔍 Job Search</h3>
              <p className="desc">The SponsorPath Engine searches UK sponsor-verified jobs matching your profile 24/7. You can also search manually below.</p>
              <div className="eng-banner"><div className="ep2"/><span>⚡ SponsorPath Engine is running — finding DevOps & Engineering roles in London</span></div>
              <div className="filters">
                <div className="fg2"><label>Job Title</label><input placeholder="DevOps Engineer"/></div>
                <div className="fg2"><label>Location</label><input placeholder="London"/></div>
                <div className="fg2"><label>Stream</label><select><option>DevOps / Cloud</option><option>Software Engineering</option><option>Data & Analytics</option><option>Finance & Banking</option></select></div>
                <button className="search-btn">Search</button>
              </div>
              <div className="card" style={{marginBottom:0}}>
                <div className="ch"><h3>Live Results — UK Sponsor Verified</h3><button className="ch-act">Auto-Apply All</button></div>
                <table><thead><tr><th>Job</th><th>Match</th><th>Sponsor</th><th>Action</th></tr></thead>
                <tbody>{apps.map((j,i)=>(
                  <tr key={i}>
                    <td><div className="jt">{j.job_title||j.title}</div><div className="jc">{j.company} · {j.location}</div></td>
                    <td><span className={`mp ${(j.match_score||j.match)>=85?'mh':'mm'}`}>{j.match_score||j.match}%</span></td>
                    <td><span style={{color:'#059669',fontWeight:700,fontSize:'.8rem'}}>🇬🇧 Verified ✓</span></td>
                    <td><button style={{padding:'.38rem .88rem',background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',color:'#fff',border:'none',borderRadius:'6px',fontSize:'.76rem',fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Apply Now</button></td>
                  </tr>
                ))}</tbody></table>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab==='profile'&&(
            <div className="profile-grid">
              <div className="tool-card">
                <h3>👤 Master Profile</h3>
                <p className="desc">Your verified profile built from your resume. Used to tailor every application.</p>
                {[{l:'Full Name',v:user?.name||'—'},{l:'Email',v:user?.email||'—'},{l:'Current Role',v:'DevOps Engineer'},{l:'Experience',v:'4 years'},{l:'Visa Status',v:'Graduate Visa (PSW)'},{l:'Target Stream',v:'DevOps / Cloud'}].map(f=>(
                  <div key={f.l} className="prow"><span className="plbl">{f.l}</span><span className="pval">{f.v}</span></div>
                ))}
              </div>
              <div className="tool-card">
                <h3>⚙️ Engine Preferences</h3>
                <p className="desc">Configure how the SponsorPath Engine searches and applies for you.</p>
                {[{l:'Max Apps / Day',v:'10'},{l:'Min Match Score',v:'70%'},{l:'Preferred Location',v:'London'},{l:'Job Boards',v:'LinkedIn, Indeed, Reed'},{l:'Auto-Submit',v:'Enabled ✓'},{l:'Email Alerts',v:'Enabled ✓'}].map(f=>(
                  <div key={f.l} className="prow"><span className="plbl">{f.l}</span><span className="pval" style={{color:'#059669'}}>{f.v}</span></div>
                ))}
                <button className="save-btn">Save Preferences</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// Demo data shown on fresh account until real apps come in
const DEMO_APPS = [
  {title:'Senior DevOps Engineer',company:'Revolut',location:'London',match:94,status:'Applied',date:'Today'},
  {title:'Backend Software Engineer',company:'Monzo',location:'London',match:81,status:'Viewed',date:'Today'},
  {title:'Data Engineer',company:'Wise',location:'London',match:88,status:'Applied',date:'Yesterday'},
  {title:'Cloud Infrastructure Engineer',company:'Starling Bank',location:'London',match:76,status:'Interview',date:'2 days ago'},
  {title:'Site Reliability Engineer',company:'Checkout.com',location:'London',match:91,status:'Applied',date:'3 days ago'},
]