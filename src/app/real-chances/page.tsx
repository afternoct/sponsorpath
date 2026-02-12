// ============================================================
// FILE: src/app/real-chances/page.tsx
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

type Result = {
  overall_score: number
  grade: string
  breakdown: { label:string; score:number; color:string }[]
  tips: { text:string; impact:string }[]
}

export default function RealChancesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [cvScore, setCvScore] = useState(0)
  const [result, setResult] = useState<Result|null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/signin');return}
      const uid=session.user.id
      const [{data:p},{data:cv}]=await Promise.all([
        supabase.from('profiles').select('*').eq('user_id',uid).single(),
        supabase.from('cvs').select('ats_score').eq('user_id',uid).eq('version_type','base').single(),
      ])
      if(p) setProfile(p)
      if(cv?.ats_score) setCvScore(cv.ats_score)
      setTimeout(()=>setVisible(true),60)
    })
  },[router])

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/real-chances',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ userId:(await supabase.auth.getSession()).data.session?.user.id }),
      })
      const d = await res.json()
      if(res.ok && d.overall_score !== undefined) {
        setResult({
          overall_score: d.overall_score||0,
          grade: d.grade||'',
          breakdown: d.breakdown||[],
          tips: d.tips||[],
        })
      } else {
        // Calculate client-side if API fails
        setResult(localCalc(profile, cvScore))
      }
    } catch {
      setResult(localCalc(profile, cvScore))
    }
    setLoading(false)
  }

  const gradeLabel = (s:number) =>
    s>=80?'Excellent':s>=65?'Good':s>=50?'Moderate':'Needs Work'
  const gradeColor = (s:number) =>
    s>=80?'#10b981':s>=65?'#4f8ef7':s>=50?'#f59e0b':'#ef4444'

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Sora:wght@700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes dash{from{stroke-dashoffset:283}to{stroke-dashoffset:var(--d)}}
        @keyframes barFill{from{width:0}to{width:var(--w)}}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .lay{display:flex;min-height:100vh;}
        .mn{margin-left:230px;flex:1;padding:28px 34px;opacity:0;transition:opacity .3s;}
        .mn.v{opacity:1;}
        .ph{margin-bottom:26px;}
        .ptitle{font-family:'Sora',sans-serif;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.5px;}
        .psub{font-size:13.5px;color:#64748b;margin-top:4px;}
        .grid{display:grid;grid-template-columns:1fr 1.6fr;gap:20px;align-items:start;}
        .card{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.05);}
        .ctitle{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0f172a;margin-bottom:18px;}
        .prow{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f8fafc;font-size:13px;}
        .prow:last-of-type{border-bottom:none;}
        .plbl{color:#64748b;font-weight:600;}
        .pval{color:#0f172a;font-weight:700;max-width:180px;text-align:right;word-break:break-word;}
        .cbtn{width:100%;margin-top:20px;padding:12px;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(79,142,247,.28);transition:all .2s;}
        .cbtn:hover{transform:translateY(-1px);}
        .cbtn:disabled{opacity:.7;cursor:not-allowed;}
        .donut-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:24px;}
        .grade-label{font-family:'Sora',sans-serif;font-size:17px;font-weight:800;margin-top:12px;}
        .brow{margin-bottom:14px;}
        .brow-head{display:flex;justify-content:space-between;margin-bottom:5px;font-size:12.5px;font-weight:700;color:#374151;}
        .brow-bar{height:8px;background:#f1f5f9;border-radius:20px;overflow:hidden;}
        .brow-fill{height:100%;border-radius:20px;transition:width 1s ease;}
        .tip-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f8fafc;}
        .tip-item:last-child{border-bottom:none;}
        .tip-impact{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:5px;background:#ecfdf5;color:#059669;white-space:nowrap;flex-shrink:0;}
        .tip-text{font-size:13px;color:#374151;line-height:1.5;}
        .empty-result{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;color:#94a3b8;}
        .spinner{width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;}
        .no-data{background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:13px;color:#92400e;margin-bottom:16px;}
      `}</style>

      <div className="lay">
        <Sidebar/>
        <main className={`mn${visible?' v':''}`}>
          <div className="ph">
            <div className="ptitle">Your Chances</div>
            <div className="psub">Calculate your probability of landing a sponsored UK role based on your profile</div>
          </div>

          {(!profile?.target_roles||!cvScore)&&(
            <div className="no-data">
              Complete your profile and upload your CV for an accurate calculation.
              {!cvScore&&<> <a href="/cv" style={{color:'#d97706',fontWeight:700}}>Upload CV</a> first.</>}
              {!profile?.target_roles&&<> <a href="/profile" style={{color:'#d97706',fontWeight:700}}>Set target roles</a> in profile.</>}
            </div>
          )}

          <div className="grid">
            {/* LEFT - profile summary */}
            <div className="card" style={{animation:'fadeUp .4s ease both'}}>
              <div className="ctitle">Your Profile</div>
              {[
                {l:'Target Role',   v:profile?.target_roles?.split(',')[0]||'Not set'},
                {l:'Location',      v:profile?.location_city||'Not set'},
                {l:'Visa Status',   v:profile?.visa_status||'Not set'},
                {l:'CV Score',      v:cvScore?`${cvScore}/100`:'Not uploaded'},
                {l:'Min Salary',    v:profile?.salary_min?`£${profile.salary_min.toLocaleString()}`:'Not set'},
                {l:'Contract Type', v:profile?.salary_type||'Not set'},
              ].map(r=>(
                <div key={r.l} className="prow">
                  <span className="plbl">{r.l}</span>
                  <span className="pval" style={{color:r.v==='Not set'?'#cbd5e1':'#0f172a'}}>{r.v}</span>
                </div>
              ))}
              <button className="cbtn" onClick={calculate} disabled={loading}>
                {loading?'Calculating...':'Calculate My Chances'}
              </button>
            </div>

            {/* RIGHT - results */}
            <div className="card" style={{animation:'fadeUp .4s .08s ease both'}}>
              {loading ? (
                <div className="empty-result">
                  <div className="spinner" style={{marginBottom:14}}/>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a'}}>Calculating...</div>
                  <div style={{fontSize:13,marginTop:6}}>Analysing your profile against UK sponsor data</div>
                </div>
              ) : !result ? (
                <div className="empty-result">
                  <div style={{fontSize:44,marginBottom:12,opacity:.2}}>🎯</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:6}}>No Score Yet</div>
                  <div style={{fontSize:13}}>Click the button to calculate your chances</div>
                </div>
              ) : (
                <>
                  {/* DONUT */}
                  <div className="donut-wrap">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="54" fill="none" stroke="#f1f5f9" strokeWidth="16"/>
                      <circle cx="70" cy="70" r="54" fill="none"
                        stroke={gradeColor(result.overall_score)}
                        strokeWidth="16" strokeLinecap="round"
                        strokeDasharray="339"
                        strokeDashoffset={339 - (result.overall_score/100)*339}
                        style={{transform:'rotate(-90deg)',transformOrigin:'70px 70px',transition:'stroke-dashoffset 1s ease'}}
                      />
                      <text x="70" y="65" textAnchor="middle" fontSize="24" fontWeight="900" fill={gradeColor(result.overall_score)} fontFamily="Sora,sans-serif">{result.overall_score}%</text>
                      <text x="70" y="83" textAnchor="middle" fontSize="10.5" fill="#94a3b8" fontWeight="700">{gradeLabel(result.overall_score).toUpperCase()}</text>
                    </svg>
                    <div className="grade-label" style={{color:gradeColor(result.overall_score)}}>
                      {gradeLabel(result.overall_score)}
                    </div>
                  </div>

                  {/* BREAKDOWN */}
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:14}}>Score Breakdown</div>
                  {result.breakdown.map(b=>(
                    <div key={b.label} className="brow">
                      <div className="brow-head">
                        <span>{b.label}</span>
                        <span style={{color:b.color}}>{b.score}%</span>
                      </div>
                      <div className="brow-bar">
                        <div className="brow-fill" style={{width:`${b.score}%`,background:b.color}}/>
                      </div>
                    </div>
                  ))}

                  {/* TIPS */}
                  {result.tips.length>0&&(
                    <>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#0f172a',margin:'18px 0 12px'}}>Quick Wins</div>
                      {result.tips.map((t,i)=>(
                        <div key={i} className="tip-item">
                          <div>
                            <div className="tip-text">{t.text}</div>
                          </div>
                          <div className="tip-impact">{t.impact}</div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

function localCalc(profile: any, cvScore: number): Result {
  const visa = profile?.visa_status||''
  const sponsorFriendly = ['skilled_worker','tier_2','tier_1','global_talent'].some(v=>visa.toLowerCase().includes(v))
  const skillScore = Math.min(cvScore||50, 95)
  const marketScore = profile?.target_roles ? 72 : 50
  const visaScore = sponsorFriendly ? 85 : visa?60:40
  const salaryScore = profile?.salary_min ? (profile.salary_min<80000?80:profile.salary_min<120000?65:50) : 60
  const locationScore = (profile?.location_city||'').toLowerCase().includes('london') ? 90 : 70
  const overall = Math.round((skillScore*.3)+(marketScore*.25)+(visaScore*.2)+(salaryScore*.15)+(locationScore*.1))
  const grade = overall>=80?'Excellent':overall>=65?'Good':overall>=50?'Moderate':'Needs Work'
  const tips = []
  if(cvScore<75) tips.push({text:'Improve your CV score to 75+',impact:'+8%'})
  if(!sponsorFriendly) tips.push({text:'Clarify your visa status in profile',impact:'+12%'})
  if(!profile?.target_roles) tips.push({text:'Set specific target roles',impact:'+6%'})
  if(profile?.salary_min>100000) tips.push({text:'Consider widening salary range',impact:'+5%'})
  return {
    overall_score:overall, grade,
    breakdown:[
      {label:'Skill Match',     score:skillScore,    color:'#4f8ef7'},
      {label:'Market Demand',   score:marketScore,   color:'#10b981'},
      {label:'Visa Factor',     score:visaScore,     color:'#f59e0b'},
      {label:'Salary Alignment',score:salaryScore,   color:'#a78bfa'},
      {label:'Location Score',  score:locationScore, color:'#06b6d4'},
    ],
    tips,
  }
}