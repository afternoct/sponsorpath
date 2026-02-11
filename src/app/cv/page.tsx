'use client'
// ═══════════════════════════════════════════════════════════════════
// CV PAGE - Upload, ATS Score, Fix to 100/100, Preview, Versions
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCVs, getCV } from '@/lib/supabase'

export default function CVPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cvs, setCvs] = useState<any[]>([])
  const [selectedCV, setSelectedCV] = useState<any>(null)
  const [tab, setTab] = useState<'upload' | 'score' | 'versions'>('upload')
  
  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [rawText, setRawText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  
  // Score state
  const [atsResult, setAtsResult] = useState<any>(null)
  const [scoring, setScoring] = useState(false)
  
  // Fix state
  const [fixing, setFixing] = useState(false)
  const [fixedCV, setFixedCV] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      setUser(session.user)
      
      const { data } = await getCVs(session.user.id)
      if (data) {
        setCvs(data)
        const base = data.find(c => c.version_type === 'base')
        if (base) setSelectedCV(base)
      }
    })
  }, [router])

  const handleFileSelect = (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawText(text)
    }
    reader.readAsText(f)
  }

  const uploadAndScore = async () => {
    if (!file || !user) return
    setUploading(true)
    setScoring(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)

      const res = await fetch('/api/cv/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data.cv) {
        setSelectedCV(data.cv)
        setAtsResult(data.cv)
        setTab('score')
        
        // Reload CVs
        const { data: updated } = await getCVs(user.id)
        if (updated) setCvs(updated)
      }
    } catch (e) {
      console.error(e)
      alert('Upload failed')
    } finally {
      setUploading(false)
      setScoring(false)
    }
  }

  const fixCVTo100 = async () => {
    if (!selectedCV || !user) return
    setFixing(true)

    try {
      const res = await fetch('/api/cv/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId: selectedCV.id,
          userId: user.id
        })
      })

      const data = await res.json()
      if (data.fixedCV) {
        setFixedCV(data.fixedCV)
        setShowPreview(true)
        
        // Reload CVs
        const { data: updated } = await getCVs(user.id)
        if (updated) setCvs(updated)
      }
    } catch (e) {
      console.error(e)
      alert('Fix failed')
    } finally {
      setFixing(false)
    }
  }

  const baseCVs = cvs.filter(c => c.version_type === 'base')
  const fixedCVs = cvs.filter(c => c.version_type === 'fixed')
  const tailoredCVs = cvs.filter(c => c.version_type === 'tailored')

  const currentScore = selectedCV?.ats_score || 0
  const currentGrade = selectedCV?.ats_grade || 'Poor'
  const issues = selectedCV?.issues_json || []

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
        
        .tabs{display:flex;gap:8px;margin-bottom:32px;border-bottom:2px solid #E2E8F0;}
        .tab{padding:12px 24px;background:none;border:none;font-size:15px;font-weight:700;color:#64748B;cursor:pointer;position:relative;font-family:inherit;transition:all .2s;}
        .tab:hover{color:#0F172A;}
        .tab.active{color:#3B82F6;}
        .tab.active::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:2px;background:#3B82F6;}
        
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
        .card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05);}
        .card-title{font-size:20px;font-weight:800;margin-bottom:8px;color:#0F172A;}
        .card-desc{font-size:14px;color:#64748B;line-height:1.6;margin-bottom:24px;}
        
        .upload-zone{border:3px dashed #E2E8F0;border-radius:12px;padding:48px 24px;text-align:center;cursor:pointer;transition:all .3s;background:#F8FAFC;}
        .upload-zone:hover{border-color:#3B82F6;background:#EFF6FF;}
        .upload-zone.has-file{border-color:#10B981;background:#ECFDF5;}
        .upload-icon{font-size:48px;margin-bottom:16px;}
        .upload-title{font-size:18px;font-weight:700;margin-bottom:8px;color:#0F172A;}
        .upload-subtitle{font-size:14px;color:#64748B;margin-bottom:16px;}
        .upload-formats{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}
        .format-badge{padding:6px 12px;background:rgba(59,130,246,.1);color:#3B82F6;border-radius:6px;font-size:12px;font-weight:700;}
        .filename{color:#10B981;font-size:14px;font-weight:700;margin-top:12px;}
        
        .btn{padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:8px;justify-content:center;}
        .btn-primary{background:linear-gradient(135deg,#3B82F6,#1E40AF);color:#fff;box-shadow:0 4px 12px rgba(59,130,246,.3);}
        .btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,.4);}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
        .btn-success{background:linear-gradient(135deg,#10B981,#047857);color:#fff;}
        .btn-success:hover:not(:disabled){transform:translateY(-2px);}
        
        .score-card{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:16px;padding:32px;border:2px solid rgba(59,130,246,.2);}
        .score-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
        .score-number{font-size:64px;font-weight:900;background:linear-gradient(135deg,#3B82F6,#1E40AF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;}
        .score-label{font-size:13px;color:#64748B;margin-top:4px;}
        .grade-badge{padding:8px 16px;border-radius:20px;font-size:14px;font-weight:800;}
        .grade-excellent{background:rgba(16,185,129,.15);color:#047857;}
        .grade-good{background:rgba(59,130,246,.15);color:#1E40AF;}
        .grade-fair{background:rgba(245,158,11,.15);color:#B45309;}
        .grade-poor{background:rgba(239,68,68,.15);color:#B91C1C;}
        
        .progress-bar{height:8px;background:#E2E8F0;border-radius:20px;overflow:hidden;margin-bottom:24px;}
        .progress-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#10B981);border-radius:20px;transition:width 1s ease;}
        
        .issues{margin-bottom:24px;}
        .issue-item{display:flex;align-items:flex-start;gap:12px;padding:12px;background:#fff;border-radius:8px;margin-bottom:8px;}
        .issue-icon{font-size:20px;flex-shrink:0;}
        .issue-text{font-size:14px;color:#0F172A;line-height:1.5;}
        
        .preview-modal{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:1000;padding:24px;}
        .preview-content{background:#fff;border-radius:16px;max-width:900px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;}
        .preview-header{padding:24px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;}
        .preview-header h3{font-size:20px;font-weight:800;color:#0F172A;}
        .close-btn{width:32px;height:32px;border-radius:8px;background:#F1F5F9;border:none;font-size:18px;cursor:pointer;}
        .close-btn:hover{background:#E2E8F0;}
        .preview-body{padding:24px;overflow-y:auto;flex:1;}
        .preview-html{font-size:14px;line-height:1.8;color:#0F172A;}
        
        .cv-versions{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .version-card{background:#fff;border:2px solid #E2E8F0;border-radius:12px;padding:20px;cursor:pointer;transition:all .2s;}
        .version-card:hover{border-color:#3B82F6;box-shadow:0 4px 12px rgba(59,130,246,.15);}
        .version-card.active{border-color:#3B82F6;background:#EFF6FF;}
        .version-badge{display:inline-block;padding:4px 12px;background:rgba(59,130,246,.1);color:#3B82F6;border-radius:6px;font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:12px;}
        .version-badge.fixed{background:rgba(16,185,129,.1);color:#047857;}
        .version-badge.tailored{background:rgba(139,92,246,.1);color:#6D28D9;}
        .version-score{font-size:28px;font-weight:900;color:#0F172A;margin-bottom:4px;}
        .version-date{font-size:12px;color:#64748B;}
        
        .empty{text-align:center;padding:60px 24px;color:#64748B;}
        .empty-icon{font-size:64px;margin-bottom:16px;opacity:.3;}
        .empty h3{font-size:18px;font-weight:700;color:#0F172A;margin-bottom:8px;}
      `}</style>

      <div className="page">
        <div className="page-header">
          <h1>Resume & ATS Center</h1>
          <p>Upload your CV, get your ATS score, and fix it to 100/100 automatically.</p>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            📤 Upload & Score
          </button>
          <button className={`tab ${tab === 'score' ? 'active' : ''}`} onClick={() => setTab('score')}>
            🎯 Score & Fix
          </button>
          <button className={`tab ${tab === 'versions' ? 'active' : ''}`} onClick={() => setTab('versions')}>
            📚 Versions ({cvs.length})
          </button>
        </div>

        {tab === 'upload' && (
          <div className="grid">
            <div className="card">
              <h3 className="card-title">Upload Your CV</h3>
              <p className="card-desc">
                Upload your resume — the engine scores it, extracts your profile, and can fix it to 100/100 automatically.
              </p>

              <div 
                className={`upload-zone ${file ? 'has-file' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) handleFileSelect(f)
                }}
              >
                <div className="upload-icon">{file ? '✅' : '📄'}</div>
                <div className="upload-title">{file ? 'File Loaded' : 'Drop your CV here'}</div>
                <div className="upload-subtitle">{file ? file.name : 'or click to browse'}</div>
                <div className="upload-formats">
                  <span className="format-badge">PDF</span>
                  <span className="format-badge">DOCX</span>
                  <span className="format-badge">TXT</span>
                </div>
                <input 
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  style={{display:'none'}}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                />
              </div>

              <button 
                className="btn btn-primary"
                style={{width:'100%',marginTop:'24px'}}
                onClick={uploadAndScore}
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading & Scoring...' : '🎯 Upload & Get ATS Score'}
              </button>
            </div>

            <div className="card">
              <h3 className="card-title">What We'll Do</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'20px',marginTop:'24px'}}>
                {[
                  {icon:'📊',title:'Extract & Score',desc:'Parse your CV, calculate ATS score (0-100)'},
                  {icon:'🔍',title:'Find Issues',desc:'Identify missing sections, weak bullets, formatting problems'},
                  {icon:'✨',title:'Fix to 100/100',desc:'AI automatically corrects all issues (no download, preview only)'},
                  {icon:'💾',title:'Version Control',desc:'Keep Base, Fixed, and Tailored versions'}
                ].map(item => (
                  <div key={item.icon} style={{display:'flex',gap:'16px'}}>
                    <div style={{fontSize:'32px',flexShrink:0}}>{item.icon}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>{item.title}</div>
                      <div style={{fontSize:'13px',color:'#64748B',lineHeight:1.5}}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'score' && (
          selectedCV ? (
            <div className="grid">
              <div className="card">
                <h3 className="card-title">ATS Score</h3>
                <div className="score-card" style={{marginTop:'24px'}}>
                  <div className="score-header">
                    <div>
                      <div className="score-number">{currentScore}</div>
                      <div className="score-label">out of 100</div>
                    </div>
                    <div className={`grade-badge grade-${currentGrade.toLowerCase()}`}>
                      {currentGrade}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${currentScore}%`}}/>
                  </div>
                  <p style={{fontSize:'14px',color:'#64748B',lineHeight:1.6}}>
                    {currentScore >= 80 ? 'Your CV is ATS-ready! Most companies will accept it.' :
                     currentScore >= 65 ? 'Good score, but there's room for improvement.' :
                     'Below 65, many companies' ATS software will filter your CV before a human sees it.'}
                  </p>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Issues Found</h3>
                <div className="issues" style={{marginTop:'24px'}}>
                  {issues.length === 0 ? (
                    <div style={{textAlign:'center',padding:'40px',color:'#10B981'}}>
                      <div style={{fontSize:'48px',marginBottom:'12px'}}>✅</div>
                      <div style={{fontSize:'16px',fontWeight:700}}>No issues found!</div>
                    </div>
                  ) : issues.map((issue: any, i: number) => (
                    <div key={i} className="issue-item">
                      <div className="issue-icon">{issue.status === 'fail' ? '❌' : '⚠️'}</div>
                      <div className="issue-text">{issue.message}</div>
                    </div>
                  ))}
                </div>

                {currentScore < 100 && (
                  <button
                    className="btn btn-success"
                    style={{width:'100%'}}
                    onClick={fixCVTo100}
                    disabled={fixing}
                  >
                    {fixing ? 'AI is fixing your CV...' : '✨ Fix to 100/100 (AI Auto-Fix)'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty">
                <div className="empty-icon">📄</div>
                <h3>No CV uploaded yet</h3>
                <p>Upload your CV in the Upload tab to get started.</p>
              </div>
            </div>
          )
        )}

        {tab === 'versions' && (
          <div className="card">
            <h3 className="card-title">CV Versions</h3>
            <p className="card-desc">
              Base (original), Fixed (100/100), and Tailored (per job) versions.
            </p>

            {cvs.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📚</div>
                <h3>No CVs yet</h3>
                <p>Upload your first CV to get started.</p>
              </div>
            ) : (
              <div className="cv-versions">
                {cvs.map(cv => (
                  <div
                    key={cv.id}
                    className={`version-card ${selectedCV?.id === cv.id ? 'active' : ''}`}
                    onClick={() => setSelectedCV(cv)}
                  >
                    <div className={`version-badge ${cv.version_type}`}>
                      {cv.version_type}
                    </div>
                    <div className="version-score">{cv.ats_score}/100</div>
                    <div className="version-date">
                      {new Date(cv.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && fixedCV && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <h3>Fixed CV Preview (100/100) — No Download</h3>
              <button className="close-btn" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="preview-body">
              <div className="preview-html" dangerouslySetInnerHTML={{__html: fixedCV.preview_html || fixedCV.raw_text}}/>
            </div>
          </div>
        </div>
      )}
    </>
  )
}