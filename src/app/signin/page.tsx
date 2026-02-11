// ════════════════════════════════════════════════════════
// FILE PATH: src/app/signin/page.tsx  →  localhost:3000/signin
// ════════════════════════════════════════════════════════
// Handles: wrong password, unconfirmed email (most common issue),
// and offers to resend confirmation email if needed.
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signInWithGoogle, signInWithLinkedIn, supabase } from '@/lib/supabase'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError]       = useState('')
  const [errorType, setErrorType] = useState<'wrong'|'unconfirmed'|''>('')
  const [resent, setResent]     = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError(''); setErrorType('')
    const { data, error: err } = await signIn(email, password)
    setLoading(false)

    if (!err) {
      router.push('/dashboard')
      return
    }

    // Supabase error messages for unconfirmed accounts:
    // "Email not confirmed" or "Invalid login credentials"
    const msg = err.message.toLowerCase()
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      setErrorType('unconfirmed')
      setError('Your email address has not been confirmed yet.')
    } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      // Could be wrong password OR unconfirmed — check if user exists
      setErrorType('unconfirmed')
      setError('Login failed. If you just registered, please confirm your email first.')
    } else {
      setErrorType('wrong')
      setError(err.message)
    }
  }

  const resendConfirmation = async () => {
    if (!email) { setError('Enter your email address above first.'); return }
    setResending(true)
    const { error: err } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (err) { setError('Could not resend: ' + err.message); return }
    setResent(true)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--green:#059669;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:var(--bg2);min-height:100vh;}
        a{text-decoration:none;color:inherit;}
        .page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}
        .left{background:linear-gradient(145deg,#1D4ED8,#0A1628);padding:3rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
        .b{position:absolute;border-radius:50%;animation:bF 10s ease-in-out infinite;}
        .b1{width:400px;height:400px;background:rgba(96,165,250,.1);top:-120px;right:-100px;}
        .b2{width:450px;height:450px;background:rgba(52,211,153,.08);bottom:-150px;left:-100px;animation-delay:4s;}
        @keyframes bF{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
        .logo{display:flex;align-items:center;gap:.65rem;z-index:1;position:relative;}
        .li{width:42px;height:42px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.3rem;font-family:'Archivo',sans-serif;}
        .ln{font-family:'Archivo',sans-serif;font-size:1.25rem;font-weight:900;color:#fff;}
        .ln span{color:#34D399;}
        .dash-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:18px;padding:1.5rem;backdrop-filter:blur(10px);z-index:1;position:relative;margin:0 0 1.5rem;}
        .dc-top{display:flex;align-items:center;gap:.5rem;margin-bottom:1.2rem;}
        .live-dot{width:9px;height:9px;border-radius:50%;background:#34D399;animation:lp 2s ease-in-out infinite;}
        @keyframes lp{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}60%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
        .dc-top h4{color:#fff;font-size:.9rem;font-weight:700;}
        .dc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem;}
        .dc-s{background:rgba(255,255,255,.1);border-radius:10px;padding:.8rem .5rem;text-align:center;}
        .dc-s strong{font-family:'Archivo',sans-serif;font-size:1.5rem;font-weight:900;color:#fff;display:block;line-height:1;}
        .dc-s span{font-size:.62rem;color:rgba(255,255,255,.58);display:block;margin-top:.18rem;}
        .dc-eng{display:flex;align-items:center;gap:.5rem;padding:.6rem .85rem;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.25);border-radius:9px;}
        .ep{width:7px;height:7px;border-radius:50%;background:#34D399;animation:lp 1.5s ease-in-out infinite;}
        .dc-eng p{color:#6EE7B7;font-size:.78rem;font-weight:700;}
        .lb{position:relative;z-index:1;}
        .lb h2{font-family:'Archivo',sans-serif;font-size:1.85rem;font-weight:900;color:#fff;line-height:1.22;margin-bottom:.75rem;}
        .lb h2 em{font-style:normal;color:#34D399;}
        .lb p{color:rgba(255,255,255,.7);line-height:1.8;font-size:.92rem;}
        .lf{color:rgba(255,255,255,.35);font-size:.75rem;z-index:1;position:relative;}
        .right{display:flex;align-items:center;justify-content:center;padding:3rem 2.5rem;}
        .box{width:100%;max-width:420px;}
        .back{display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.85rem;margin-bottom:2rem;transition:color .25s;}
        .back:hover{color:var(--blue);}
        .box h1{font-family:'Archivo',sans-serif;font-size:1.9rem;font-weight:900;margin-bottom:.4rem;}
        .sub{color:var(--muted);font-size:.91rem;margin-bottom:1.7rem;}
        .fg{margin-bottom:1.2rem;}
        .fg label{display:block;font-weight:600;font-size:.85rem;margin-bottom:.42rem;color:#374151;}
        .fg input{width:100%;padding:.82rem 1rem;border:1.5px solid var(--border);border-radius:8px;font-size:.93rem;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .25s,box-shadow .25s;background:#fff;}
        .fg input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.1);}
        .fg input::placeholder{color:#94A3B8;}
        .frgt{display:flex;justify-content:flex-end;margin:-0.5rem 0 1.2rem;}
        .frgt a{font-size:.84rem;color:var(--blue);font-weight:600;}

        /* Error styles */
        .err-box{border-radius:10px;padding:.85rem 1rem;font-size:.84rem;margin-bottom:1rem;}
        .err-wrong{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);color:#DC2626;}
        .err-unconfirmed{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.28);color:#92400E;}
        .err-box .err-title{font-weight:700;margin-bottom:.3rem;display:flex;align-items:center;gap:.4rem;}
        .err-box .err-msg{font-size:.82rem;margin-bottom:.7rem;line-height:1.55;}
        .resend-btn{display:inline-flex;align-items:center;gap:.4rem;background:rgba(245,158,11,.12);border:1.5px solid rgba(245,158,11,.35);color:#B45309;padding:.45rem .9rem;border-radius:7px;font-size:.8rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;}
        .resend-btn:hover:not(:disabled){background:rgba(245,158,11,.2);}
        .resend-btn:disabled{opacity:.55;cursor:not-allowed;}
        .resent-badge{display:inline-flex;align-items:center;gap:.4rem;background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.2);color:#059669;padding:.45rem .9rem;border-radius:7px;font-size:.8rem;font-weight:700;}

        .btn{width:100%;padding:1rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-size:1rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(59,130,246,.28);}
        .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.36);}
        .btn:disabled{opacity:.6;cursor:not-allowed;}
        .div{display:flex;align-items:center;gap:1rem;margin:1.35rem 0;color:var(--muted);font-size:.82rem;}
        .div::before,.div::after{content:'';flex:1;border-top:1px solid var(--border);}
        .soc{width:100%;padding:.78rem;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-size:.89rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.6rem;transition:all .25s;margin-bottom:.6rem;}
        .soc:hover{border-color:var(--blue);background:var(--bg2);}
        .bot{text-align:center;margin-top:1.5rem;font-size:.88rem;color:var(--muted);}
        .bot a{color:var(--blue);font-weight:700;}
        @media(max-width:900px){.page{grid-template-columns:1fr;}.left{display:none;}.right{padding:2.5rem 1.5rem;}}
      `}</style>
      <div className="page">
        <div className="left">
          <div className="b b1"/><div className="b b2"/>
          <div className="logo"><div className="li">S</div><div className="ln">Sponsor<span>Path</span></div></div>
          <div>
            <div className="dash-card">
              <div className="dc-top"><div className="live-dot"/><h4>Your Dashboard is ready</h4></div>
              <div className="dc-grid">
                {[{n:'12',l:'Applied Today'},{n:'3',l:'Responses'},{n:'89%',l:'Avg Match'}].map(s=>(
                  <div key={s.l} className="dc-s"><strong>{s.n}</strong><span>{s.l}</span></div>
                ))}
              </div>
              <div className="dc-eng"><div className="ep"/><p>⚡ SponsorPath Engine actively searching...</p></div>
            </div>
            <div className="lb">
              <h2>Welcome back.<br/>Your <em>jobs are waiting.</em></h2>
              <p>The Engine has been searching and applying while you were away. Sign in to see your latest results.</p>
            </div>
          </div>
          <div className="lf"><p>Not immigration advice. © 2026 SponsorPath</p></div>
        </div>

        <div className="right">
          <div className="box">
            <Link href="/" className="back">← Back to home</Link>
            <h1>Sign In</h1>
            <p className="sub">Access your dashboard and application tracker.</p>

            {/* ── UNCONFIRMED EMAIL ERROR ── */}
            {error && errorType === 'unconfirmed' && (
              <div className="err-box err-unconfirmed">
                <div className="err-title">⚠️ Email not confirmed</div>
                <div className="err-msg">
                  Your account exists but your email hasn't been verified yet.
                  Check your inbox for a confirmation email from Supabase and click the link inside.
                </div>
                {resent ? (
                  <span className="resent-badge">✅ Confirmation email sent! Check your inbox.</span>
                ) : (
                  <button className="resend-btn" onClick={resendConfirmation} disabled={resending}>
                    {resending ? '⏳ Sending...' : '📧 Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {/* ── WRONG PASSWORD ERROR ── */}
            {error && errorType === 'wrong' && (
              <div className="err-box err-wrong">
                <div className="err-title">⚠️ Sign in failed</div>
                <div className="err-msg">{error}</div>
              </div>
            )}

            <div className="fg">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
            </div>
            <div className="fg">
              <label>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Your password" onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
            </div>
            <div className="frgt"><a href="#">Forgot password?</a></div>
            <button className="btn" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
            <div className="div">or continue with</div>
            <button className="soc" onClick={()=>signInWithGoogle()}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <button className="soc" onClick={()=>signInWithLinkedIn()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              Continue with LinkedIn
            </button>
            <div className="bot">No account yet? <Link href="/get-started">Sign up free</Link></div>
          </div>
        </div>
      </div>
    </>
  )
}