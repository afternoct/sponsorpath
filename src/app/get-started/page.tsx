// ════════════════════════════════════════════════════════
// FILE PATH: src/app/get-started/page.tsx  →  localhost:3000/get-started
// ════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp, signInWithGoogle } from '@/lib/supabase'

const STREAMS = ['Software Engineering','DevOps / Cloud','Data & Analytics','Product Management','Finance & Banking','Business Analysis','Consulting','Cyber Security','Marketing','UX / Design','HR & Talent','Operations','Other']

export default function GetStarted() {
  const router = useRouter()
  const [streams, setStreams] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', visaStatus:'', locations:'' })

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
    // Store email for OTP verification step
    sessionStorage.setItem('sp_verify_email', form.email)
    router.push('/get-started/verify')
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
        @keyframes logoPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
        .logo-nm{font-family:'Archivo',sans-serif;font-size:1.2rem;font-weight:900;color:#fff;}
        .logo-nm span{color:#34D399;}

        /* Illustration */
        .illo{position:relative;z-index:1;margin:1.5rem 0;display:flex;justify-content:center;}
        .illo-inner{position:relative;width:280px;height:220px;}
        .float-card{position:absolute;background:rgba(255,255,255,.14);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:.55rem 1rem;font-size:.76rem;font-weight:700;color:#fff;white-space:nowrap;display:flex;align-items:center;gap:.45rem;animation:cardF 4s ease-in-out infinite;}
        .fc1{top:10px;left:-10px;animation-delay:0s;}
        .fc2{top:50px;right:-15px;animation-delay:1.4s;}
        .fc3{bottom:40px;left:5px;animation-delay:2.8s;}
        @keyframes cardF{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}

        .left-body{position:relative;z-index:1;}
        .left-body h2{font-family:'Archivo',sans-serif;font-size:1.85rem;font-weight:900;color:#fff;line-height:1.22;margin-bottom:.85rem;}
        .left-body h2 em{font-style:normal;color:#34D399;}
        .left-body p{color:rgba(255,255,255,.7);line-height:1.8;margin-bottom:1.6rem;font-size:.93rem;}
        .sp-steps{display:flex;flex-direction:column;gap:.8rem;}
        .sp-step{display:flex;align-items:flex-start;gap:.85rem;}
        .sp-num{width:32px;height:32px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.8rem;flex-shrink:0;transition:all .3s;}
        .sp-step:hover .sp-num{background:rgba(52,211,153,.3);border-color:#34D399;}
        .sp-txt h4{color:#fff;font-size:.86rem;font-weight:700;margin-bottom:.15rem;}
        .sp-txt p{color:rgba(255,255,255,.55);font-size:.76rem;line-height:1.5;}
        .left-foot{color:rgba(255,255,255,.38);font-size:.76rem;position:relative;z-index:1;}

        /* RIGHT */
        .right{display:flex;align-items:flex-start;justify-content:center;padding:2rem 2rem;overflow-y:auto;}
        .form-box{width:100%;max-width:500px;padding-top:.5rem;}
        .back-lnk{display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.85rem;margin-bottom:1.5rem;transition:color .25s;}
        .back-lnk:hover{color:var(--blue);}

        /* Progress */
        .prog{display:flex;align-items:center;margin-bottom:1.75rem;}
        .pdot{display:flex;flex-direction:column;align-items:center;}
        .pdot-c{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:700;border:2px solid var(--border);background:#fff;color:var(--muted);transition:all .3s;}
        .pdot-c.active{background:var(--blue);border-color:var(--blue);color:#fff;}
        .pdot-c.done{background:var(--green);border-color:var(--green);color:#fff;}
        .pdot-l{font-size:.67rem;color:var(--muted);margin-top:.28rem;white-space:nowrap;}
        .pline{flex:1;height:2px;background:var(--border);margin:0 .4rem;margin-bottom:1.1rem;}

        .form-box h1{font-family:'Archivo',sans-serif;font-size:1.8rem;font-weight:900;margin-bottom:.38rem;}
        .sub{color:var(--muted);font-size:.9rem;margin-bottom:1.5rem;}

        .fg{margin-bottom:1.1rem;}
        .fg label{display:block;font-weight:600;font-size:.85rem;margin-bottom:.4rem;color:#374151;}
        .fg input,.fg select{width:100%;padding:.8rem .95rem;border:1.5px solid var(--border);border-radius:8px;font-size:.92rem;font-family:'DM Sans',sans-serif;color:#0A0F1E;background:#fff;transition:border-color .25s,box-shadow .25s;outline:none;}
        .fg input:focus,.fg select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.1);}
        .fg input::placeholder{color:#94A3B8;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}

        /* CHIPS */
        .chips{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.45rem;}
        .chip{padding:.4rem .9rem;border:1.5px solid var(--border);border-radius:50px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .22s;background:#fff;user-select:none;}
        .chip:hover{border-color:var(--blue);color:var(--blue);}
        .chip.on{background:var(--blue);color:#fff;border-color:var(--blue);transform:scale(1.04);}
        .sel-count{margin-top:.45rem;font-size:.76rem;font-weight:700;color:var(--green);}

        /* ERROR */
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

        @media(max-width:900px){.page{grid-template-columns:1fr;}.left{display:none;}.right{padding:2rem 1.5rem;}.two{grid-template-columns:1fr;}}
      `}</style>

      <div className="page">
        {/* LEFT */}
        <div className="left">
          <div className="b1 blob"/><div className="b2 blob"/><div className="b3 blob"/><div className="b4 blob"/>
          <div className="logo-box"><div className="logo-ic">S</div><div className="logo-nm">Sponsor<span>Path</span></div></div>

          <div className="illo">
            <div className="illo-inner">
              <div className="float-card fc1">✅ 3 Interview Invites!</div>
              <div className="float-card fc2">📄 CV Tailored in 12s</div>
              <div className="float-card fc3">🇬🇧 Sponsor Verified ✓</div>
              <svg viewBox="0 0 280 220" style={{width:'100%',height:'100%',position:'absolute',top:0,left:0}}>
                {/* Monitor */}
                <rect x="70" y="55" width="140" height="95" rx="8" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" strokeWidth="1.5"/>
                <rect x="76" y="61" width="128" height="78" rx="4" fill="rgba(59,130,246,.3)"/>
                {/* Screen lines */}
                <rect x="82" y="68" width="75" height="4" rx="2" fill="rgba(255,255,255,.65)"/>
                <rect x="82" y="76" width="55" height="3" rx="1.5" fill="rgba(255,255,255,.4)"/>
                <rect x="82" y="83" width="65" height="3" rx="1.5" fill="rgba(255,255,255,.4)"/>
                <rect x="82" y="90" width="45" height="3" rx="1.5" fill="rgba(255,255,255,.35)"/>
                {/* Score badge */}
                <rect x="155" y="108" width="38" height="14" rx="7" fill="rgba(52,211,153,.5)"/>
                <text x="174" y="119" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800">94%</text>
                {/* Stand */}
                <rect x="135" y="150" width="10" height="12" fill="rgba(255,255,255,.18)"/>
                <rect x="115" y="162" width="50" height="5" rx="2.5" fill="rgba(255,255,255,.18)"/>
                {/* Keyboard */}
                <rect x="88" y="174" width="104" height="14" rx="4" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth="1"/>
                <rect x="91" y="177" width="98" height="8" rx="2" fill="rgba(255,255,255,.06)"/>
                {/* Person */}
                <circle cx="140" cy="35" r="14" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
                <circle cx="136" cy="31" r="3" fill="rgba(255,255,255,.5)"/>
                <circle cx="144" cy="31" r="3" fill="rgba(255,255,255,.5)"/>
                <path d="M133 38 Q140 43 147 38" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                {/* Live pulse */}
                <circle cx="205" cy="63" r="5" fill="#34D399" opacity=".9">
                  <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".9;.3;.9" dur="2s" repeatCount="indefinite"/>
                </circle>
                {/* Decorative arcs */}
                <path d="M30 160 Q60 120 90 150" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" fill="none" strokeDasharray="4,4"/>
                <path d="M190 160 Q220 130 250 155" stroke="rgba(52,211,153,.2)" strokeWidth="1.5" fill="none" strokeDasharray="4,4"/>
              </svg>
            </div>
          </div>

          <div className="left-body">
            <h2>Start landing UK jobs<br/>with the <em>SponsorPath Engine.</em></h2>
            <p>Register in 2 minutes. The engine finds jobs, tailors your CV, and applies — 24/7, automatically.</p>
            <div className="sp-steps">
              {[{n:'1',t:'Create your account',d:'Email & password — takes 60 seconds.'},
                {n:'2',t:'Set your preferences',d:'Tell us your stream: DevOps, Finance...'},
                {n:'3',t:'Upload your resume',d:'One time only. We build your Master Profile.'},
                {n:'4',t:'Engine starts working',d:'Finds & applies to jobs automatically.'}].map(s=>(
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
            <Link href="/" className="back-lnk">← Back to home</Link>

            {/* Progress */}
            <div className="prog">
              {[{l:'Account'},{l:'Verify'},{l:'Resume'}].map((s,i)=>(
                <><div key={s.l} className="pdot"><div className={`pdot-c ${i===0?'active':''}`}>{i+1}</div><div className="pdot-l">{s.l}</div></div>{i<2&&<div key={`l${i}`} className="pline"/>}</>
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
            <div className="si-lnk">Already have an account? <Link href="/signin">Sign in</Link></div>
          </div>
        </div>
      </div>
    </>
  )
}