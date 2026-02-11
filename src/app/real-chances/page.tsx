'use client'
// ═══════════════════════════════════════════════════════════════════
// REAL CHANCES PAGE - Sponsor likelihood calculator
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getProfile, getCVs } from '@/lib/supabase'

export default function RealChancesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [cvs, setCvs] = useState<any[]>([])
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      setUser(session.user)
      
      const [profileRes, cvsRes] = await Promise.all([
        getProfile(session.user.id),
        getCVs(session.user.id)
      ])
      
      if (profileRes.data) setProfile(profileRes.data)
      if (cvsRes.data) setCvs(cvsRes.data)
    })
  }, [router])

  const calculateChances = async () => {
    if (!user || !profile) return
    setCalculating(true)

    try {
      const res = await fetch('/api/real-chances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          targetRole: profile.target_roles?.[0] || '',
          location: profile.location_city || 'London',
          visaStatus: profile.visa_status || '',
          salaryMin: profile.salary_min || 0,
          salaryMax: profile.salary_max || 0,
          cvScore: cvs[0]?.ats_score || 0
        })
      })

      const data = await res.json()
      if (data.result) {
        setResult(data.result)
      }
    } catch (e) {
      console.error(e)
      alert('Calculation failed')
    } finally {
      setCalculating(false)
    }
  }

  const hasRequiredData = profile?.target_roles?.length > 0 && profile?.visa_status && cvs.length > 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#F1F5F9;}
        .page{max-width:1200px;margin:0 auto;padding:40px 24px;}
        
        .page-header{text-align:center;margin-bottom:48px;}
        .page-header h1{font-size:40px;font-weight:900;background:linear-gradient(135deg,#0F172A,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px;}
        .page-header p{font-size:18px;color:#64748B;line-height:1.6;max-width:600px;margin:0 auto;}
        
        .input-card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-bottom:32px;}
        .input-card h3{font-size:20px;font-weight:800;margin-bottom:20px;color:#0F172A;}
        .input-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:24px;}
        .input-group{display:flex;flex-direction:column;gap:8px;}
        .input-label{font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;}
        .input-value{font-size:16px;font-weight:700;color:#0F172A;padding:12px 16px;background:#F8FAFC;border-radius:8px;border:2px solid #E2E8F0;}
        
        .calc-btn{width:100%;padding:16px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(59,130,246,.3);transition:all .2s;}
        .calc-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,.4);}
        .calc-btn:disabled{opacity:.5;cursor:not-allowed;}
        
        .result-card{background:linear-gradient(135deg,#0F172A,#1E293B);border-radius:20px;padding:48px;box-shadow:0 8px 24px rgba(0,0,0,.15);margin-bottom:32px;}
        .score-display{text-align:center;margin-bottom:40px;}
        .score-ring{width:200px;height:200px;margin:0 auto 24px;position:relative;}
        .score-circle{transform:rotate(-90deg);}
        .score-number{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;font-weight:900;color:#fff;}
        .score-label{font-size:16px;color:rgba(255,255,255,.6);text-align:center;}
        .grade{display:inline-block;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:800;margin-top:16px;}
        .grade-excellent{background:rgba(16,185,129,.2);color:#10B981;}
        .grade-good{background:rgba(59,130,246,.2);color:#60A5FA;}
        .grade-moderate{background:rgba(245,158,11,.2);color:#FBBF24;}
        .grade-low{background:rgba(239,68,68,.2);color:#F87171;}
        
        .breakdown{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:40px;}
        .breakdown-item{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;}
        .breakdown-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .breakdown-label{font-size:14px;font-weight:700;color:rgba(255,255,255,.8);}
        .breakdown-score{font-size:20px;font-weight:900;color:#fff;}
        .breakdown-bar{height:8px;background:rgba(255,255,255,.1);border-radius:20px;overflow:hidden;}
        .breakdown-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#10B981);border-radius:20px;transition:width .8s ease;}
        
        .reasons{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:24px;margin-bottom:24px;}
        .reasons h4{font-size:16px;font-weight:800;color:#F87171;margin-bottom:16px;}
        .reason-item{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;font-size:14px;color:rgba(255,255,255,.9);line-height:1.6;}
        .reason-item:last-child{margin-bottom:0;}
        
        .improvements{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:12px;padding:24px;}
        .improvements h4{font-size:16px;font-weight:800;color:#10B981;margin-bottom:16px;}
        .improvement-item{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px;background:rgba(255,255,255,.05);border-radius:8px;margin-bottom:8px;}
        .improvement-item:last-child{margin-bottom:0;}
        .improvement-text{font-size:14px;color:rgba(255,255,255,.9);flex:1;}
        .improvement-impact{font-size:14px;font-weight:800;color:#10B981;white-space:nowrap;}
        
        .empty{text-align:center;padding:60px 24px;color:#64748B;}
        .empty-icon{font-size:64px;margin-bottom:16px;opacity:.3;}
        .empty h3{font-size:20px;font-weight:800;color:#0F172A;margin-bottom:8px;}
        .empty p{font-size:14px;line-height:1.6;}
      `}</style>

      <div className="page">
        <div className="page-header">
          <h1>Real Chances Calculator</h1>
          <p>Get an accurate, data-driven prediction of your chances of landing a UK sponsored role based on your profile, CV, and market demand.</p>
        </div>

        <div className="input-card">
          <h3>Your Profile Data</h3>
          <div className="input-grid">
            <div className="input-group">
              <div className="input-label">Target Role</div>
              <div className="input-value">{profile?.target_roles?.[0] || 'Not set'}</div>
            </div>
            <div className="input-group">
              <div className="input-label">Location</div>
              <div className="input-value">{profile?.location_city || 'Not set'}</div>
            </div>
            <div className="input-group">
              <div className="input-label">Visa Status</div>
              <div className="input-value">{profile?.visa_status || 'Not set'}</div>
            </div>
            <div className="input-group">
              <div className="input-label">CV ATS Score</div>
              <div className="input-value">{cvs[0]?.ats_score || 0}/100</div>
            </div>
            <div className="input-group">
              <div className="input-label">Salary Expectation</div>
              <div className="input-value">
                {profile?.salary_min ? `£${profile.salary_min.toLocaleString()} - £${profile.salary_max?.toLocaleString() || '...'}` : 'Not set'}
              </div>
            </div>
          </div>

          {!hasRequiredData ? (
            <div className="empty">
              <div className="empty-icon">⚠️</div>
              <h3>Missing Required Data</h3>
              <p>Complete your profile and upload a CV to calculate your real chances.</p>
            </div>
          ) : (
            <button
              className="calc-btn"
              onClick={calculateChances}
              disabled={calculating}
            >
              {calculating ? '🔄 Calculating Your Real Chances...' : '🎯 Calculate My Real Chances'}
            </button>
          )}
        </div>

        {result && (
          <div className="result-card">
            <div className="score-display">
              <div className="score-ring">
                <svg width="200" height="200">
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="rgba(255,255,255,.1)"
                    strokeWidth="12"
                  />
                  <circle
                    className="score-circle"
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={result.overall_score >= 70 ? '#10B981' : result.overall_score >= 50 ? '#3B82F6' : '#F59E0B'}
                    strokeWidth="12"
                    strokeDasharray={`${(result.overall_score / 100) * 565} 565`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="score-number">{result.overall_score}%</div>
              </div>
              <div className="score-label">Sponsor Likelihood</div>
              <div className={`grade grade-${
                result.overall_score >= 70 ? 'excellent' :
                result.overall_score >= 50 ? 'good' :
                result.overall_score >= 30 ? 'moderate' : 'low'
              }`}>
                {result.overall_score >= 70 ? 'Strong Chance' :
                 result.overall_score >= 50 ? 'Moderate Chance' :
                 result.overall_score >= 30 ? 'Fair Chance' : 'Needs Work'}
              </div>
            </div>

            <div className="breakdown">
              {Object.entries(result.breakdown || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="breakdown-item">
                  <div className="breakdown-header">
                    <div className="breakdown-label">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div className="breakdown-score">{value}%</div>
                  </div>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{width: `${value}%`}}/>
                  </div>
                </div>
              ))}
            </div>

            {result.reasons?.length > 0 && (
              <div className="reasons">
                <h4>⚠️ Why Your Score Isn't Higher</h4>
                {result.reasons.map((reason: string, i: number) => (
                  <div key={i} className="reason-item">
                    <span>•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}

            {result.improvements?.length > 0 && (
              <div className="improvements">
                <h4>✨ How to Improve Your Chances</h4>
                {result.improvements.map((imp: any, i: number) => (
                  <div key={i} className="improvement-item">
                    <div className="improvement-text">{imp.fix}</div>
                    <div className="improvement-impact">{imp.impact}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}