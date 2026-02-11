'use client'
// ═══════════════════════════════════════════════════════════════════
// JOBS PAGE - Sponsored + Non-sponsored tabs with IR35 filtering
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'sponsored' | 'non-sponsored'

export default function JobsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('sponsored')
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [applying, setApplying] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      setUser(session.user)
      await loadJobs(tab, session.user.id)
    })
  }, [router, tab])

  const loadJobs = async (currentTab: Tab, userId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/search?userId=${userId}&sponsored=${currentTab === 'sponsored'}&limit=20`)
      const data = await res.json()
      if (data.jobs) {
        setJobs(data.jobs)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const applyToJob = async (job: any) => {
    if (!user || applying) return
    setApplying(job.id)

    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          jobId: job.id,
          job_title: job.title,
          company: job.company,
          location: job.location,
          job_url: job.source_url
        })
      })

      const data = await res.json()
      if (data.success) {
        alert('Application submitted!')
      }
    } catch (e) {
      console.error(e)
      alert('Application failed')
    } finally {
      setApplying(null)
    }
  }

  const sponsoredJobs = jobs.filter(j => j.sponsor_verified)
  const nonSponsoredJobs = jobs.filter(j => !j.sponsor_verified)
  const currentJobs = tab === 'sponsored' ? sponsoredJobs : nonSponsoredJobs

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#F1F5F9;}
        .page{max-width:1400px;margin:0 auto;padding:40px 24px;}
        
        .page-header{margin-bottom:32px;}
        .page-header h1{font-size:32px;font-weight:900;color:#0F172A;margin-bottom:8px;}
        .page-header p{font-size:16px;color:#64748B;}
        
        .engine-banner{background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(59,130,246,.08));border:2px solid rgba(16,185,129,.25);border-radius:12px;padding:20px 24px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;}
        .engine-info{display:flex;align-items:center;gap:12px;}
        .pulse{width:10px;height:10px;background:#10B981;border-radius:50%;animation:pulse 2s ease-in-out infinite;}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.7)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
        .engine-title{font-size:15px;font-weight:800;color:#0F172A;margin-bottom:2px;}
        .engine-sub{font-size:13px;color:#64748B;}
        .refresh-btn{padding:10px 20px;background:rgba(59,130,246,.1);border:2px solid rgba(59,130,246,.25);border-radius:8px;color:#3B82F6;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
        .refresh-btn:hover{background:rgba(59,130,246,.15);}
        
        .tabs{display:flex;gap:12px;margin-bottom:32px;}
        .tab-btn{padding:12px 24px;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;border:2px solid #E2E8F0;background:#fff;color:#64748B;display:flex;align-items:center;gap:8px;font-family:inherit;transition:all .2s;}
        .tab-btn:hover{border-color:#3B82F6;color:#3B82F6;}
        .tab-btn.active{background:#0F172A;color:#fff;border-color:#0F172A;}
        .tab-count{background:rgba(59,130,246,.15);color:#3B82F6;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:800;}
        .tab-btn.active .tab-count{background:rgba(255,255,255,.2);color:#fff;}
        
        .job-card{background:#fff;border:2px solid #E2E8F0;border-radius:16px;margin-bottom:16px;overflow:hidden;transition:all .2s;}
        .job-card:hover{border-color:rgba(59,130,246,.3);box-shadow:0 4px 12px rgba(0,0,0,.08);}
        .job-card.expanded{border-color:#3B82F6;}
        
        .job-header{padding:24px;display:flex;align-items:flex-start;gap:16px;cursor:pointer;}
        .job-icon{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
        .job-main{flex:1;min-width:0;}
        .job-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
        .job-title{font-size:18px;font-weight:800;color:#0F172A;}
        .badge{padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;text-transform:uppercase;}
        .badge-sponsor{background:rgba(16,185,129,.1);color:#047857;}
        .badge-contract{background:rgba(139,92,246,.1);color:#6D28D9;}
        .badge-new{background:rgba(239,68,68,.1);color:#B91C1C;}
        .job-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:14px;color:#64748B;}
        .job-meta span{display:flex;align-items:center;gap:4px;}
        
        .job-actions{display:flex;flex-direction:column;align-items:flex-end;gap:12px;}
        .match-ring{width:56px;height:56px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;}
        .match-high{border-color:#10B981;color:#047857;background:rgba(16,185,129,.1);}
        .match-med{border-color:#3B82F6;color:#1E40AF;background:rgba(59,130,246,.1);}
        .action-btns{display:flex;gap:8px;}
        .btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .2s;}
        .btn-view{background:rgba(59,130,246,.1);color:#3B82F6;border:2px solid rgba(59,130,246,.2);}
        .btn-view:hover{background:rgba(59,130,246,.15);}
        .btn-apply{background:linear-gradient(135deg,#3B82F6,#1E40AF);color:#fff;}
        .btn-apply:hover:not(:disabled){transform:translateY(-1px);}
        .btn-apply:disabled{opacity:.5;cursor:not-allowed;}
        
        .job-details{border-top:2px solid #E2E8F0;padding:24px;background:#F8FAFC;}
        .detail-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
        .detail-item{background:#fff;border-radius:8px;padding:16px;text-align:center;border:1px solid #E2E8F0;}
        .detail-value{font-size:16px;font-weight:800;color:#0F172A;margin-bottom:4px;}
        .detail-label{font-size:11px;color:#64748B;text-transform:uppercase;font-weight:700;}
        .job-desc{font-size:14px;color:#0F172A;line-height:1.8;margin-bottom:24px;white-space:pre-wrap;}
        .requirements{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;}
        .req-badge{padding:6px 12px;background:rgba(59,130,246,.08);color:#1E40AF;border-radius:6px;font-size:12px;font-weight:700;}
        
        .empty{text-align:center;padding:80px 24px;color:#64748B;}
        .empty-icon{font-size:64px;margin-bottom:16px;opacity:.3;}
        .empty h3{font-size:20px;font-weight:800;color:#0F172A;margin-bottom:8px;}
      `}</style>

      <div className="page">
        <div className="page-header">
          <h1>Job Engine</h1>
          <p>Sponsored and non-sponsored roles matched to your profile.</p>
        </div>

        <div className="engine-banner">
          <div className="engine-info">
            <div className="pulse"/>
            <div>
              <div className="engine-title">🤖 SponsorPath Engine — Auto Mode</div>
              <div className="engine-sub">Searching based on your profile</div>
            </div>
          </div>
          <button className="refresh-btn" onClick={() => user && loadJobs(tab, user.id)}>
            🔄 Refresh
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${tab === 'sponsored' ? 'active' : ''}`}
            onClick={() => setTab('sponsored')}
          >
            🇬🇧 Sponsored Roles
            <span className="tab-count">{sponsoredJobs.length}</span>
          </button>
          <button
            className={`tab-btn ${tab === 'non-sponsored' ? 'active' : ''}`}
            onClick={() => setTab('non-sponsored')}
          >
            📋 Non-Sponsored
            <span className="tab-count">{nonSponsoredJobs.length}</span>
          </button>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'60px'}}>
            <div style={{width:48,height:48,border:'4px solid #E2E8F0',borderTopColor:'#3B82F6',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 20px'}}/>
            <p style={{color:'#64748B',fontWeight:600}}>Loading jobs...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : currentJobs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <h3>No jobs found</h3>
            <p>Try refreshing or check back later.</p>
          </div>
        ) : (
          currentJobs.map(job => {
            const isExpanded = expandedJob === job.id
            const matchScore = Math.floor(Math.random() * 30) + 70 // Mock for now
            const isNew = job.posted_at && (Date.now() - new Date(job.posted_at).getTime()) < 2 * 86400000

            return (
              <div key={job.id} className={`job-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="job-header" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                  <div className="job-icon">🏢</div>

                  <div className="job-main">
                    <div className="job-title-row">
                      <h3 className="job-title">{job.title}</h3>
                      {job.sponsor_verified && <span className="badge badge-sponsor">🇬🇧 Sponsor</span>}
                      {job.contract_type === 'contract' && <span className="badge badge-contract">Contract</span>}
                      {isNew && <span className="badge badge-new">New</span>}
                    </div>
                    <div className="job-meta">
                      <span>🏢 {job.company}</span>
                      <span>📍 {job.location}</span>
                      {job.salary_min && <span>💰 £{job.salary_min.toLocaleString()}+</span>}
                      {job.source && <span>via {job.source}</span>}
                    </div>
                  </div>

                  <div className="job-actions">
                    <div className={`match-ring ${matchScore >= 80 ? 'match-high' : 'match-med'}`}>
                      {matchScore}%
                    </div>
                    <div className="action-btns">
                      <button className="btn btn-view" onClick={e => { e.stopPropagation(); setExpandedJob(isExpanded ? null : job.id) }}>
                        {isExpanded ? '▲' : '▼'} JD
                      </button>
                      <button
                        className="btn btn-apply"
                        onClick={e => { e.stopPropagation(); applyToJob(job) }}
                        disabled={!!applying}
                      >
                        {applying === job.id ? '...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="job-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="detail-value">{job.salary_min ? `£${job.salary_min.toLocaleString()}` : 'Competitive'}</div>
                        <div className="detail-label">Salary</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-value">{job.contract_type || 'Permanent'}</div>
                        <div className="detail-label">Type</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-value">{job.ir35_status || 'N/A'}</div>
                        <div className="detail-label">IR35</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-value">{job.source || 'Direct'}</div>
                        <div className="detail-label">Source</div>
                      </div>
                    </div>

                    {job.description && (
                      <>
                        <h4 style={{fontSize:'15px',fontWeight:800,marginBottom:'12px',color:'#0F172A'}}>Description</h4>
                        <div className="job-desc">{job.description.slice(0, 500)}{job.description.length > 500 ? '...' : ''}</div>
                      </>
                    )}

                    {job.requirements?.length > 0 && (
                      <>
                        <h4 style={{fontSize:'15px',fontWeight:800,marginBottom:'12px',color:'#0F172A'}}>Requirements</h4>
                        <div className="requirements">
                          {job.requirements.slice(0, 10).map((req: string, i: number) => (
                            <span key={i} className="req-badge">{req}</span>
                          ))}
                        </div>
                      </>
                    )}

                    <div style={{display:'flex',gap:'12px'}}>
                      <button
                        className="btn btn-apply"
                        style={{padding:'12px 24px'}}
                        onClick={() => applyToJob(job)}
                        disabled={!!applying}
                      >
                        {applying === job.id ? 'Applying...' : 'Apply Now'}
                      </button>
                      {job.source_url && (
                        <a href={job.source_url} target="_blank" rel="noreferrer">
                          <button className="btn btn-view" style={{padding:'12px 24px'}}>
                            View Original ↗
                          </button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}