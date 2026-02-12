// ============================================================
// FILE: src/app/profile/page.tsx
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase, getProfile, saveProfile, calculateProfileCompletion } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pct, setPct] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      const { data } = await getProfile(session.user.id)
      if (data) { setProfile(data); setPct(data.completion_pct||0) }
      setLoading(false)
      setTimeout(()=>setVisible(true),50)
    })
  }, [router])

  const set = (k:string,v:string) => setProfile((p:any)=>({...p,[k]:v}))

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const pctCalc = calculateProfileCompletion(profile)
    await saveProfile(session.user.id, {...profile, completion_pct:pctCalc, profile_complete: pctCalc>=80})
    setPct(pctCalc)
    setSaving(false); setSaved(true)
    setTimeout(()=>setSaved(false), 2500)
  }

  const inp = "width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;font-family:'DM Sans',sans-serif;color:#0f172a;background:#fff;outline:none;transition:border .2s;"
  const lbl = "display:block;font-size:12.5px;font-weight:700;color:#374151;margin-bottom:6px;letter-spacing:.1px;"
  const fg = "margin-bottom:18px;"

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f0f4f8'}}><div style={{width:40,height:40,border:'3px solid #e2e8f0',borderTopColor:'#4f8ef7',borderRadius:'50%',animation:'spin 1s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Sora:wght@700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes progress{from{width:0}to{width:var(--w)}}
        *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .layout{display:flex;min-height:100vh;}
        .main{margin-left:230px;flex:1;padding:30px 34px;opacity:0;transition:opacity .3s;}
        .main.v{opacity:1;}
        input:focus,select:focus,textarea:focus{border-color:#4f8ef7!important;box-shadow:0 0 0 3px rgba(79,142,247,.1);}
      `}</style>
      <div className="layout">
        <Sidebar/>
        <main className={`main${visible?' v':''}`}>
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:'#0f172a',letterSpacing:'-.5px'}}>My Profile</div>
            <div style={{fontSize:14,color:'#64748b',marginTop:4}}>Your profile is auto-filled when you upload a CV. Complete all fields for best results.</div>
          </div>

          {/* COMPLETION BAR */}
          <div style={{background:'#fff',border:'1.5px solid #e8edf3',borderRadius:14,padding:'20px 24px',marginBottom:24,boxShadow:'0 2px 8px rgba(0,0,0,.04)',animation:'fadeUp .4s ease both'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:15,color:'#0f172a'}}>Profile Completion</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#4f8ef7'}}>{pct}%</div>
            </div>
            <div style={{background:'#f0f4f8',borderRadius:50,height:8,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:50,background:'linear-gradient(90deg,#4f8ef7,#a78bfa)',width:`${pct}%`,transition:'width .8s cubic-bezier(.4,0,.2,1)',animation:'progress 1s ease both'} as any}/>
            </div>
            {pct < 80 && <div style={{fontSize:12,color:'#94a3b8',marginTop:10}}>Complete your profile to unlock all engine features. {80-pct}% more needed.</div>}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {/* MASTER PROFILE */}
            <div style={{background:'#fff',border:'1.5px solid #e8edf3',borderRadius:14,padding:'24px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',animation:'fadeUp .4s ease .1s both'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>👤</span>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0f172a'}}>Master Profile</div>
              </div>
              <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>Used by the engine for every application. Auto-filled when you upload your CV.</div>

              <div style={{background:'#eff6ff',border:'1.5px solid #dbeafe',borderRadius:10,padding:'12px 16px',marginBottom:20}}>
                <div style={{fontSize:13,color:'#1e40af',lineHeight:1.6}}><b>Auto-fill working:</b> Upload a CV in the Resume & ATS tab and these fields will be automatically populated with data extracted from your CV.</div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {[{k:'full_name',l:'Full Name',p:'John Smith'},{k:'email',l:'Email',p:'john@example.com',t:'email'},{k:'phone',l:'Phone',p:'+44 7700 000000'},{k:'linkedin_url',l:'LinkedIn URL',p:'https://linkedin.com/in/...'}].map(f=>(
                  <div key={f.k} style={{marginBottom:0}}>
                    <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>{f.l}</label>
                    <input type={f.t||'text'} value={profile[f.k]||''} onChange={e=>set(f.k,e.target.value)} placeholder={f.p}
                      style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}/>
                  </div>
                ))}
              </div>

              <div style={{marginTop:14}}>
                <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>Visa Status</label>
                <select value={profile.visa_status||''} onChange={e=>set('visa_status',e.target.value)} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}>
                  <option value="">Select...</option>
                  {['Skilled Worker Visa','Graduate Visa','Student Visa','British Citizen','ILR','EU Settled Status','Visitor Visa','Other'].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
                <div>
                  <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>Visa Expiry Date</label>
                  <input type="date" value={profile.visa_expiry||''} onChange={e=>set('visa_expiry',e.target.value)} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>UK Postcode</label>
                  <input type="text" value={profile.uk_postcode||''} onChange={e=>set('uk_postcode',e.target.value)} placeholder="E1 6AN" style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}/>
                </div>
              </div>
              <div style={{marginTop:14}}>
                <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>Full UK Address</label>
                <textarea value={profile.uk_address||''} onChange={e=>set('uk_address',e.target.value)} placeholder="123 High Street, London, E1 6AN" rows={2} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none',resize:'vertical'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
                <div>
                  <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>Min Salary (£)</label>
                  <input type="number" value={profile.salary_min||''} onChange={e=>set('salary_min',e.target.value)} placeholder="50000" style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>Max Salary (£)</label>
                  <input type="number" value={profile.salary_max||''} onChange={e=>set('salary_max',e.target.value)} placeholder="80000" style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}/>
                </div>
              </div>
            </div>

            {/* JOB PREFERENCES */}
            <div>
              <div style={{background:'#fff',border:'1.5px solid #e8edf3',borderRadius:14,padding:'24px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',animation:'fadeUp .4s ease .15s both',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:18}}>⚙️</span>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0f172a'}}>Job Preferences</div>
                </div>
                <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>Tell the engine what you are looking for.</div>

                {[
                  {k:'target_roles',l:'Target Roles (comma separated)',p:'Software Engineer, DevOps Engineer'},
                  {k:'location_city',l:'Preferred City',p:'London'},
                ].map(f=>(
                  <div key={f.k} style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>{f.l}</label>
                    <input value={profile[f.k]||''} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}/>
                  </div>
                ))}

                {[
                  {k:'remote_pref',l:'Remote Preference',opts:['Any','Remote Only','Hybrid','On-site']},
                  {k:'radius_km',l:'Search Radius',opts:['10 km','25 km','50 km','100 km','Nationwide']},
                  {k:'notice_period',l:'Notice Period',opts:['Immediate','1 week','2 weeks','1 month','2 months','3 months']},
                  {k:'salary_type',l:'Contract Type',opts:['Permanent','Contract','Either']},
                ].map(f=>(
                  <div key={f.k} style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12.5,fontWeight:700,color:'#374151',marginBottom:6}}>{f.l}</label>
                    <select value={profile[f.k]||''} onChange={e=>set(f.k,e.target.value)} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#0f172a',background:'#fff',outline:'none'}}>
                      <option value="">Select...</option>
                      {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1.5px solid #fde68a',borderRadius:14,padding:'18px 20px',animation:'fadeUp .4s ease .2s both'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                  <span>✨</span>
                  <div style={{fontSize:13.5,fontWeight:800,color:'#92400e'}}>Auto-fill Tip</div>
                </div>
                <div style={{fontSize:13,color:'#78350f',lineHeight:1.65}}>Most of these fields are automatically extracted when you upload your CV. Just review and adjust as needed.</div>
              </div>

              <button
                onClick={handleSave} disabled={saving}
                style={{width:'100%',marginTop:16,padding:'13px',background:saved?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',border:'none',borderRadius:11,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all .3s',boxShadow:saved?'0 4px 12px rgba(16,185,129,.3)':'0 4px 12px rgba(79,142,247,.3)'}}
              >
                {saving?'Saving...':saved?'✓ Profile Saved!':'Save Profile'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}