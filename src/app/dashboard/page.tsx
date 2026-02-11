'use client'
// ═══════════════════════════════════════════════════════════════════
// PREMIUM DASHBOARD - Dark sidebar, animated KPIs, charts, activity feed
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getProfile, getApplications, getCVs, getEnginePrefs, calculateProfileCompletion } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [apps, setApps] = useState<any[]>([])
  const [cvs, setCvs] = useState<any[]>([])
  const [prefs, setPrefs] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      
      const userId = session.user.id
      setUser(session.user)
      
      const [profileRes, appsRes, cvsRes, prefsRes] = await Promise.all([
        getProfile(userId),
        getApplications(userId),
        getCVs(userId),
        getEnginePrefs(userId)
      ])
      
      if (profileRes.data) setProfile(profileRes.data)
      if (appsRes.data) setApps(appsRes.data)
      if (cvsRes.data) setCvs(cvsRes.data)
      if (prefsRes.data) setPrefs(prefsRes.data)
      
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) router.replace('/signin')
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0A0F1E'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:50,height:50,border:'4px solid rgba(59,130,246,.3)',borderTopColor:'#3B82F6',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 20px'}}/>
          <p style={{color:'rgba(255,255,255,.6)',fontSize:'15px',fontWeight:600}}>Loading Dashboard...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const isNewUser = !profile?.profile_complete && apps.length === 0
  const baseCVs = cvs.filter(c => c.version_type === 'base')
  const hasCV = baseCVs.length > 0
  const cvScore = hasCV ? baseCVs[0].ats_score : 0

  // Calculate stats
  const last7Days = Array.from({length:7}, (_,i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return apps.filter(a => new Date(a.applied_at).toDateString() === d.toDateString()).length
  })
  const totalApps = apps.length
  const responses = apps.filter(a => ['in_review','interview','offer'].includes(a.status || '')).length
  const interviews = apps.filter(a => a.status === 'interview').length
  const responseRate = totalApps > 0 ? Math.round((responses / totalApps) * 100) : 0

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'
  const initials = (user?.user_metadata?.first_name?.[0] || '') + (user?.user_metadata?.last_name?.[0] || '') || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#F1F5F9;color:#0F172A;overflow-x:hidden;}
        .layout{display:flex;min-height:100vh;}
        
        /* DARK SIDEBAR */
        .sidebar{width:260px;background:linear-gradient(180deg,#0A0F1E 0%,#1E293B 100%);position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;padding:24px 16px;z-index:100;border-right:1px solid rgba(255,255,255,.05);}
        .logo{display:flex;align-items:center;gap:12px;margin-bottom:32px;padding:0 8px;}
        .logo-icon{width:40px;height:40px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(59,130,246,.3);}
        .logo-text{font-size:20px;font-weight:900;color:#fff;}
        .logo-text span{background:linear-gradient(135deg,#3B82F6,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        
        .nav-section{margin-bottom:8px;}
        .nav-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.3);padding:8px 12px;margin-top:20px;}
        .nav-item{display:flex;align-items:center;gap:12px;padding:12px;border-radius:8px;color:rgba(255,255,255,.6);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;margin-bottom:4px;text-decoration:none;}
        .nav-item:hover{background:rgba(255,255,255,.08);color:#fff;transform:translateX(2px);}
        .nav-item.active{background:rgba(59,130,246,.2);color:#fff;border:1px solid rgba(59,130,246,.3);}
        .nav-icon{width:20px;text-align:center;font-size:18px;}
        
        .engine-badge{margin-top:auto;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:16px;position:relative;overflow:hidden;}
        .engine-badge::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(16,185,129,0));pointer-events:none;}
        .engine-status{display:flex;align-items:center;gap:8px;margin-bottom:4px;}
        .pulse{width:8px;height:8px;background:#10B981;border-radius:50%;animation:pulse 2s ease-in-out infinite;}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.7)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
        .engine-title{font-size:13px;font-weight:700;color:#10B981;}
        .engine-sub{font-size:11px;color:rgba(16,185,129,.7);}
        
        .user-card{margin-top:20px;display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;}
        .user-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#8B5CF6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;}
        .user-info{flex:1;min-width:0;}
        .user-name{font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .user-email{font-size:11px;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .sign-out{margin-top:12px;width:100%;padding:10px;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.5);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit;}
        .sign-out:hover{border-color:rgba(239,68,68,.5);color:#EF4444;}
        
        /* MAIN CONTENT */
        .main{margin-left:260px;flex:1;padding:32px;background:#F1F5F9;}
        .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;}
        .header h1{font-size:28px;font-weight:800;color:#0F172A;}
        .upgrade-btn{padding:12px 24px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,.3);transition:all .2s;}
        .upgrade-btn:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,.4);}
        
        /* ONBOARDING */
        .onboarding{background:#fff;border-radius:16px;padding:48px;max-width:720px;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,.05);}
        .onboarding h2{font-size:32px;font-weight:900;margin-bottom:12px;background:linear-gradient(135deg,#0F172A,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .onboarding-sub{color:#64748B;font-size:16px;line-height:1.6;margin-bottom:32px;}
        .steps{display:flex;flex-direction:column;gap:16px;}
        .step{display:flex;align-items:center;gap:16px;padding:20px;border:2px solid #E2E8F0;border-radius:12px;cursor:pointer;transition:all .25s;text-decoration:none;color:inherit;}
        .step:hover{border-color:#3B82F6;background:#F8FAFC;transform:translateX(4px);}
        .step.done{border-color:#10B981;background:#ECFDF5;}
        .step-num{width:48px;height:48px;border-radius:50%;border:2px solid #E2E8F0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#64748B;transition:all .25s;flex-shrink:0;}
        .step:hover .step-num{border-color:#3B82F6;color:#3B82F6;}
        .step.done .step-num{border-color:#10B981;color:#10B981;background:rgba(16,185,129,.1);}
        .step-content{flex:1;}
        .step-title{font-size:16px;font-weight:700;margin-bottom:4px;}
        .step-desc{font-size:14px;color:#64748B;line-height:1.5;}
        .step-arrow{font-size:24px;color:#CBD5E1;}
        
        /* KPI CARDS */
        .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:32px;}
        .kpi{background:linear-gradient(135deg,#1E293B,#0F172A);border:1px solid rgba(59,130,246,.2);border-radius:16px;padding:24px;position:relative;overflow:hidden;}
        .kpi::before{content:'';position:absolute;top:-40%;right:-20%;width:200px;height:200px;background:radial-gradient(circle,var(--glow-color,rgba(59,130,246,.15)),transparent);pointer-events:none;}
        .kpi-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .kpi-label{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.5);}
        .kpi-badge{font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(16,185,129,.2);color:#10B981;}
        .kpi-value{font-size:40px;font-weight:900;color:#fff;line-height:1;margin-bottom:8px;}
        .kpi-sub{font-size:13px;color:rgba(255,255,255,.4);}
        
        /* CHARTS */
        .charts{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:32px;}
        .chart-card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.05);}
        .chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .chart-title{font-size:16px;font-weight:800;color:#0F172A;}
        .chart-sub{font-size:12px;color:#64748B;margin-top:2px;}
        
        /* Bar Chart */
        .bar-chart{display:flex;align-items:flex-end;gap:8px;height:120px;}
        .bar{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#3B82F6,#1E40AF);transition:all .3s;cursor:pointer;}
        .bar:hover{background:linear-gradient(180deg,#60A5FA,#3B82F6);}
        .bar-labels{display:flex;gap:8px;margin-top:12px;}
        .bar-label{flex:1;text-align:center;font-size:11px;color:#64748B;font-weight:600;}
        
        /* Activity Feed */
        .activity{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.05);}
        .activity-header{font-size:16px;font-weight:800;margin-bottom:20px;color:#0F172A;}
        .activity-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #F1F5F9;}
        .activity-item:last-child{border-bottom:none;}
        .activity-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
        .activity-content{flex:1;min-width:0;}
        .activity-title{font-size:14px;font-weight:700;margin-bottom:2px;color:#0F172A;}
        .activity-desc{font-size:12px;color:#64748B;}
        .activity-time{font-size:11px;color:#94A3B8;white-space:nowrap;}
        
        .empty{text-align:center;padding:60px 24px;color:#64748B;}
        .empty-icon{font-size:64px;margin-bottom:16px;opacity:.3;}
        .empty h3{font-size:18px;font-weight:700;color:#0F172A;margin-bottom:8px;}
        .empty p{font-size:14px;line-height:1.6;}
      `}</style>

      <div className="layout">
        {/* DARK SIDEBAR */}
        <nav className="sidebar">
          <div className="logo">
            <div className="logo-icon">S</div>
            <div className="logo-text">Sponsor<span>Path</span></div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Main</div>
            <Link href="/dashboard" className="nav-item active">
              <span className="nav-icon">📊</span>
              Overview
            </Link>
            <Link href="/applications" className="nav-item">
              <span className="nav-icon">📋</span>
              Applications
            </Link>
            <Link href="/cv" className="nav-item">
              <span className="nav-icon">📄</span>
              Resume & ATS
            </Link>
            <Link href="/jobs" className="nav-item">
              <span className="nav-icon">🤖</span>
              Job Engine
            </Link>
            <Link href="/real-chances" className="nav-item">
              <span className="nav-icon">🎯</span>
              Real Chances
            </Link>
            <Link href="/profile" className="nav-item">
              <span className="nav-icon">👤</span>
              My Profile
            </Link>
          </div>

          <div className="engine-badge">
            <div className="engine-status">
              <div className="pulse"/>
              <div className="engine-title">SponsorPath Engine</div>
            </div>
            <div className="engine-sub">
              {prefs?.engine_active !== false ? 'Actively searching' : 'Paused'}
            </div>
          </div>

          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="sign-out" onClick={handleSignOut}>Sign Out</button>
        </nav>

        {/* MAIN CONTENT */}
        <main className="main">
          <div className="header">
            <h1>Dashboard Overview</h1>
            <button className="upgrade-btn">⚡ Upgrade to Pro</button>
          </div>

          {isNewUser ? (
            /* ONBOARDING */
            <div className="onboarding">
              <h2>Welcome to SponsorPath 👋</h2>
              <p className="onboarding-sub">
                You're 3 steps away from having the engine apply to UK sponsor-verified jobs for you — automatically.
              </p>
              <div className="steps">
                <Link href="/cv" className={`step ${hasCV ? 'done' : ''}`}>
                  <div className="step-num">{hasCV ? '✓' : '1'}</div>
                  <div className="step-content">
                    <div className="step-title">Upload your CV & get ATS score</div>
                    <div className="step-desc">Engine extracts your profile automatically. PDF and DOCX supported.</div>
                  </div>
                  <div className="step-arrow">→</div>
                </Link>

                <Link href="/jobs" className={`step ${apps.length > 0 ? 'done' : ''}`}>
                  <div className="step-num">{apps.length > 0 ? '✓' : '2'}</div>
                  <div className="step-content">
                    <div className="step-title">Run the Job Engine</div>
                    <div className="step-desc">Auto-searches sponsored roles, outside IR35, and inside IR35 contracts.</div>
                  </div>
                  <div className="step-arrow">→</div>
                </Link>

                <Link href="/profile" className={`step ${profile?.profile_complete ? 'done' : ''}`}>
                  <div className="step-num">{profile?.profile_complete ? '✓' : '3'}</div>
                  <div className="step-content">
                    <div className="step-title">Complete your profile</div>
                    <div className="step-desc">Add visa expiry, salary expectations, UK address so engine can apply.</div>
                  </div>
                  <div className="step-arrow">{profile?.profile_complete ? '✅' : '→'}</div>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* KPI CARDS */}
              <div className="kpi-grid">
                <div className="kpi" style={{'--glow-color':'rgba(59,130,246,.15)'} as any}>
                  <div className="kpi-header">
                    <div className="kpi-label">Applications</div>
                    <div className="kpi-badge">+{last7Days.reduce((a,b)=>a+b,0)} this week</div>
                  </div>
                  <div className="kpi-value">{totalApps}</div>
                  <div className="kpi-sub">Total sent</div>
                </div>

                <div className="kpi" style={{'--glow-color':'rgba(16,185,129,.15)'} as any}>
                  <div className="kpi-header">
                    <div className="kpi-label">Response Rate</div>
                    <div className="kpi-badge">{responses} responses</div>
                  </div>
                  <div className="kpi-value">{responseRate}%</div>
                  <div className="kpi-sub">{interviews} interview{interviews !== 1 ? 's' : ''}</div>
                </div>

                <div className="kpi" style={{'--glow-color':'rgba(139,92,246,.15)'} as any}>
                  <div className="kpi-header">
                    <div className="kpi-label">ATS Score</div>
                    <div className="kpi-badge">{cvScore >= 80 ? 'Ready' : 'Needs work'}</div>
                  </div>
                  <div className="kpi-value">{cvScore}/100</div>
                  <div className="kpi-sub">{hasCV ? 'Latest CV' : 'No CV yet'}</div>
                </div>
              </div>

              {/* CHARTS */}
              <div className="charts">
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <div className="chart-title">Application Activity</div>
                      <div className="chart-sub">Last 7 days</div>
                    </div>
                  </div>
                  <div className="bar-chart">
                    {last7Days.map((count, i) => {
                      const maxCount = Math.max(...last7Days, 1)
                      const height = (count / maxCount) * 100
                      return <div key={i} className="bar" style={{height: `${Math.max(height, 8)}%`}} title={`${count} apps`}/>
                    })}
                  </div>
                  <div className="bar-labels">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="bar-label">{d}</div>)}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <div className="chart-title">Status</div>
                      <div className="chart-sub">Current applications</div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'12px'}}>
                    {[
                      {label:'Applied',count:apps.filter(a=>a.status==='applied').length,color:'#3B82F6'},
                      {label:'Viewing',count:apps.filter(a=>a.status==='in_review').length,color:'#F59E0B'},
                      {label:'Interview',count:apps.filter(a=>a.status==='interview').length,color:'#10B981'},
                      {label:'Offer',count:apps.filter(a=>a.status==='offer').length,color:'#8B5CF6'}
                    ].map(s => (
                      <div key={s.label} style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{width:10,height:10,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                        <div style={{flex:1,fontSize:'13px',color:'#64748B',fontWeight:600}}>{s.label}</div>
                        <div style={{fontSize:'16px',fontWeight:800,color:'#0F172A'}}>{s.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTIVITY FEED */}
              <div className="activity">
                <div className="activity-header">Engine Activity</div>
                {apps.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📭</div>
                    <h3>No activity yet</h3>
                    <p>Run the Job Engine to start applying to sponsor-verified roles.</p>
                  </div>
                ) : apps.slice(0, 5).map((app, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon" style={{
                      background: app.status === 'interview' ? 'rgba(16,185,129,.1)' :
                                 app.status === 'in_review' ? 'rgba(245,158,11,.1)' : 
                                 'rgba(59,130,246,.1)'
                    }}>
                      {app.status === 'interview' ? '🗓️' : app.status === 'in_review' ? '👀' : '📤'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{app.job_title} — {app.company}</div>
                      <div className="activity-desc">📍 {app.location}</div>
                    </div>
                    <div className="activity-time">
                      {new Date(app.applied_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}