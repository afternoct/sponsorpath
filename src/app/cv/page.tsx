'use client'
import { useState, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

interface ATSResult { score:number; grade:string; issues:string[]; passed:string[] }
interface CVRecord  { id:string; ats_score:number; ats_grade:string; version_type:string; file_name:string; preview_html?:string; updated_at:string; parsed_json?:any }
declare global { interface Window { pdfjsLib: any } }

// ── PDF EXTRACTION — groups by Y coordinate so line breaks are preserved ──────
async function extractPDFText(file: File, onProgress?: (m:string)=>void): Promise<string> {
  if (!window.pdfjsLib) {
    onProgress?.('Loading PDF reader...')
    await new Promise<void>((res, rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        res()
      }
      s.onerror = rej
      document.head.appendChild(s)
    })
  }
  const ab  = await file.arrayBuffer()
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise
  let out = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Reading page ${i} / ${pdf.numPages}...`)
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const rows: Map<number, Array<{x:number; t:string}>> = new Map()
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue
      const y = Math.round(item.transform[5])
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y)!.push({ x: item.transform[4], t: item.str })
    }
    const ys = [...rows.keys()].sort((a,b) => b - a)
    for (const y of ys) {
      out += rows.get(y)!.sort((a,b)=>a.x-b.x).map(i=>i.t).join(' ') + '\n'
    }
    out += '\n'
  }
  return out.trim()
}

async function extractDocxText(file: File): Promise<string> {
  const str = new TextDecoder().decode(new Uint8Array(await file.arrayBuffer()))
  const start = str.indexOf('<w:body')
  const end   = str.indexOf('</w:body>')
  if (start === -1) throw new Error('Invalid DOCX — try saving as PDF')
  return str.slice(start, end + 9)
    .split(/<w:p[ >]/)
    .map(p => p.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())
    .filter(Boolean)
    .join('\n')
}

function gradeCol(g:string){ return g==='A+'?'#16a34a':g==='A'?'#2563eb':g==='B'?'#d97706':'#dc2626' }

function ScoreRing({ score, grade }: { score:number; grade:string }) {
  const r=52, c=2*Math.PI*r, col=gradeCol(grade)
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10}/>
        <circle cx={65} cy={65} r={r} fill="none" stroke={col} strokeWidth={10}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-score/100)}
          style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dashoffset .8s'}}/>
        <text x={65} y={59} textAnchor="middle" fontSize={26} fontWeight={700} fill={col}>{score}</text>
        <text x={65} y={75} textAnchor="middle" fontSize={11} fill="#94a3b8">/100</text>
      </svg>
      <div style={{fontSize:26,fontWeight:700,color:col}}>{grade}</div>
      <div style={{fontSize:12,color:'#64748b',textAlign:'center'}}>
        {score>=90?'Excellent — passes most ATS':score>=75?'Good — strong application':score>=60?'Fair — needs improvement':'Needs significant work'}
      </div>
    </div>
  )
}

export default function CVPage() {
  const [tab, setTab]               = useState<'upload'|'score'|'versions'>('upload')
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState('')
  const [ats, setAts]               = useState<ATSResult|null>(null)
  const [cvRecord, setCvRecord]     = useState<CVRecord|null>(null)
  const [fixing, setFixing]         = useState(false)
  const [preview, setPreview]       = useState<string|null>(null)
  const [autofilled, setAutofilled] = useState(false)
  const [versions, setVersions]     = useState<CVRecord[]>([])
  const [error, setError]           = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function getUserId() {
    const { createBrowserClient } = await import('@supabase/ssr')
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data:{ user } } = await sb.auth.getUser()
    return user?.id || null
  }

  async function loadVersions(uid: string) {
    const { createBrowserClient } = await import('@supabase/ssr')
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await sb.from('cvs').select('*').eq('user_id',uid).order('updated_at',{ascending:false})
    if (data) setVersions(data)
  }

  const handleFile = useCallback(async (file: File) => {
    setError(''); setUploading(true); setProgress('Reading file...')
    try {
      const userId = await getUserId()
      if (!userId) throw new Error('Please sign in first')

      let text = ''
      const ext = file.name.split('.').pop()?.toLowerCase()
      if      (ext==='pdf')             text = await extractPDFText(file, setProgress)
      else if (ext==='docx'||ext==='doc') { setProgress('Reading Word doc...'); text = await extractDocxText(file) }
      else if (ext==='txt')             text = await file.text()
      else throw new Error('Upload PDF, Word (.docx), or TXT')

      if (!text || text.trim().length < 50)
        throw new Error('Could not read file — try saving as PDF')

      setProgress(`Extracted ${text.split('\n').filter(Boolean).length} lines — running AI analysis...`)

      const res  = await fetch('/api/cv/analyse', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text, userId, fileName: file.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setCvRecord(data.cv); setAts(data.ats)
      if (data.autofilled) setAutofilled(true)
      setTab('score')
      await loadVersions(userId)
    } catch (e:any) { setError(e.message) }
    finally { setUploading(false); setProgress('') }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [handleFile])

  async function handleFix() {
    if (!cvRecord) return
    setFixing(true); setError('')
    try {
      const userId = await getUserId()
      if (!userId) throw new Error('Not signed in')
      const res  = await fetch('/api/cv/fix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,cvId:cvRecord.id})})
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Build failed')
      setTab('versions'); await loadVersions(userId)
    } catch(e:any){ setError(e.message) }
    finally{ setFixing(false) }
  }

  const card: React.CSSProperties = {background:'#fff',borderRadius:16,border:'1px solid #e2e8f0'}
  const sh:   React.CSSProperties = {fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:10,textTransform:'uppercase',letterSpacing:.5}

  return (
    // LAYOUT: sidebar left, content fills rest
    <div style={{display:'flex',minHeight:'100vh',background:'#f0f4f8',fontFamily:'system-ui,sans-serif'}}>
      <Sidebar/>

      {/* MAIN CONTENT — fills all space to right of sidebar */}
      <div style={{flex:1,minWidth:0,overflowY:'auto'}}>
        <div style={{maxWidth:1060,margin:'0 auto',padding:'36px 32px'}}>

          {/* HEADER */}
          <div style={{marginBottom:28}}>
            <h1 style={{fontSize:24,fontWeight:700,color:'#0f172a',marginBottom:4}}>Resume &amp; ATS</h1>
            <p style={{fontSize:14,color:'#64748b'}}>
              Upload any CV → AI extracts everything → builds UK ATS Master CV → tailors it per job
            </p>
          </div>

          {/* BANNERS */}
          {autofilled && (
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:'11px 16px',fontSize:13,color:'#166534',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              ✅ Profile auto-filled from your CV —{' '}
              <a href="/profile" style={{color:'#16a34a',fontWeight:600}}>View Profile →</a>
            </div>
          )}
          {error && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'11px 16px',fontSize:13,color:'#dc2626',marginBottom:16}}>
              ⚠️ {error}
            </div>
          )}

          {/* TABS */}
          <div style={{display:'flex',gap:4,background:'#fff',borderRadius:12,padding:4,border:'1px solid #e2e8f0',marginBottom:28,maxWidth:560}}>
            {([['upload','📤 Upload CV'],['score','📊 Score & Fix'],['versions','📁 My Versions']] as const).map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id as any)}
                style={{flex:1,padding:'10px 0',borderRadius:9,border:'none',fontWeight:600,fontSize:13,cursor:'pointer',
                  background:tab===id?'#0f172a':'transparent',color:tab===id?'#fff':'#64748b'}}>
                {label}
              </button>
            ))}
          </div>

          {/* ── UPLOAD TAB ── */}
          {tab==='upload' && (
            <div
              onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
              onClick={()=>!uploading&&fileRef.current?.click()}
              style={{...card,padding:64,textAlign:'center',cursor:uploading?'default':'pointer',
                border:'2px dashed #cbd5e1',background:uploading?'#f8fafc':'#fff'}}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt"
                style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
              {uploading ? (
                <div>
                  <div style={{width:48,height:48,border:'3px solid #e2e8f0',borderTop:'3px solid #3b82f6',
                    borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
                  <div style={{fontSize:15,color:'#475569',fontWeight:500}}>{progress}</div>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:56,marginBottom:16}}>📄</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:8}}>Drop your CV here</div>
                  <div style={{fontSize:14,color:'#64748b',marginBottom:24}}>
                    PDF · Word (.docx) · Text — any layout, any design
                  </div>
                  <button
                    onClick={e=>{e.stopPropagation();fileRef.current?.click()}}
                    style={{background:'#0f172a',color:'#fff',border:'none',padding:'13px 32px',
                      borderRadius:10,fontSize:15,fontWeight:600,cursor:'pointer'}}>
                    Browse File
                  </button>
                  <div style={{fontSize:12,color:'#94a3b8',marginTop:16}}>
                    AI extracts name · contact · experience · education · skills → builds UK ATS Master CV
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SCORE TAB ── */}
          {tab==='score' && ats && cvRecord && (
            <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20}}>

              {/* Left: score ring + build button */}
              <div style={{...card,padding:24,textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:20}}>Your CV Score</div>
                <ScoreRing score={ats.score} grade={ats.grade}/>
                <div style={{margin:'20px 0 12px',padding:'10px 14px',background:'#f0fdf4',
                  border:'1px solid #86efac',borderRadius:9,fontSize:12,color:'#166534'}}>
                  Master CV will score: <strong>{Math.min(99,Math.max(90,ats.score))}/100 (A+)</strong>
                </div>
                <button onClick={handleFix} disabled={fixing}
                  style={{width:'100%',background:fixing?'#94a3b8':'#16a34a',color:'#fff',
                    border:'none',padding:'13px 0',borderRadius:10,fontSize:14,fontWeight:700,
                    cursor:fixing?'not-allowed':'pointer'}}>
                  {fixing?'⚙️ Building...':'🚀 Build UK ATS Master CV'}
                </button>
                <div style={{fontSize:10,color:'#94a3b8',marginTop:8}}>
                  Single-column · ATS-safe · Auto-tailored per job
                </div>
              </div>

              {/* Right: issues + passed + extracted data */}
              <div style={card}>
                <div style={{padding:'20px 22px'}}>
                  {ats.issues.length>0&&(
                    <div style={{marginBottom:18}}>
                      <div style={sh}>Issues to Fix ({ats.issues.length})</div>
                      {ats.issues.map((x,i)=>(
                        <div key={i} style={{padding:'9px 13px',background:'#fffbeb',border:'1px solid #fde68a',
                          borderRadius:8,marginBottom:7,fontSize:13,color:'#92400e',display:'flex',gap:9}}>
                          <span>⚠️</span><span>{x}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{marginBottom:18}}>
                    <div style={sh}>Passed ({ats.passed.length})</div>
                    {ats.passed.map((p,i)=>(
                      <div key={i} style={{padding:'9px 13px',background:'#f0fdf4',border:'1px solid #bbf7d0',
                        borderRadius:8,marginBottom:7,fontSize:13,color:'#166534',display:'flex',gap:9}}>
                        <span>✅</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                  {cvRecord.parsed_json?.contact&&(
                    <div style={{borderTop:'1px solid #f1f5f9',paddingTop:16}}>
                      <div style={sh}>Extracted from your CV</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        {([
                          ['👤 Name',      cvRecord.parsed_json.contact.full_name],
                          ['✉️ Email',     cvRecord.parsed_json.contact.email],
                          ['📞 Phone',     cvRecord.parsed_json.contact.phone],
                          ['📍 Location',  cvRecord.parsed_json.contact.location],
                          ['💼 Jobs',      `${cvRecord.parsed_json.work_history?.length||0} found`],
                          ['🎓 Education', `${cvRecord.parsed_json.education?.length||0} found`],
                          ['🛠️ Skills',    `${cvRecord.parsed_json.all_skills?.length||0} found`],
                          ['🎯 Title',     cvRecord.parsed_json.current_title],
                        ] as [string,string][]).filter(([,v])=>v).map(([l,v])=>(
                          <div key={l} style={{padding:'8px 11px',background:'#f8fafc',borderRadius:7}}>
                            <div style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>{l}</div>
                            <div style={{fontSize:12,fontWeight:600,color:'#0f172a',overflow:'hidden',
                              textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab==='score'&&!ats&&(
            <div style={{...card,padding:56,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>📊</div>
              <div style={{fontSize:15,color:'#475569',marginBottom:16}}>Upload your CV first to see your ATS score</div>
              <button onClick={()=>setTab('upload')}
                style={{background:'#0f172a',color:'#fff',border:'none',padding:'11px 24px',
                  borderRadius:9,cursor:'pointer',fontSize:14,fontWeight:600}}>
                Upload CV →
              </button>
            </div>
          )}

          {/* ── VERSIONS TAB ── */}
          {tab==='versions'&&(
            versions.length===0?(
              <div style={{...card,padding:56,textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>📁</div>
                <div style={{fontSize:15,color:'#475569'}}>No CV versions yet — upload your CV to get started</div>
              </div>
            ):(
              <div style={{display:'grid',gap:10}}>
                {versions.map(v=>(
                  <div key={v.id} style={{...card,padding:18,display:'flex',alignItems:'center',
                    justifyContent:'space-between',gap:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:13}}>
                      <div style={{width:44,height:44,borderRadius:10,flexShrink:0,display:'flex',
                        alignItems:'center',justifyContent:'center',fontSize:22,
                        background:v.version_type==='fixed'?'#dcfce7':v.version_type==='tailored'?'#ede9fe':'#dbeafe'}}>
                        {v.version_type==='fixed'?'🏆':v.version_type==='tailored'?'🎯':'📄'}
                      </div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>
                          {v.version_type==='fixed'?'UK ATS Master CV':v.version_type==='tailored'?'Tailored CV':'Original Upload'}
                        </div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:2}}>
                          {v.file_name} · {new Date(v.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:700,color:gradeCol(v.ats_grade)}}>{v.ats_score}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>ATS</div>
                      </div>
                      {v.preview_html&&(
                        <button onClick={()=>setPreview(v.preview_html!)}
                          style={{background:'#0f172a',color:'#fff',border:'none',padding:'8px 16px',
                            borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                          Preview
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>

      {/* PREVIEW MODAL */}
      {preview&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:1000,
          display:'flex',alignItems:'flex-start',justifyContent:'center',padding:24,overflowY:'auto'}}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:870}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'14px 20px',borderBottom:'1px solid #e2e8f0'}}>
              <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>CV Preview</div>
              <button onClick={()=>setPreview(null)}
                style={{background:'#f1f5f9',border:'none',padding:'6px 14px',
                  borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:600}}>✕ Close</button>
            </div>
            <iframe srcDoc={preview} style={{width:'100%',height:'86vh',border:'none',borderRadius:'0 0 16px 16px'}} title="CV Preview"/>
          </div>
        </div>
      )}
    </div>
  )
}