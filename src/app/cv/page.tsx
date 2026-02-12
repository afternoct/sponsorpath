// ============================================================
// FILE: src/app/cv/page.tsx
// ============================================================
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase, getCVs } from '@/lib/supabase'

const getGrade=(s:number)=>s>=85?{g:'A+',c:'#10b981',msg:'Excellent - passes most ATS filters'}:s>=75?{g:'A',c:'#10b981',msg:'Good - strong application'}:s>=65?{g:'B',c:'#4f8ef7',msg:'Fair - some improvements needed'}:s>=50?{g:'C',c:'#f59e0b',msg:'Below average - needs work'}:{g:'D',c:'#ef4444',msg:'Needs significant improvement'}

type Tab = 'upload'|'score'|'master'|'versions'

export default function CVPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('upload')
  const [cvs, setCvs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [autofilled, setAutofilled] = useState(false)
  const [preview, setPreview] = useState<string|null>(null)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Master CV builder form
  const [masterForm, setMasterForm] = useState({
    name:'', email:'', phone:'', linkedin:'', summary:'',
    experience:'', education:'', skills:'', projects:''
  })
  const [buildingMaster, setBuildingMaster] = useState(false)
  const [masterDone, setMasterDone] = useState(false)

  const base  = cvs.find(c=>c.version_type==='base')
  const fixed = cvs.find(c=>c.version_type==='fixed')
  const score = base?.ats_score||0
  const issues: string[] = base?.issues_json
    ? (typeof base.issues_json==='string' ? JSON.parse(base.issues_json) : base.issues_json)
    : []
  const passed: string[] = base?.parsed_json?.passed||[]
  const { g:grade, c:gradeColor, msg:gradeMsg } = getGrade(score)
  const circ = 2*Math.PI*44
  const dashOff = circ-(score/100)*circ

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/signin');return}
      setUserId(session.user.id)
      const [{data:cvData},{data:prof}] = await Promise.all([
        getCVs(session.user.id),
        supabase.from('profiles').select('*').eq('user_id',session.user.id).single(),
      ])
      if(cvData){
        setCvs(cvData)
        if(cvData.length>0) setTab('score')
      }
      if(prof){
        setProfile(prof)
        setMasterForm(p=>({
          ...p,
          name:prof.full_name||'', email:prof.email||'', phone:prof.phone||'',
          linkedin:prof.linkedin_url||'',
        }))
      }
      setTimeout(()=>setVisible(true),60)
    })
  },[router])

  const handleFile = async(file:File)=>{
    if(!file) return
    const ok=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']
    if(!ok.includes(file.type)){setError('Please upload PDF, DOCX, or TXT');return}
    setUploading(true);setError('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session) return
      const fd=new FormData()
      fd.append('file',file)
      fd.append('userId',session.user.id)
      const r=await fetch('/api/cv/upload',{method:'POST',body:fd})
      const d=await r.json()
      if(!r.ok) throw new Error(d.error||'Upload failed')
      const {data:newCvs}=await getCVs(session.user.id)
      if(newCvs) setCvs(newCvs)
      if(d.autofilled) setAutofilled(true)
      setTab('score')
    }catch(e:any){setError(e.message||'Upload failed')}
    setUploading(false)
  }

  const handleFix = async()=>{
    if(!base) return
    setFixing(true);setError('')
    try{
      const r=await fetch('/api/cv/fix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,cvId:base.id})})
      const d=await r.json()
      if(!r.ok) throw new Error(d.error||'Fix failed')
      const {data:newCvs}=await getCVs(userId)
      if(newCvs) setCvs(newCvs)
      if(d.preview_html) setPreview(d.preview_html)
      setTab('versions')
    }catch(e:any){setError(e.message||'Fix failed')}
    setFixing(false)
  }

  const handleBuildMaster = async()=>{
    if(!masterForm.name||!masterForm.email){setError('At minimum add your name and email');return}
    setBuildingMaster(true);setError('')
    try{
      // Build CV text from form
      const cvText = [
        masterForm.name,
        [masterForm.email, masterForm.phone, masterForm.linkedin].filter(Boolean).join(' | '),
        '',
        masterForm.summary ? 'PROFESSIONAL SUMMARY\n'+masterForm.summary : '',
        masterForm.experience ? 'EXPERIENCE\n'+masterForm.experience : '',
        masterForm.education ? 'EDUCATION\n'+masterForm.education : '',
        masterForm.skills ? 'SKILLS\n'+masterForm.skills : '',
        masterForm.projects ? 'PROJECTS\n'+masterForm.projects : '',
      ].filter(Boolean).join('\n\n')

      // Save as a blob and upload
      const blob = new Blob([cvText],{type:'text/plain'})
      const file = new File([blob],'master-cv.txt',{type:'text/plain'})
      const fd = new FormData()
      fd.append('file',file)
      fd.append('userId',userId)
      const r = await fetch('/api/cv/upload',{method:'POST',body:fd})
      const d = await r.json()
      if(!r.ok) throw new Error(d.error||'Build failed')
      const {data:newCvs}=await getCVs(userId)
      if(newCvs) setCvs(newCvs)
      setMasterDone(true)
      setTab('score')
    }catch(e:any){setError(e.message||'Build failed')}
    setBuildingMaster(false)
  }

  const mf=(k:string)=>(v:string)=>setMasterForm(p=>({...p,[k]:v}))

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Sora:wght@700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .lay{display:flex;min-height:100vh;}
        .mn{margin-left:230px;flex:1;padding:28px 34px;opacity:0;transition:opacity .3s;}
        .mn.v{opacity:1;}
        .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;}
        .ptitle{font-family:'Sora',sans-serif;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.5px;}
        .psub{font-size:13.5px;color:#64748b;margin-top:4px;}
        .tabs{display:flex;gap:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:5px;margin-bottom:22px;}
        .tab{flex:1;padding:9px 12px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;border:none;background:transparent;color:#64748b;font-family:inherit;transition:all .2s;text-align:center;}
        .tab.on{background:#0f172a;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15);}
        .success-bar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;font-size:13px;font-weight:700;color:#065f46;margin-bottom:16px;}
        .err-bar{padding:11px 16px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;font-size:13px;font-weight:600;color:#dc2626;margin-bottom:16px;}
        .card{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:26px;box-shadow:0 2px 12px rgba(0,0,0,.05);}
        .two-col{display:grid;grid-template-columns:1fr 1.5fr;gap:20px;}
        .score-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:18px;}
        .score-circ{position:relative;width:120px;height:120px;}
        .score-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .score-num{font-family:'Sora',sans-serif;font-size:28px;font-weight:900;line-height:1;}
        .score-sub{font-size:11px;color:#94a3b8;font-weight:600;}
        .grade-big{font-family:'Sora',sans-serif;font-size:40px;font-weight:900;line-height:1;margin-bottom:4px;}
        .grade-msg{font-size:13px;color:#64748b;font-weight:600;text-align:center;max-width:180px;line-height:1.4;}
        .prog{height:8px;background:#f1f5f9;border-radius:20px;overflow:hidden;margin:14px 0;}
        .prog-f{height:100%;border-radius:20px;transition:width 1s ease;}
        .fix-btn{width:100%;padding:13px;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .2s;box-shadow:0 4px 14px rgba(245,158,11,.3);}
        .fix-btn:hover{transform:translateY(-1px);}
        .fix-btn:disabled{opacity:.7;cursor:not-allowed;}
        .issues-title{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0f172a;margin-bottom:12px;}
        .issue-row{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-radius:8px;margin-bottom:6px;}
        .i-fail{background:#fff5f5;border:1px solid #fecaca;}
        .i-ok{background:#f0fdf4;border:1px solid #a7f3d0;}
        .i-text{font-size:13px;color:#374151;font-weight:600;}
        .upload-zone{border:2px dashed #cbd5e1;border-radius:12px;padding:52px 32px;text-align:center;cursor:pointer;transition:all .25s;background:#fafbfc;}
        .upload-zone:hover,.upload-zone.drag{border-color:#4f8ef7;background:#f0f7ff;}
        .spinner-sm{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;vertical-align:middle;}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
        .form-full{grid-column:1/-1;}
        .flbl{font-size:12px;font-weight:700;color:#374151;margin-bottom:5px;display:block;}
        .finp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;font-family:inherit;outline:none;transition:border .2s;}
        .finp:focus{border-color:#4f8ef7;}
        .fta{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;font-family:inherit;outline:none;resize:vertical;transition:border .2s;min-height:80px;}
        .fta:focus{border-color:#4f8ef7;}
        .build-btn{width:100%;padding:13px;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(79,142,247,.28);transition:all .2s;margin-top:6px;}
        .build-btn:hover{transform:translateY(-1px);}
        .build-btn:disabled{opacity:.7;cursor:not-allowed;}
        .ver-row{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff;border:1.5px solid #e8edf3;border-radius:11px;margin-bottom:10px;transition:all .2s;}
        .ver-row:hover{border-color:rgba(79,142,247,.3);}
        .ver-title{font-size:13.5px;font-weight:700;color:#0f172a;margin-bottom:2px;}
        .ver-sub{font-size:11.5px;color:#94a3b8;}
        .ver-score{font-family:'Sora',sans-serif;font-size:20px;font-weight:900;}
        .prev-btn{padding:7px 14px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;background:#fff;color:#374151;transition:all .2s;}
        .prev-btn:hover{border-color:#4f8ef7;color:#4f8ef7;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999;display:flex;align-items:center;justify-content:center;}
        .ov-box{background:#fff;border-radius:16px;width:90%;max-width:860px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;}
        .ov-head{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid #e2e8f0;}
        .ov-title{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0f172a;}
        .ov-body{flex:1;overflow:auto;}
        .tip-box{background:#eff6ff;border:1.5px solid rgba(59,130,246,.2);border-radius:10px;padding:12px 16px;font-size:12.5px;color:#1d4ed8;margin-bottom:18px;line-height:1.6;}
      `}</style>

      <div className="lay">
        <Sidebar/>
        <main className={`mn${visible?' v':''}`}>
          <div className="ph">
            <div>
              <div className="ptitle">Resume & ATS</div>
              <div className="psub">Upload your CV, score it, fix issues, and build a master CV for UK employer filters.</div>
            </div>
            {autofilled&&<div className="success-bar">Profile auto-filled from your CV!</div>}
          </div>

          {error&&<div className="err-bar">{error}</div>}
          {masterDone&&<div className="success-bar">Master CV built and scored!</div>}

          <div className="tabs">
            {([
              {k:'upload',  l:'Upload CV'},
              {k:'score',   l:'Score & Fix'},
              {k:'master',  l:'Build Master CV'},
              {k:'versions',l:'My Versions'},
            ] as {k:Tab,l:string}[]).map(t=>(
              <button key={t.k} className={`tab${tab===t.k?' on':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>
            ))}
          </div>

          {/* ─── UPLOAD TAB ─── */}
          {tab==='upload'&&(
            <div className="card" style={{animation:'fadeUp .4s ease both'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>Upload Your CV</div>
              <div style={{fontSize:13.5,color:'#64748b',marginBottom:20,lineHeight:1.6}}>
                We extract text, score against ATS criteria, and auto-fill your profile. Best results with PDF or TXT.
              </div>
              {uploading ? (
                <div style={{textAlign:'center',padding:'50px 0'}}>
                  <div style={{width:40,height:40,border:'3px solid #e2e8f0',borderTopColor:'#4f8ef7',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 14px'}}/>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>Scoring your CV...</div>
                  <div style={{fontSize:13,color:'#64748b'}}>Extracting text and running ATS checks</div>
                </div>
              ) : (
                <>
                  <div
                    className={`upload-zone${dragging?' drag':''}`}
                    onDragOver={e=>{e.preventDefault();setDragging(true)}}
                    onDragLeave={()=>setDragging(false)}
                    onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f)}}
                    onClick={()=>fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
                    <div style={{fontSize:44,marginBottom:14}}>📄</div>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:6}}>Drop your CV here</div>
                    <div style={{fontSize:13.5,color:'#94a3b8',marginBottom:18}}>or click to browse - PDF, DOCX, or TXT</div>
                    <button onClick={e=>{e.stopPropagation();fileRef.current?.click()}} style={{padding:'10px 28px',background:'linear-gradient(135deg,#4f8ef7,#6366f1)',color:'#fff',border:'none',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      Choose File
                    </button>
                  </div>
                  <div style={{marginTop:14,padding:'11px 16px',background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:9,fontSize:12.5,color:'#92400e',fontWeight:600}}>
                    Tip: If your PDF score seems wrong, save your CV as a .txt file and upload that for best accuracy.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── SCORE & FIX TAB ─── */}
          {tab==='score'&&(
            !base ? (
              <div className="card" style={{textAlign:'center',padding:'60px 0',animation:'fadeUp .4s ease both'}}>
                <div style={{fontSize:44,marginBottom:12,opacity:.2}}>📊</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:8}}>No CV Uploaded Yet</div>
                <div style={{fontSize:13.5,color:'#64748b',marginBottom:18}}>Upload your CV or build one from scratch</div>
                <div style={{display:'flex',gap:12,justifyContent:'center'}}>
                  <button onClick={()=>setTab('upload')} style={{padding:'10px 22px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',border:'none',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Upload CV</button>
                  <button onClick={()=>setTab('master')} style={{padding:'10px 22px',background:'#fff',color:'#374151',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Build from Scratch</button>
                </div>
              </div>
            ) : (
              <div className="two-col" style={{animation:'fadeUp .4s ease both'}}>
                <div className="card">
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:20}}>ATS Score</div>
                  <div className="score-wrap">
                    <div className="score-circ">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="44" fill="none" stroke="#f1f5f9" strokeWidth="11"/>
                        <circle cx="60" cy="60" r="44" fill="none"
                          stroke={gradeColor} strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={dashOff}
                          style={{transform:'rotate(-90deg)',transformOrigin:'60px 60px',transition:'stroke-dashoffset 1.2s ease'}}
                        />
                      </svg>
                      <div className="score-inner">
                        <div className="score-num" style={{color:gradeColor}}>{score}</div>
                        <div className="score-sub">/ 100</div>
                      </div>
                    </div>
                    <div className="grade-big" style={{color:gradeColor,marginTop:10}}>{grade}</div>
                    <div className="grade-msg">{gradeMsg}</div>
                  </div>
                  <div className="prog"><div className="prog-f" style={{width:`${score}%`,background:gradeColor}}/></div>
                  {fixed&&(
                    <div style={{padding:'10px 14px',background:'#ecfdf5',border:'1.5px solid #a7f3d0',borderRadius:9,fontSize:13,fontWeight:700,color:'#065f46',marginBottom:14}}>
                      Fixed version ready: {fixed.ats_score}/100 - see My Versions tab
                    </div>
                  )}
                  <button
                    className="fix-btn"
                    style={{background:score>=85?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff'}}
                    disabled={fixing}
                    onClick={handleFix}
                  >
                    {fixing?<><span className="spinner-sm"/>Fixing...</>:score>=85?'Export Fixed CV':'Fix CV Issues'}
                  </button>
                </div>

                <div className="card">
                  {issues.length>0&&(
                    <>
                      <div className="issues-title">Issues to Fix ({issues.length})</div>
                      {issues.map((iss:string,i:number)=>(
                        <div key={i} className="issue-row i-fail">
                          <span style={{fontSize:15}}>⚠️</span>
                          <span className="i-text">{iss}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {passed.length>0&&(
                    <div style={{marginTop:issues.length>0?18:0}}>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:10}}>Passed ({passed.length})</div>
                      {passed.map((p:string,i:number)=>(
                        <div key={i} className="issue-row i-ok">
                          <span style={{fontSize:15}}>✅</span>
                          <span className="i-text">{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {issues.length===0&&passed.length===0&&(
                    <div style={{textAlign:'center',padding:'40px 0',color:'#94a3b8',fontSize:14}}>No detailed breakdown available</div>
                  )}
                </div>
              </div>
            )
          )}

          {/* ─── MASTER CV BUILDER TAB ─── */}
          {tab==='master'&&(
            <div className="card" style={{animation:'fadeUp .4s ease both',maxWidth:820}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:6}}>Build Master CV</div>
              <div style={{fontSize:13.5,color:'#64748b',marginBottom:18}}>
                Fill in your details below. We will score it against ATS criteria and show you exactly what to fix.
              </div>
              <div className="tip-box">
                Your master CV is a complete record of all your experience. We use it to tailor applications for specific roles in the Job Engine.
              </div>
              <div className="form-grid">
                <div>
                  <label className="flbl">Full Name *</label>
                  <input className="finp" placeholder="Shreyas Nagamalla" value={masterForm.name} onChange={e=>mf('name')(e.target.value)}/>
                </div>
                <div>
                  <label className="flbl">Email *</label>
                  <input className="finp" placeholder="you@email.com" value={masterForm.email} onChange={e=>mf('email')(e.target.value)}/>
                </div>
                <div>
                  <label className="flbl">Phone</label>
                  <input className="finp" placeholder="+44 7700 000000" value={masterForm.phone} onChange={e=>mf('phone')(e.target.value)}/>
                </div>
                <div>
                  <label className="flbl">LinkedIn URL</label>
                  <input className="finp" placeholder="linkedin.com/in/yourprofile" value={masterForm.linkedin} onChange={e=>mf('linkedin')(e.target.value)}/>
                </div>
                <div className="form-full">
                  <label className="flbl">Professional Summary</label>
                  <textarea className="fta" placeholder="2-3 sentences about your background, key skills, and what you are looking for..." value={masterForm.summary} onChange={e=>mf('summary')(e.target.value)} style={{minHeight:80}}/>
                </div>
                <div className="form-full">
                  <label className="flbl">Experience</label>
                  <textarea className="fta" placeholder="Job Title, Company, Dates&#10;• Achieved X by doing Y, resulting in Z&#10;• Reduced costs by 20% through...&#10;&#10;Next role..." value={masterForm.experience} onChange={e=>mf('experience')(e.target.value)} style={{minHeight:150}}/>
                </div>
                <div className="form-full">
                  <label className="flbl">Education</label>
                  <textarea className="fta" placeholder="MSc Mechanical Engineering, University of Greenwich, 2024-2026&#10;BEng Mechanical Engineering, 2019-2023" value={masterForm.education} onChange={e=>mf('education')(e.target.value)} style={{minHeight:80}}/>
                </div>
                <div className="form-full">
                  <label className="flbl">Skills</label>
                  <textarea className="fta" placeholder="SolidWorks, AutoCAD, MATLAB, Ansys, Python, Microsoft Office, HVAC, Lean Manufacturing..." value={masterForm.skills} onChange={e=>mf('skills')(e.target.value)} style={{minHeight:70}}/>
                </div>
                <div className="form-full">
                  <label className="flbl">Projects (optional)</label>
                  <textarea className="fta" placeholder="Project Title, Date&#10;• What you built/researched and the outcome..." value={masterForm.projects} onChange={e=>mf('projects')(e.target.value)} style={{minHeight:100}}/>
                </div>
              </div>
              <button className="build-btn" disabled={buildingMaster} onClick={handleBuildMaster}>
                {buildingMaster?<><span className="spinner-sm"/>Building & Scoring...</>:'Build Master CV + Get ATS Score'}
              </button>
            </div>
          )}

          {/* ─── MY VERSIONS TAB ─── */}
          {tab==='versions'&&(
            <div className="card" style={{animation:'fadeUp .4s ease both'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a'}}>My CV Versions</div>
                <div style={{fontSize:12.5,color:'#64748b',fontWeight:600}}>Original uploaded + fixed versions appear here</div>
              </div>
              {cvs.length===0 ? (
                <div style={{textAlign:'center',padding:'50px 0',color:'#94a3b8'}}>
                  <div style={{fontSize:36,marginBottom:10,opacity:.25}}>📁</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:8}}>No CVs yet</div>
                  <div style={{fontSize:13,marginBottom:14}}>Upload your CV or build one from scratch</div>
                  <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                    <button onClick={()=>setTab('upload')} style={{padding:'9px 20px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Upload CV</button>
                    <button onClick={()=>setTab('master')} style={{padding:'9px 20px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:'#fff',color:'#374151'}}>Build CV</button>
                  </div>
                </div>
              ) : cvs.map((cv:any,i:number)=>{
                const {g,c}=getGrade(cv.ats_score||0)
                const label=cv.version_type==='base'?'Original CV':cv.version_type==='fixed'?'Fixed CV':'Master CV'
                const icon=cv.version_type==='base'?'📄':cv.version_type==='fixed'?'⚡':'🏆'
                const desc=cv.version_type==='base'?'Your uploaded CV':cv.version_type==='fixed'?'ATS-optimised version':'Built from your profile data'
                const date=new Date(cv.updated_at||cv.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
                return(
                  <div key={i} className="ver-row">
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:42,height:42,borderRadius:10,background:'#f8fafc',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{icon}</div>
                      <div>
                        <div className="ver-title">{label}</div>
                        <div className="ver-sub">{cv.file_name||'CV'} - {date}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:14}}>
                      <div className="ver-score" style={{color:c}}>{cv.ats_score||0}<span style={{fontSize:12,fontWeight:600,color:'#94a3b8'}}>/100 {g}</span></div>
                      {cv.preview_html&&<button className="prev-btn" onClick={()=>setPreview(cv.preview_html)}>Preview</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {preview&&(
        <div className="overlay" onClick={()=>setPreview(null)}>
          <div className="ov-box" onClick={e=>e.stopPropagation()}>
            <div className="ov-head">
              <div className="ov-title">CV Preview</div>
              <button onClick={()=>setPreview(null)} style={{padding:'5px 12px',border:'1.5px solid #e2e8f0',borderRadius:7,fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>Close</button>
            </div>
            <div className="ov-body">
              <iframe srcDoc={preview} style={{width:'100%',height:'72vh',border:'none'}} title="CV Preview"/>
            </div>
          </div>
        </div>
      )}
    </>
  )
}