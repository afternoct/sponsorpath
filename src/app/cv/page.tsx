// ============================================================
// FILE: src/app/cv/page.tsx
// PDF extracted CLIENT-SIDE via PDF.js — no server PDF parsing
// ============================================================
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase, getCVs } from '@/lib/supabase'

declare global { interface Window { pdfjsLib: any } }

const G = (s:number) => s>=85?{g:'A+',c:'#10b981',m:'Excellent — passes most ATS filters'}
                       :s>=75?{g:'A', c:'#10b981',m:'Good — strong application'}
                       :s>=65?{g:'B', c:'#4f8ef7',m:'Fair — some improvements needed'}
                       :s>=50?{g:'C', c:'#f59e0b',m:'Below average — needs work'}
                             :{g:'D', c:'#ef4444',m:'Needs significant improvement'}

type Tab = 'upload'|'score'|'master'|'versions'

export default function CVPage() {
  const router = useRouter()
  const [tab, setTab]     = useState<Tab>('upload')
  const [cvs, setCvs]     = useState<any[]>([])
  const [busy, setBusy]   = useState(false)
  const [fixing, setFixing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [autofilled, setAutofilled] = useState(false)
  const [preview, setPreview] = useState<string|null>(null)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const [userId, setUserId] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState('')

  const [mf, setMf] = useState({ name:'',email:'',phone:'',linkedin:'',summary:'',experience:'',education:'',skills:'',projects:'' })
  const [masterDone, setMasterDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const base   = cvs.find(c=>c.version_type==='base')
  const fixed  = cvs.find(c=>c.version_type==='fixed')
  const score  = base?.ats_score||0
  const issues: string[] = Array.isArray(base?.issues_json) ? base.issues_json : []
  const passed: string[] = base?.parsed_json?.passed||[]
  const {g:grade,c:gc,m:gm} = G(score)
  const circ = 2*Math.PI*44
  const dash = circ - (score/100)*circ

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/signin');return}
      setUserId(session.user.id)
      const [{data:cvData},{data:prof}] = await Promise.all([
        getCVs(session.user.id),
        supabase.from('profiles').select('*').eq('user_id',session.user.id).single(),
      ])
      if(cvData?.length){ setCvs(cvData); setTab('score') }
      if(prof) setMf(p=>({...p,name:prof.full_name||'',email:prof.email||'',phone:prof.phone||'',linkedin:prof.linkedin_url||''}))
      setTimeout(()=>setVisible(true),60)
    })
  },[router])

  // ── PDF.js text extraction ─────────────────────────────
  const loadPDFJS = (): Promise<any> => new Promise((res,rej)=>{
    if(window.pdfjsLib){ res(window.pdfjsLib); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = ()=>{
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      res(window.pdfjsLib)
    }
    s.onerror = ()=>rej(new Error('Could not load PDF.js'))
    document.head.appendChild(s)
  })

  const extractPDFText = async(file: File): Promise<string> => {
    setExtractProgress('Loading PDF reader...')
    const pdfjsLib = await loadPDFJS()
    const arrayBuf = await file.arrayBuffer()
    setExtractProgress('Reading PDF pages...')
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise
    const numPages = pdf.numPages
    const textParts: string[] = []
    for(let p=1; p<=numPages; p++){
      setExtractProgress(`Extracting page ${p} of ${numPages}...`)
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      // Preserve line breaks by grouping items by Y position
      const items = content.items as any[]
      let lastY = -1
      let line = ''
      for(const item of items){
        const y = Math.round(item.transform[5])
        if(lastY !== -1 && Math.abs(y - lastY) > 3 && line.trim()){
          textParts.push(line.trim())
          line = ''
        }
        line += item.str + ' '
        lastY = y
      }
      if(line.trim()) textParts.push(line.trim())
    }
    return textParts.join('\n')
  }

  const processFile = async(file: File)=>{
    setError(''); setBusy(true)
    try{
      const {data:{session}} = await supabase.auth.getSession()
      if(!session) return
      let text = ''
      const fname = file.name.toLowerCase()
      if(fname.endsWith('.txt')){
        setExtractProgress('Reading text file...')
        text = await file.text()
      } else if(fname.endsWith('.pdf')){
        setExtracting(true)
        text = await extractPDFText(file)
        setExtracting(false)
      } else if(fname.endsWith('.docx')){
        setExtractProgress('Reading DOCX...')
        // Read DOCX XML for text
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        const CHUNK = 4096; let raw = ''
        for(let i=0;i<bytes.length;i+=CHUNK) raw += String.fromCharCode(...bytes.subarray(i,Math.min(i+CHUNK,bytes.length)))
        const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)||[]
        text = matches.map(m=>m.replace(/<[^>]+>/g,'')).join(' ')
      } else {
        text = await file.text()
      }

      if(!text||text.trim().length<30){
        throw new Error('Could not extract text. Please save your CV as .txt and re-upload.')
      }

      setExtractProgress('Scoring against ATS criteria...')
      const r = await fetch('/api/cv/analyse',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text, userId: session.user.id, fileName: file.name }),
      })
      const d = await r.json()
      if(!r.ok) throw new Error(d.error||'Analysis failed')
      const {data:newCvs} = await getCVs(session.user.id)
      if(newCvs) setCvs(newCvs)
      if(d.autofilled) setAutofilled(true)
      setTab('score')
    }catch(e:any){ setError(e.message||'Failed') }
    setBusy(false); setExtracting(false); setExtractProgress('')
  }

  const handleFix = async()=>{
    if(!base) return
    setFixing(true); setError('')
    try{
      const r = await fetch('/api/cv/fix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,cvId:base.id})})
      const d = await r.json()
      if(!r.ok) throw new Error(d.error||'Fix failed')
      const {data:newCvs} = await getCVs(userId)
      if(newCvs) setCvs(newCvs)
      if(d.preview_html) setPreview(d.preview_html)
      setTab('versions')
    }catch(e:any){ setError(e.message||'Fix failed') }
    setFixing(false)
  }

  const handleBuildMaster = async()=>{
    if(!mf.name||!mf.email){setError('Name and email are required');return}
    setBusy(true); setError('')
    try{
      const text = [mf.name, [mf.email,mf.phone,mf.linkedin].filter(Boolean).join(' | '), '',
        mf.summary?'PROFESSIONAL SUMMARY\n'+mf.summary:'',
        mf.experience?'EXPERIENCE\n'+mf.experience:'',
        mf.education?'EDUCATION\n'+mf.education:'',
        mf.skills?'SKILLS\n'+mf.skills:'',
        mf.projects?'PROJECTS\n'+mf.projects:'',
      ].filter(Boolean).join('\n\n')
      const r = await fetch('/api/cv/analyse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,userId,fileName:'master-cv.txt'})})
      const d = await r.json()
      if(!r.ok) throw new Error(d.error||'Build failed')
      const {data:newCvs} = await getCVs(userId)
      if(newCvs) setCvs(newCvs)
      setMasterDone(true); setTab('score')
    }catch(e:any){ setError(e.message||'Build failed') }
    setBusy(false)
  }

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Sora:wght@700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        .lay{display:flex;min-height:100vh;}
        .mn{margin-left:230px;flex:1;padding:28px 34px;opacity:0;transition:opacity .3s;}
        .mn.v{opacity:1;}
        .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;}
        .title{font-family:'Sora',sans-serif;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.5px;}
        .sub{font-size:13.5px;color:#64748b;margin-top:4px;}
        .tabs{display:flex;gap:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:5px;margin-bottom:22px;}
        .tab{flex:1;padding:9px 8px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;border:none;background:transparent;color:#64748b;font-family:inherit;transition:all .2s;text-align:center;}
        .tab.on{background:#0f172a;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15);}
        .ok-bar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;font-size:13px;font-weight:700;color:#065f46;margin-bottom:16px;}
        .err-bar{padding:11px 16px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;font-size:13px;font-weight:600;color:#dc2626;margin-bottom:16px;}
        .card{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:26px;box-shadow:0 2px 12px rgba(0,0,0,.05);}
        .two{display:grid;grid-template-columns:1fr 1.5fr;gap:20px;}
        .score-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:16px;}
        .score-pos{position:relative;width:120px;height:120px;}
        .score-abs{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .s-num{font-family:'Sora',sans-serif;font-size:28px;font-weight:900;line-height:1;}
        .s-sub{font-size:11px;color:#94a3b8;font-weight:600;}
        .g-big{font-family:'Sora',sans-serif;font-size:40px;font-weight:900;margin-top:10px;}
        .g-msg{font-size:13px;color:#64748b;font-weight:600;text-align:center;max-width:180px;margin-top:4px;line-height:1.4;}
        .prog{height:8px;background:#f1f5f9;border-radius:20px;overflow:hidden;margin:14px 0;}
        .prog-f{height:100%;border-radius:20px;transition:width 1s ease;}
        .fix-btn{width:100%;padding:13px;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .2s;color:#fff;}
        .fix-btn:hover{transform:translateY(-1px);}
        .fix-btn:disabled{opacity:.7;cursor:not-allowed;}
        .it{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0f172a;margin-bottom:12px;}
        .irow{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-radius:8px;margin-bottom:6px;font-size:13px;font-weight:600;}
        .irow.fail{background:#fff5f5;border:1px solid #fecaca;color:#374151;}
        .irow.ok{background:#f0fdf4;border:1px solid #a7f3d0;color:#065f46;}
        .zone{border:2px dashed #cbd5e1;border-radius:12px;padding:52px 28px;text-align:center;cursor:pointer;transition:all .25s;background:#fafbfc;}
        .zone:hover,.zone.drag{border-color:#4f8ef7;background:#f0f7ff;}
        .ext-state{text-align:center;padding:48px 0;}
        .ext-spin{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 14px;}
        .ext-prog{font-size:12.5px;color:#64748b;margin-top:6px;animation:pulse 1.5s infinite;}
        .flbl{font-size:12px;font-weight:700;color:#374151;margin-bottom:5px;display:block;}
        .finp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;font-family:inherit;outline:none;transition:border .2s;}
        .finp:focus{border-color:#4f8ef7;}
        .fta{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;font-family:inherit;outline:none;resize:vertical;min-height:80px;transition:border .2s;}
        .fta:focus{border-color:#4f8ef7;}
        .fg{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
        .ff{grid-column:1/-1;}
        .bbtn{width:100%;padding:13px;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(79,142,247,.28);transition:all .2s;margin-top:6px;}
        .bbtn:hover{transform:translateY(-1px);}
        .bbtn:disabled{opacity:.7;cursor:not-allowed;}
        .vrow{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff;border:1.5px solid #e8edf3;border-radius:11px;margin-bottom:10px;}
        .vrow:hover{border-color:rgba(79,142,247,.3);}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999;display:flex;align-items:center;justify-content:center;}
        .ov{background:#fff;border-radius:16px;width:90%;max-width:860px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;}
        .ov-h{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid #e2e8f0;}
        .tip{background:#eff6ff;border:1.5px solid rgba(59,130,246,.2);border-radius:10px;padding:12px 16px;font-size:12.5px;color:#1d4ed8;margin-bottom:18px;line-height:1.6;}
        .sm{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;vertical-align:middle;}
      `}</style>

      <div className="lay">
        <Sidebar/>
        <main className={`mn${visible?' v':''}`}>
          <div className="ph">
            <div>
              <div className="title">Resume & ATS</div>
              <div className="sub">Upload, score, and fix your CV to pass employer ATS filters.</div>
            </div>
            {autofilled&&<div className="ok-bar">Profile auto-filled from your CV!</div>}
            {masterDone&&<div className="ok-bar">Master CV built and scored!</div>}
          </div>

          {error&&<div className="err-bar">{error}</div>}

          <div className="tabs">
            {([['upload','Upload CV'],['score','Score & Fix'],['master','Build Master CV'],['versions','My Versions']] as [Tab,string][]).map(([k,l])=>(
              <button key={k} className={`tab${tab===k?' on':''}`} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>

          {/* ── UPLOAD ── */}
          {tab==='upload'&&(
            <div className="card" style={{animation:'fadeUp .4s ease both'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>Upload Your CV</div>
              <div style={{fontSize:13.5,color:'#64748b',marginBottom:20,lineHeight:1.6}}>
                PDF text is extracted directly in your browser for 100% accuracy, then scored against ATS criteria.
              </div>
              {busy ? (
                <div className="ext-state">
                  <div className="ext-spin"/>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:4}}>
                    {extracting?'Extracting PDF text...':'Scoring your CV...'}
                  </div>
                  <div className="ext-prog">{extractProgress}</div>
                </div>
              ) : (
                <>
                  <div
                    className={`zone${dragging?' drag':''}`}
                    onDragOver={e=>{e.preventDefault();setDragging(true)}}
                    onDragLeave={()=>setDragging(false)}
                    onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)processFile(f)}}
                    onClick={()=>fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&processFile(e.target.files[0])}/>
                    <div style={{fontSize:44,marginBottom:14}}>📄</div>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:6}}>Drop your CV here</div>
                    <div style={{fontSize:13.5,color:'#94a3b8',marginBottom:18}}>or click to browse - PDF, DOCX, or TXT</div>
                    <button onClick={e=>{e.stopPropagation();fileRef.current?.click()}} style={{padding:'10px 28px',background:'linear-gradient(135deg,#4f8ef7,#6366f1)',color:'#fff',border:'none',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      Choose File
                    </button>
                  </div>
                  <div style={{marginTop:14,padding:'10px 16px',background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:9,fontSize:12.5,color:'#92400e',fontWeight:600,lineHeight:1.5}}>
                    PDF text is read directly in your browser — no server conversion. For best results upload PDF or TXT.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── SCORE ── */}
          {tab==='score'&&(
            !base ? (
              <div className="card" style={{textAlign:'center',padding:'60px 0',animation:'fadeUp .4s ease both'}}>
                <div style={{fontSize:44,marginBottom:12,opacity:.2}}>📊</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:16}}>No CV Uploaded Yet</div>
                <div style={{display:'flex',gap:12,justifyContent:'center'}}>
                  <button onClick={()=>setTab('upload')} style={{padding:'10px 22px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',border:'none',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Upload CV</button>
                  <button onClick={()=>setTab('master')} style={{padding:'10px 22px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:'#fff',color:'#374151'}}>Build from Scratch</button>
                </div>
              </div>
            ) : (
              <div className="two" style={{animation:'fadeUp .4s ease both'}}>
                <div className="card">
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:18}}>ATS Score</div>
                  <div className="score-wrap">
                    <div className="score-pos">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="44" fill="none" stroke="#f1f5f9" strokeWidth="11"/>
                        <circle cx="60" cy="60" r="44" fill="none" stroke={gc} strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={dash}
                          style={{transform:'rotate(-90deg)',transformOrigin:'60px 60px',transition:'stroke-dashoffset 1.2s ease'}}
                        />
                      </svg>
                      <div className="score-abs">
                        <div className="s-num" style={{color:gc}}>{score}</div>
                        <div className="s-sub">/ 100</div>
                      </div>
                    </div>
                    <div className="g-big" style={{color:gc}}>{grade}</div>
                    <div className="g-msg">{gm}</div>
                  </div>
                  <div className="prog"><div className="prog-f" style={{width:`${score}%`,background:gc}}/></div>
                  {fixed&&<div style={{padding:'10px 14px',background:'#ecfdf5',border:'1.5px solid #a7f3d0',borderRadius:9,fontSize:13,fontWeight:700,color:'#065f46',marginBottom:14}}>Fixed version ready: {fixed.ats_score}/100 — see My Versions tab</div>}
                  <button className="fix-btn" style={{background:score>=85?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#f59e0b,#d97706)'}} disabled={fixing} onClick={handleFix}>
                    {fixing?<><span className="sm"/>Fixing...</>:'Fix CV Issues'}
                  </button>
                </div>

                <div className="card">
                  {issues.length>0&&(
                    <>
                      <div className="it">Issues to Fix ({issues.length})</div>
                      {issues.map((iss:string,i:number)=>(
                        <div key={i} className="irow fail"><span>⚠️</span><span>{iss}</span></div>
                      ))}
                    </>
                  )}
                  {passed.length>0&&(
                    <div style={{marginTop:issues.length?18:0}}>
                      <div className="it">Passed ({passed.length})</div>
                      {passed.map((p:string,i:number)=>(
                        <div key={i} className="irow ok"><span>✅</span><span>{p}</span></div>
                      ))}
                    </div>
                  )}
                  {!issues.length&&!passed.length&&<div style={{textAlign:'center',padding:'40px 0',color:'#94a3b8',fontSize:14}}>No breakdown available</div>}
                </div>
              </div>
            )
          )}

          {/* ── MASTER CV BUILDER ── */}
          {tab==='master'&&(
            <div className="card" style={{animation:'fadeUp .4s ease both',maxWidth:820}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:6}}>Build Master CV</div>
              <div style={{fontSize:13.5,color:'#64748b',marginBottom:16}}>Fill in your details — we score it immediately and show exactly what to improve.</div>
              <div className="tip">Your master CV stores all your experience in one place and is used to match you with jobs.</div>
              <div className="fg">
                <div><label className="flbl">Full Name *</label><input className="finp" placeholder="Shreyas Nagamalla" value={mf.name} onChange={e=>setMf(p=>({...p,name:e.target.value}))}/></div>
                <div><label className="flbl">Email *</label><input className="finp" placeholder="you@email.com" value={mf.email} onChange={e=>setMf(p=>({...p,email:e.target.value}))}/></div>
                <div><label className="flbl">Phone</label><input className="finp" placeholder="+44 7700 000000" value={mf.phone} onChange={e=>setMf(p=>({...p,phone:e.target.value}))}/></div>
                <div><label className="flbl">LinkedIn</label><input className="finp" placeholder="linkedin.com/in/yourname" value={mf.linkedin} onChange={e=>setMf(p=>({...p,linkedin:e.target.value}))}/></div>
                <div className="ff"><label className="flbl">Professional Summary</label><textarea className="fta" placeholder="2-3 sentences about your background..." value={mf.summary} onChange={e=>setMf(p=>({...p,summary:e.target.value}))}/></div>
                <div className="ff"><label className="flbl">Experience (include bullet points with metrics)</label><textarea className="fta" placeholder="Production Intern, Gear Head Motors, 2022-2023&#10;• Reduced downtime by 15% by..." style={{minHeight:140}} value={mf.experience} onChange={e=>setMf(p=>({...p,experience:e.target.value}))}/></div>
                <div className="ff"><label className="flbl">Education</label><textarea className="fta" placeholder="MSc Mechanical Engineering, University of Greenwich, 2024-2026" value={mf.education} onChange={e=>setMf(p=>({...p,education:e.target.value}))}/></div>
                <div className="ff"><label className="flbl">Skills</label><textarea className="fta" placeholder="SolidWorks, AutoCAD, MATLAB, HVAC, Ansys, Microsoft Office..." value={mf.skills} onChange={e=>setMf(p=>({...p,skills:e.target.value}))}/></div>
                <div className="ff"><label className="flbl">Projects (optional)</label><textarea className="fta" placeholder="Master Research Project, Jul-Dec 2024&#10;• Achieved 15% improvement in blend uniformity..." value={mf.projects} onChange={e=>setMf(p=>({...p,projects:e.target.value}))}/></div>
              </div>
              <button className="bbtn" disabled={busy} onClick={handleBuildMaster}>
                {busy?<><span className="sm"/>Building...</>:'Build Master CV + Get ATS Score'}
              </button>
            </div>
          )}

          {/* ── MY VERSIONS ── */}
          {tab==='versions'&&(
            <div className="card" style={{animation:'fadeUp .4s ease both'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:18}}>My CV Versions</div>
              {cvs.length===0?(
                <div style={{textAlign:'center',padding:'50px 0',color:'#94a3b8'}}>
                  <div style={{fontSize:36,marginBottom:10,opacity:.25}}>📁</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:12}}>No CVs yet</div>
                  <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                    <button onClick={()=>setTab('upload')} style={{padding:'9px 20px',background:'linear-gradient(135deg,#4f8ef7,#3b6fd4)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Upload CV</button>
                    <button onClick={()=>setTab('master')} style={{padding:'9px 20px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:'#fff',color:'#374151'}}>Build CV</button>
                  </div>
                </div>
              ):cvs.map((cv:any,i:number)=>{
                const {g,c}=G(cv.ats_score||0)
                const icon=cv.version_type==='base'?'📄':cv.version_type==='fixed'?'⚡':'🏆'
                const lbl=cv.version_type==='base'?'Original CV':cv.version_type==='fixed'?'Fixed CV':'Master CV'
                const date=new Date(cv.updated_at||cv.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
                return(
                  <div key={i} className="vrow">
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:42,height:42,borderRadius:10,background:'#f8fafc',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{icon}</div>
                      <div>
                        <div style={{fontSize:13.5,fontWeight:700,color:'#0f172a'}}>{lbl}</div>
                        <div style={{fontSize:11.5,color:'#94a3b8'}}>{cv.file_name} — {date}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:14}}>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:900,color:c}}>{cv.ats_score||0}<span style={{fontSize:12,fontWeight:600,color:'#94a3b8'}}>/100 {g}</span></div>
                      {cv.preview_html&&<button onClick={()=>setPreview(cv.preview_html)} style={{padding:'7px 14px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:'#fff',color:'#374151',transition:'all .2s'}}>Preview</button>}
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
          <div className="ov" onClick={e=>e.stopPropagation()}>
            <div className="ov-h">
              <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a'}}>CV Preview</div>
              <button onClick={()=>setPreview(null)} style={{padding:'5px 14px',border:'1.5px solid #e2e8f0',borderRadius:7,fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>Close</button>
            </div>
            <iframe srcDoc={preview} style={{width:'100%',height:'74vh',border:'none'}} title="CV Preview"/>
          </div>
        </div>
      )}
    </>
  )
}