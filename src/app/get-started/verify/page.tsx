// ════════════════════════════════════════════════════════
// FILE PATH: src/app/get-started/page.tsx
// → localhost:3000/get-started
// ════════════════════════════════════════════════════════
// FIXES:
// 1. key prop moved to wrapper div (not Fragment) — no more React warning
// 2. After signup → shows "Check your email" screen inline
//    (Supabase sends a confirm link, user clicks it, then can sign in)
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { signUp, signInWithGoogle, signInWithLinkedIn } from '@/lib/supabase'

const STREAMS = ['Software Engineering','DevOps / Cloud','Data & Analytics','Product Management',
  'Finance & Banking','Business Analysis','Consulting','Cyber Security',
  'Marketing','UX / Design','HR & Talent','Operations','Other']

export default function GetStarted() {
  const [streams, setStreams]   = useState<string[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)   // ← shows email-sent screen
  const [form, setForm]         = useState({ firstName:'', lastName:'', email:'', password:'', visaStatus:'', locations:'' })

  const toggle = (s: string) => setStreams(p => p.includes(s) ? p.filter(x=>x!==s) : [...p, s])
  const set = (k: string, v: string) => setForm(p => ({...p, [k]:v}))

  const handleSubmit = async () => {
    setError('')
    if (!form.firstName || !form.email || !form.password || !form.visaStatus || streams.length === 0) {
      setError('Please fill in all required fields and select at least one career stream.'); return
    }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, {
      firstName: form.firstName, lastName: form.lastName,
      visaStatus: form.visaStatus, targetStreams: streams, preferredLocations: form.locations
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    // Show email-sent confirmation screen
    setDone(true)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--green:#059669;--navy:#012169;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:var(--bg2);color:#0A0F1E;min-height:100vh;}
        a{text-decoration:none;color:inherit;}
        .page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}

        /* LEFT */
        .left{background:linear-gradient(145deg,#1D4ED8,#0F2952);padding:3rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
        .blob{position:absolute;border-radius:50%;animation:bF 9s ease-in-out infinite;}
        .b1{width:320px;height:320px;background:rgba(255,255,255,.05);top:-80px;right:-80px;}
        .b2{width:380px;height:380px;background:rgba(52,211,153,.08);bottom:-110px;left:-70px;animation-delay:3s;}
        .b3{width:180px;height:180px;background:rgba(96,165,250,.07);top:38%;right:10%;animation-delay:5.5s;}
        .b4{width:240px;height:240px;background:rgba(255,255,255,.04);bottom:30%;left:35%;animation-delay:7s;}
        @keyframes bF{0%,100%{transform:scale(1) translate(0,0)}33%{transform:scale(1.12) translate(12px,-8px)}66%{transform:scale(.9) translate(-8px,14px)}}
        .logo-box{display:flex;align-items:center;gap:.65rem;position:relative;z-index:1;}
        .logo-ic{width:42px;height:42px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.25rem;font-family:'Archivo',sans-serif;animation:logoPop .8s cubic-bezier(.34,1.56,.64,1) both;}
        @keyframes logoPop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
        .logo-nm{font-family:'Archivo',sans-serif;font-size:1.2rem;font-weight:900;color:#fff;}
        .logo-nm span{color:#34D399;}
        .illo{position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;}
        .illo-inner{position:relative;width:280px;height:220px;}
        .float-card{position:absolute;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);padding:.45rem .9rem;border-radius:50px;font-size:.78rem;font-weight:700;color:#fff;white-space:nowrap;animation:cardF 5s ease-in-out infinite;}
        .fc1{top:-10px;left:-20px;animation-delay:0s;}
        .fc2{bottom:10px;right:-10px;animation-delay:1.7s;}
        .fc3{bottom:-10px;left:10px;animation-delay:3.2s;}
        @keyframes cardF{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        .left-body{position:relative;z-index:1;}
        .left-body h2{font-family:'Archivo',sans-serif;font-size:1.7rem;font-weight:900;color:#fff;line-height:1.22;margin-bottom:.7rem;}
        .left-body h2 em{font-style:normal;color:#34D399;}
        .left-body>p{color:rgba(255,255,255,.7);line-height:1.75;font-size:.9rem;margin-bottom:1.2rem;}
        .sp-steps{display:flex;flex-direction:column;gap:.7rem;}
        .sp-step{display:flex;align-items:flex-start;gap:.7rem;}
        .sp-num{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:#fff;flex-shrink:0;margin-top:.12rem;}
        .sp-txt h4{color:#fff;font-size:.84rem;font-weight:700;margin-bottom:.1rem;}
        .sp-txt p{color:rgba(255,255,255,.55);font-size:.76rem;line-height:1.5;}
        .left-foot{color:rgba(255,255,255,.35);font-size:.75rem;position:relative;z-index:1;}

        /* RIGHT */
        .right{display:flex;align-items:flex-start;justify-content:center;padding:2.5rem 2.5rem;overflow-y:auto;}
        .form-box{width:100%;max-width:480px;}
        .back-lnk{display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.84rem;margin-bottom:1.75rem;transition:color .25s;}
        .back-lnk:hover{color:var(--blue);}

        /* PROGRESS — key on wrapper div, display:contents makes it layout-invisible */
        .prog{display:flex;align-items:center;margin-bottom:1.75rem;}
        .pdot{display:flex;flex-direction:column;align-items:center;}
        .pdot-c{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:700;border:2px solid var(--border);background:#fff;color:var(--muted);transition:all .3s;}
        .pdot-c.active{background:var(--blue);border-color:var(--blue);color:#fff;}
        .pdot-c.done{background:var(--green);border-color:var(--green);color:#fff;}
        .pdot-l{font-size:.67rem;color:var(--muted);margin-top:.28rem;white-space:nowrap;}
        .pline{flex:1;height:2px;background:var(--border);margin:0 .5rem;margin-bottom:1rem;}

        .form-box h1{font-family:'Archivo',sans-serif;font-size:1.8rem;font-weight:900;margin-bottom:.38rem;}
        .sub{color:var(--muted);font-size:.9rem;margin-bottom:1.5rem;}
        .fg{margin-bottom:1.1rem;}
        .fg label{display:block;font-weight:600;font-size:.85rem;margin-bottom:.4rem;color:#374151;}
        .fg input,.fg select{width:100%;padding:.8rem .95rem;border:1.5px solid var(--border);border-radius:8px;font-size:.92rem;font-family:'DM Sans',sans-serif;color:#0A0F1E;background:#fff;transition:border-color .25s,box-shadow .25s;outline:none;}
        .fg input:focus,.fg select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.1);}
        .fg input::placeholder{color:#94A3B8;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
        .chips{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.45rem;}
        .chip{padding:.4rem .9rem;border:1.5px solid var(--border);border-radius:50px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .22s;background:#fff;user-select:none;}
        .chip:hover{border-color:var(--blue);color:var(--blue);}
        .chip.on{background:var(--blue);color:#fff;border-color:var(--blue);transform:scale(1.04);}
        .sel-count{margin-top:.45rem;font-size:.76rem;font-weight:700;color:var(--green);}
        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:.7rem 1rem;color:#DC2626;font-size:.84rem;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;}
        .terms{font-size:.79rem;color:var(--muted);margin-bottom:1.35rem;line-height:1.6;}
        .terms a{color:var(--blue);font-weight:600;}
        .btn-sub{width:100%;padding:1rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;border:none;border-radius:9px;font-size:1rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(5,150,105,.28);}
        .btn-sub:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(5,150,105,.36);}
        .btn-sub:disabled{opacity:.6;cursor:not-allowed;}
        .divider{display:flex;align-items:center;gap:1rem;margin:1.25rem 0;color:var(--muted);font-size:.82rem;}
        .divider::before,.divider::after{content:'';flex:1;border-top:1px solid var(--border);}
        .soc-btn{width:100%;padding:.78rem;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-size:.89rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.6rem;transition:all .25s;margin-bottom:.6rem;}
        .soc-btn:hover{border-color:var(--blue);background:var(--bg2);}
        .si-lnk{text-align:center;margin-top:1.4rem;font-size:.88rem;color:var(--muted);}
        .si-lnk a{color:var(--blue);font-weight:700;}

        /* EMAIL SENT SCREEN */
        .email-sent{text-align:center;padding:2rem 1rem;}
        .es-icon{font-size:4.5rem;margin-bottom:1.5rem;animation:pop .6s cubic-bezier(.34,1.56,.64,1) both;}
        @keyframes pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
        .es-title{font-family:'Archivo',sans-serif;font-size:1.9rem;font-weight:900;color:#0A0F1E;margin-bottom:.6rem;}
        .es-sub{color:var(--muted);font-size:.93rem;margin-bottom:.4rem;line-height:1.75;}
        .es-email{font-weight:700;color:var(--blue);font-size:.95rem;margin-bottom:2rem;}
        .es-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:1.75rem;margin-bottom:1.75rem;text-align:left;}
        .es-card h4{font-weight:700;font-size:.9rem;margin-bottom:1rem;color:#0A0F1E;}
        .es-step{display:flex;align-items:flex-start;gap:.7rem;margin-bottom:.85rem;}
        .es-step:last-child{margin-bottom:0;}
        .es-n{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.72rem;font-weight:800;flex-shrink:0;}
        .es-t{font-size:.84rem;font-weight:600;color:#0A0F1E;margin-bottom:.12rem;}
        .es-d{font-size:.78rem;color:var(--muted);line-height:1.55;}
        .es-spam{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:.85rem 1rem;font-size:.82rem;color:#92400E;display:flex;align-items:center;gap:.6rem;margin-bottom:1.5rem;}
        .btn-signin{display:block;width:100%;padding:.95rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-size:.95rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;text-align:center;text-decoration:none;box-shadow:0 4px 16px rgba(59,130,246,.25);transition:all .25s;}
        .btn-signin:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.35);}

        @media(max-width:900px){.page{grid-template-columns:1fr;}.left{display:none;}.right{padding:2rem 1.5rem;}.two{grid-template-columns:1fr;}}
      `}</style>

      <div className="page">
        {/* LEFT */}
        <div className="left">
          <div className="b1 blob"/><div className="b2 blob"/><div className="b3 blob"/><div className="b4 blob"/>
          <div className="logo-box">
            <div className="logo-ic">S</div>
            <div className="logo-nm">Sponsor<span>Path</span></div>
          </div>
          <div className="illo">
            <div className="illo-inner">
              <div className="float-card fc1">✅ 3 Interview Invites!</div>
              <div className="float-card fc2">📄 CV Tailored in 12s</div>
              <div className="float-card fc3">🇬🇧 Sponsor Verified ✓</div>
              <svg viewBox="0 0 280 220" style={{width:'100%',height:'100%',position:'absolute',top:0,left:0}}>
                <rect x="70" y="55" width="140" height="95" rx="8" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" strokeWidth="1.5"/>
                <rect x="76" y="61" width="128" height="78" rx="4" fill="rgba(59,130,246,.3)"/>
                <rect x="82" y="68" width="75" height="4" rx="2" fill="rgba(255,255,255,.65)"/>
                <rect x="82" y="76" width="55" height="3" rx="1.5" fill="rgba(255,255,255,.4)"/>
                <rect x="82" y="83" width="65" height="3" rx="1.5" fill="rgba(255,255,255,.4)"/>
                <rect x="155" y="108" width="38" height="14" rx="7" fill="rgba(52,211,153,.5)"/>
                <text x="174" y="119" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800">94%</text>
                <rect x="135" y="150" width="10" height="12" fill="rgba(255,255,255,.18)"/>
                <rect x="115" y="162" width="50" height="5" rx="2.5" fill="rgba(255,255,255,.18)"/>
                <rect x="88" y="174" width="104" height="14" rx="4" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth="1"/>
                <circle cx="140" cy="35" r="14" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
                <circle cx="136" cy="31" r="3" fill="rgba(255,255,255,.5)"/>
                <circle cx="144" cy="31" r="3" fill="rgba(255,255,255,.5)"/>
                <path d="M133 38 Q140 43 147 38" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <circle cx="205" cy="63" r="5" fill="#34D399" opacity=".9">
                  <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".9;.3;.9" dur="2s" repeatCount="indefinite"/>
                </circle>
              </svg>
            </div>
          </div>
          <div className="left-body">
            <h2>Start landing UK jobs<br/>with the <em>SponsorPath Engine.</em></h2>
            <p>Register in 2 minutes. The engine finds jobs, tailors your CV, and applies — 24/7, automatically.</p>
            <div className="sp-steps">
              {[{n:'1',t:'Create your account',d:'Email & password — takes 60 seconds.'},
                {n:'2',t:'Set your preferences',d:'Tell us your stream: DevOps, Finance...'},
                {n:'3',t:'Upload your resume',d:'We build your Master Profile from it.'},
                {n:'4',t:'Engine starts working',d:'Finds & applies to sponsor jobs automatically.'}].map(s=>(
                <div key={s.n} className="sp-step">
                  <div className="sp-num">{s.n}</div>
                  <div className="sp-txt"><h4>{s.t}</h4><p>{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="left-foot"><p>Not immigration advice. © 2026 SponsorPath</p></div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="form-box">

            {/* ── EMAIL SENT SCREEN ── */}
            {done ? (
              <div className="email-sent">
                <div className="es-icon">📬</div>
                <h1 className="es-title">Check Your Email</h1>
                <p className="es-sub">We sent a confirmation link to</p>
                <p className="es-email">{form.email}</p>

                <div className="es-card">
                  <h4>What to do next:</h4>
                  {[
                    {n:'1',t:'Open your email inbox',d:`Look for an email from noreply@mail.app.supabase.io`},
                    {n:'2',t:'Click "Confirm your email"',d:'This activates your account and logs you in automatically.'},
                    {n:'3',t:'You\'ll be taken to your dashboard',d:'The SponsorPath Engine will be ready to go.'},
                  ].map(s=>(
                    <div key={s.n} className="es-step">
                      <div className="es-n">{s.n}</div>
                      <div><div className="es-t">{s.t}</div><div className="es-d">{s.d}</div></div>
                    </div>
                  ))}
                </div>

                <div className="es-spam">
                  🔍 Can't find it? Check your <strong>&nbsp;spam / junk&nbsp;</strong> folder. The email comes from Supabase.
                </div>

                <Link href="/signin" className="btn-signin">Already confirmed? Sign In →</Link>
                <div className="si-lnk" style={{marginTop:'1rem'}}>
                  <span style={{cursor:'pointer',color:'var(--blue)',fontWeight:600}} onClick={()=>setDone(false)}>← Wrong email? Go back</span>
                </div>
              </div>
            ) : (
              <>
                <Link href="/" className="back-lnk">← Back to home</Link>

                {/* Progress — key prop fixed: on wrapper div with display:contents */}
                <div className="prog">
                  {[{l:'Account'},{l:'Verify'},{l:'Resume'}].map((s,i)=>(
                    <div key={s.l} style={{display:'contents'}}>
                      <div className="pdot">
                        <div className={`pdot-c ${i===0?'active':''}`}>{i+1}</div>
                        <div className="pdot-l">{s.l}</div>
                      </div>
                      {i<2 && <div className="pline"/>}
                    </div>
                  ))}
                </div>

                <h1>Create Your Account</h1>
                <p className="sub">Free to start. No credit card required.</p>

                {error && <div className="err">⚠️ {error}</div>}

                <div className="two">
                  <div className="fg"><label>First Name *</label><input value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="John"/></div>
                  <div className="fg"><label>Last Name</label><input value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Smith"/></div>
                </div>
                <div className="fg"><label>Email Address *</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@example.com"/></div>
                <div className="fg"><label>Password *</label><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="At least 8 characters"/></div>

                <div className="fg">
                  <label>Visa Status *</label>
                  <select value={form.visaStatus} onChange={e=>set('visaStatus',e.target.value)}>
                    <option value="">Select your visa status...</option>
                    <option>Graduate Visa (PSW)</option>
                    <option>Graduate Visa (PSW) – Dependent</option>
                    <option>Skilled Worker Visa</option>
                    <option>Skilled Worker Visa – Dependent</option>
                    <option>Student Visa (need sponsorship on graduation)</option>
                    <option>British Citizen / ILR</option>
                    <option>EU Settled / Pre-Settled Status</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="fg">
                  <label>Target Career Stream * <span style={{color:'#94A3B8',fontWeight:400}}>(select all that apply)</span></label>
                  <div className="chips">
                    {STREAMS.map(s=>(
                      <span key={s} className={`chip${streams.includes(s)?' on':''}`} onClick={()=>toggle(s)}>{s}</span>
                    ))}
                  </div>
                  {streams.length>0&&<div className="sel-count">✓ {streams.length} stream{streams.length>1?'s':''} selected</div>}
                </div>

                <div className="fg"><label>Preferred UK Location(s)</label><input value={form.locations} onChange={e=>set('locations',e.target.value)} placeholder="e.g. London, Manchester, Remote"/></div>

                <p className="terms">By creating an account you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>. We never share your data with employers.</p>

                <button className="btn-sub" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account & Continue →'}
                </button>

                <div className="divider">or sign up with</div>
                <button className="soc-btn" onClick={()=>signInWithGoogle()}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
                <button className="soc-btn" onClick={()=>signInWithLinkedIn()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  Continue with LinkedIn
                </button>
                <div className="si-lnk">Already have an account? <Link href="/signin">Sign in</Link></div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}