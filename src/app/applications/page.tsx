// ============================================================
// FILE: src/app/applications/page.tsx
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

type Status = 'applied'|'in_review'|'interview'|'offer'|'rejected'
const S: Record<Status,{label:string,color:string,bg:string,icon:string}> = {
  applied:   {label:'Applied',    color:'#2563eb',bg:'#eff6ff', icon:'📤'},
  in_review: {label:'In Review',  color:'#d97706',bg:'#fffbeb', icon:'👀'},
  interview: {label:'Interview',  color:'#059669',bg:'#ecfdf5', icon:'🗓️'},
  offer:     {label:'Offer',      color:'#7c3aed',bg:'#f5f3ff', icon:'🎉'},
  rejected:  {label:'Rejected',   color:'#dc2626',bg:'#fef2f2', icon:'❌'},
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|Status>('all')
  const [updating, setUpdating] = useState<string|null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      const { data } = await supabase.from('applications').select('*').eq('user_id', session.user.id).order('applied_at',{ascending:false})
      if (data) setApps(data)
      setLoading(false)
      setTimeout(()=>setVisible(true),50)
    })
  }, [router])

  const updateStatus = async (id:string, status:Status) => {
    setUpdating(id)
    await supabase.from('applications').update({status,updated_at:new Date().toISOString()}).eq('id',id)
    setApps(prev=>prev.map(a=>a.id===id?{...a,status}:a))
    setUpdating(null)
  }

  const deleteApp = async (id:string) => {
    if (!confirm('Remove this application?')) return
    await supabase.from('applications').delete().eq('id',id)
    setApps(prev=>prev.filter(a=>a.id!==id))
  }

  const filtered = filter==='all'?apps:apps.filter(a=>a.status===filter)
  const counts = Object.fromEntries(['all','applied','in_review','interview','offer','rejected'].map(s=>[s,s==='all'?apps.length:apps.filter(a=>a.status===s).length]))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Sora:wght@700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .layout{display:flex;min-height:100vh;}
        .main{margin-left:230px;flex:1;padding:30px 34px;opacity:0;transition:opacity .3s;}
        .main.v{opacity:1;}
        .pt{font-family:'Sora',sans-serif;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-.5px;}
        .ps{font-size:14px;color:#64748b;margin-top:4px;}
        .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:26px;}
        .filter-tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;}
        .ft{padding:8px 16px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-family:inherit;display:flex;align-items:center;gap:6px;transition:all .2s;}
        .ft:hover{border-color:#4f8ef7;color:#4f8ef7;}
        .ft.active{background:#0f172a;color:#fff;border-color:#0f172a;}
        .fc{font-size:11px;font-weight:800;padding:2px 7px;border-radius:20px;}
        .ft.active .fc{background:rgba(255,255,255,.2);color:#fff;}
        .ft:not(.active) .fc{background:#f1f5f9;color:#64748b;}
        .app-list{display:flex;flex-direction:column;gap:12px;}
        .ac{background:#fff;border:1.5px solid #e8edf3;border-radius:14px;padding:22px 24px;transition:all .25s;animation:fadeUp .4s ease both;}
        .ac:hover{border-color:rgba(79,142,247,.3);box-shadow:0 4px 16px rgba(0,0,0,.07);transform:translateY(-1px);}
        .ah{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
        .at{font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;}
        .am{display:flex;align-items:center;gap:14px;font-size:13px;color:#64748b;flex-wrap:wrap;}
        .sb2{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:700;}
        .af{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;}
        .ad{font-size:12px;color:#94a3b8;}
        .aa{display:flex;gap:8px;}
        .ss{padding:6px 11px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:600;font-family:inherit;color:#374151;cursor:pointer;background:#fff;outline:none;transition:border .2s;}
        .ss:focus{border-color:#4f8ef7;}
        .db{padding:6px 14px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #fee2e2;background:#fff;color:#ef4444;font-family:inherit;transition:all .2s;}
        .db:hover{background:#fef2f2;}
        .empty{text-align:center;padding:80px 0;}
        .empty-icon{font-size:52px;margin-bottom:14px;opacity:.25;}
        .et{font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#0f172a;margin-bottom:6px;}
      `}</style>
      <div className="layout">
        <Sidebar/>
        <main className={`main${visible?' v':''}`}>
          <div className="ph">
            <div>
              <div className="pt">Applications</div>
              <div className="ps">{apps.length} total applications tracked</div>
            </div>
            <Link href="/jobs" style={{padding:'9px 20px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',borderRadius:9,fontSize:13,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 12px rgba(79,142,247,.3)'}}>+ Find Jobs</Link>
          </div>
          <div className="filter-tabs">
            {(['all','applied','in_review','interview','offer','rejected'] as const).map(s=>(
              <button key={s} className={`ft${filter===s?' active':''}`} onClick={()=>setFilter(s)}>
                {s==='all'?'📋 All':`${S[s as Status]?.icon} ${S[s as Status]?.label}`}
                <span className="fc">{counts[s]}</span>
              </button>
            ))}
          </div>
          {loading?(
            <div style={{textAlign:'center',padding:60}}><div style={{width:40,height:40,border:'3px solid #e2e8f0',borderTopColor:'#4f8ef7',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 14px'}}/><p style={{color:'#64748b',fontWeight:600}}>Loading...</p></div>
          ):filtered.length===0?(
            <div className="empty"><div className="empty-icon">📭</div><div className="et">{filter==='all'?'No applications yet':'Nothing here yet'}</div><p style={{fontSize:14,color:'#64748b'}}>{filter==='all'?'Run the Job Engine to start applying.':'No applications with this status.'}</p>{filter==='all'&&<Link href="/jobs" style={{display:'inline-block',marginTop:20,padding:'10px 24px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',borderRadius:9,fontSize:14,fontWeight:700,textDecoration:'none'}}>Browse Jobs</Link>}</div>
          ):(
            <div className="app-list">
              {filtered.map((app,i)=>{
                const s=(app.status||'applied') as Status
                const cfg=S[s]||S.applied
                return(
                  <div key={app.id} className="ac" style={{animationDelay:`${i*0.06}s`}}>
                    <div className="ah">
                      <div>
                        <div className="at">{app.job_title}</div>
                        <div className="am"><span>🏢 {app.company}</span>{app.location&&<span>📍 {app.location}</span>}{app.job_url&&<a href={app.job_url} target="_blank" rel="noreferrer" style={{color:'#4f8ef7',fontWeight:700}}>View job ↗</a>}</div>
                      </div>
                      <div className="sb2" style={{background:cfg.bg,color:cfg.color}}>{cfg.icon} {cfg.label}</div>
                    </div>
                    <div className="af">
                      <div className="ad">
                        Applied {new Date(app.applied_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                        {app.viewed_at&&<span style={{marginLeft:12,color:'#f59e0b'}}>👀 Viewed</span>}
                        {app.interview_at&&<span style={{marginLeft:12,color:'#10b981'}}>🗓️ Interview scheduled</span>}
                      </div>
                      <div className="aa">
                        <select className="ss" value={app.status} disabled={updating===app.id} onChange={e=>updateStatus(app.id,e.target.value as Status)}>
                          {Object.entries(S).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
                        </select>
                        <button className="db" onClick={()=>deleteApp(app.id)}>Remove</button>
                      </div>
                    </div>
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