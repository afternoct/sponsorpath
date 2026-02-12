// FILE PATH: src/app/signin/page.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signInWithGoogle } from '@/lib/supabase'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(err.message.includes('Invalid') ? 'Incorrect email or password.' : err.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:var(--bg2);min-height:100vh;}
        a{text-decoration:none;color:inherit;}
        .page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}

        .left{background:linear-gradient(145deg,#1D4ED8 0%,#0A1628 100%);padding:3rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
        .blob{position:absolute;border-radius:50%;animation:bF 10s ease-in-out infinite;pointer-events:none;}
        .b1{width:400px;height:400px;background:rgba(96,165,250,.1);top:-120px;right:-100px;}
        .b2{width:450px;height:450px;background:rgba(52,211,153,.08);bottom:-150px;left:-100px;animation-delay:4s;}
        .b3{width:200px;height:200px;background:rgba(255,255,255,.04);top:35%;right:15%;animation-delay:7s;}
        @keyframes bF{0%,100%{transform:scale(1) translate(0,0)}40%{transform:scale(1.15) translate(20px,-15px)}70%{transform:scale(.88) translate(-12px,18px)}}
        .logo-box{display:flex;align-items:center;gap:.65rem;position:relative;z-index:1;}
        .logo-ic{width:42px;height:42px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.3rem;font-family:'Archivo',sans-serif;}
        .logo-nm{font-family:'Archivo',sans-serif;font-size:1.25rem;font-weight:900;color:#fff;}
        .logo-nm span{color:#34D399;}
        .dash-prev{position:relative;z-index:1;margin:1.5rem 0;}
        .dash-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:18px;padding:1.5rem;backdrop-filter:blur(10px);}
        .dc-top{display:flex;align-items:center;gap:.5rem;margin-bottom:1.2rem;}
        .dot-live{width:9px;height:9px;border-radius:50%;background:#34D399;animation:lPulse 2s ease-in-out infinite;}
        @keyframes lPulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}60%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
        .dc-top h4{color:#fff;font-size:.9rem;font-weight:700;}
        .dc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem;}
        .dc-s{background:rgba(255,255,255,.1);border-radius:10px;padding:.8rem .5rem;text-align:center;}
        .dc-s .n{font-family:'Archivo',sans-serif;font-size:1.5rem;font-weight:900;color:#fff;display:block;line-height:1;}
        .dc-s .l{font-size:.62rem;color:rgba(255,255,255,.58);margin-top:.18rem;display:block;}
        .dc-eng{display:flex;align-items:center;gap:.5rem;padding:.6rem .85rem;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.25);border-radius:9px;}
        .dc-eng .ep{width:7px;height:7px;border-radius:50%;background:#34D399;animation:lPulse 1.5s ease-in-out infinite;}
        .dc-eng span{color:#6EE7B7;font-size:.78rem;font-weight:700;}
        .notif{position:absolute;background:#fff;border-radius:10px;padding:.5rem .9rem;box-shadow:0 8px 24px rgba(0,0,0,.15);font-size:.76rem;font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:.4rem;animation:nFloat 4s ease-in-out infinite;}
        .n1{bottom:-10px;right:10px;color:#059669;animation-delay:0s;}
        .n2{top:0;right:-5px;color:#3B82F6;animation-delay:2s;}
        @keyframes nFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .left-body{position:relative;z-index:1;}
        .left-body h2{font-family:'Archivo',sans-serif;font-size:1.85rem;font-weight:900;color:#fff;line-height:1.22;margin-bottom:.75rem;}
        .left-body h2 em{font-style:normal;color:#34D399;}
        .left-body p{color:rgba(255,255,255,.7);line-height:1.8;font-size:.92rem;}
        .left-foot{color:rgba(255,255,255,.35);font-size:.75rem;position:relative;z-index:1;}

        .right{display:flex;align-items:center;justify-content:center;padding:3rem 2.5rem;}
        .form-box{width:100%;max-width:440px;}
        .back{display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.85rem;margin-bottom:2rem;transition:color .25s;}
        .back:hover{color:var(--blue);}
        .form-box h1{font-family:'Archivo',sans-serif;font-size:1.9rem;font-weight:900;margin-bottom:.4rem;color:#0A0F1E;}
        .sub{color:var(--muted);font-size:.91rem;margin-bottom:1.7rem;}
        .fg{margin-bottom:1.2rem;}
        .fg label{display:block;font-weight:600;font-size:.85rem;margin-bottom:.42rem;color:#374151;}
        .fg input{width:100%;padding:.82rem 1rem;border:1.5px solid var(--border);border-radius:8px;font-size:.93rem;font-family:'DM Sans',sans-serif;color:#0A0F1E;background:#fff;outline:none;transition:border-color .25s,box-shadow .25s;}
        .fg input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.1);}
        .fg input::placeholder{color:#94A3B8;}
        .forgot{display:flex;justify-content:flex-end;margin-top:-.7rem;margin-bottom:1.25rem;}
        .forgot a{font-size:.84rem;color:var(--blue);font-weight:600;}
        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:8px;padding:.7rem 1rem;color:#DC2626;font-size:.84rem;margin-bottom:1rem;}
        .btn-main{width:100%;padding:1rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-size:1rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(59,130,246,.28);}
        .btn-main:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.36);}
        .btn-main:disabled{opacity:.6;cursor:not-allowed;}
        .divider{display:flex;align-items:center;gap:1rem;margin:1.35rem 0;color:var(--muted);font-size:.82rem;}
        .divider::before,.divider::after{content:'';flex:1;border-top:1px solid var(--border);}
        .soc{width:100%;padding:.78rem;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-size:.89rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.6rem;transition:all .25s;margin-bottom:.6rem;}
        .soc:hover{border-color:var(--blue);background:var(--bg2);}
        .bot{text-align:center;margin-top:1.5rem;font-size:.88rem;color:var(--muted);}
        .bot a{color:var(--blue);font-weight:700;}
        @media(max-width:900px){.page{grid-template-columns:1fr;}.left{display:none;}.right{padding:2.5rem 1.5rem;}}
      `}</style>

      <div className="page">
        <div className="left">
          <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
          <div className="logo-box">
            <div className="logo-ic">S</div>
            <div className="logo-nm">Sponsor<span>Path</span></div>
          </div>
          <div className="dash-prev" style={{position:'relative'}}>
            <div className="notif n1">✅ Interview at Revolut booked!</div>
            <div className="notif n2">⚡ 14 jobs applied overnight</div>
            <div className="dash-card">
              <div className="dc-top"><div className="dot-live"/><h4>Your Dashboard is ready</h4></div>
              <div className="dc-stats">
                {[{n:'12',l:'Applied Today'},{n:'3',l:'Responses'},{n:'89%',l:'Avg Match'}].map(s=>(
                  <div key={s.l} className="dc-s"><span className="n">{s.n}</span><span className="l">{s.l}</span></div>
                ))}
              </div>
              <div className="dc-eng"><div className="ep"/><span>⚡ SponsorPath Engine is actively searching for you...</span></div>
            </div>
          </div>
          <div className="left-body">
            <h2>Welcome back.<br/>Your <em>jobs are waiting.</em></h2>
            <p>The SponsorPath Engine has been searching and applying on your behalf. Sign in to see your latest results, responses, and upcoming interviews.</p>
          </div>
          <div className="left-foot"><p>Not immigration advice. © 2026 SponsorPath</p></div>
        </div>

        <div className="right">
          <div className="form-box">
            <Link href="/" className="back">← Back to home</Link>
            <h1>Sign In</h1>
            <p className="sub">Enter your credentials to access your dashboard.</p>
            {error && <div className="err">⚠️ {error}</div>}
            <div className="fg">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/>
            </div>
            <div className="fg">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            </div>
            <div className="forgot"><a href="#">Forgot password?</a></div>
            <button className="btn-main" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In →'}
            </button>
            <div className="divider">or continue with</div>
            <button className="soc" onClick={() => signInWithGoogle()}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <div className="bot">Don&apos;t have an account? <Link href="/get-started">Sign up free</Link></div>
          </div>
        </div>
      </div>
    </>
  )
}