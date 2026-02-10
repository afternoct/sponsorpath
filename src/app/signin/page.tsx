'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { verifyOtp } from '@/lib/supabase'

export default function VerifyEmail() {
  const router = useRouter()
  const [otp, setOtp] = useState(['','','','','',''])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(300)

  useEffect(() => {
    const e = sessionStorage.getItem('sp_verify_email') || ''
    setEmail(e)
    const interval = setInterval(() => setTimer(t => t > 0 ? t-1 : 0), 1000)
    return () => clearInterval(interval)
  }, [])

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  const handleChange = (i: number, v: string) => {
    if (!/^[0-9]?$/.test(v)) return
    const next = [...otp]; next[i] = v; setOtp(next)
    if (v && i < 5) (document.getElementById(`o${i+1}`) as HTMLInputElement)?.focus()
  }
  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) (document.getElementById(`o${i-1}`) as HTMLInputElement)?.focus()
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (paste.length === 6) setOtp(paste.split(''))
  }

  const verify = async () => {
    const token = otp.join('')
    if (token.length < 6) { setError('Please enter the full 6-digit code.'); return }
    if (!email) { setError('Session expired. Please register again.'); return }
    setLoading(true); setError('')
    const { error: err } = await verifyOtp(email, token)
    setLoading(false)
    if (err) { setError('Invalid or expired code. Please try again.'); return }
    sessionStorage.removeItem('sp_verify_email')
    router.push('/dashboard')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#F8FAFC;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#0A0F1E;}
        a{text-decoration:none;color:inherit;}
        .page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}
        .left{background:linear-gradient(145deg,#1D4ED8,#0F2952);padding:3rem;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;}
        .b1,.b2{position:absolute;border-radius:50%;animation:bF 9s ease-in-out infinite;}
        .b1{width:350px;height:350px;background:rgba(255,255,255,.05);top:-80px;right:-80px;}
        .b2{width:400px;height:400px;background:rgba(52,211,153,.07);bottom:-120px;left:-80px;animation-delay:3s;}
        @keyframes bF{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        .left-inner{position:relative;z-index:1;text-align:center;}
        .shield{font-size:5rem;margin-bottom:1.5rem;animation:shieldPulse 3s ease-in-out infinite;}
        @keyframes shieldPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        .left-inner h2{font-family:'Archivo',sans-serif;font-size:2rem;font-weight:900;color:#fff;margin-bottom:1rem;line-height:1.2;}
        .left-inner h2 em{font-style:normal;color:#34D399;}
        .left-inner p{color:rgba(255,255,255,.7);line-height:1.8;font-size:.95rem;}
        .sec-points{margin-top:2rem;display:flex;flex-direction:column;gap:.75rem;text-align:left;}
        .sp{display:flex;align-items:center;gap:.65rem;padding:.7rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;}
        .sp .icon{font-size:1.1rem;}
        .sp p{color:rgba(255,255,255,.8);font-size:.84rem;}

        .right{display:flex;align-items:center;justify-content:center;padding:3rem 2rem;}
        .box{width:100%;max-width:440px;}
        .back-lnk{display:inline-flex;align-items:center;gap:.4rem;color:#64748B;font-size:.85rem;margin-bottom:2rem;transition:color .25s;}
        .back-lnk:hover{color:#3B82F6;}
        .otp-icon{font-size:3.5rem;margin-bottom:1.25rem;text-align:center;}
        .box h1{font-family:'Archivo',sans-serif;font-size:1.9rem;font-weight:900;margin-bottom:.5rem;text-align:center;}
        .hint{color:#64748B;font-size:.9rem;margin-bottom:.4rem;text-align:center;}
        .email-show{font-weight:700;color:#1D4ED8;font-size:.9rem;text-align:center;margin-bottom:1.75rem;}
        .otp-row{display:flex;gap:.65rem;justify-content:center;margin:0 0 1.5rem;}
        .otp-in{width:52px;height:58px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:1.65rem;font-weight:900;text-align:center;font-family:'Archivo',sans-serif;color:#1D4ED8;background:#fff;outline:none;transition:all .25s;-moz-appearance:textfield;}
        .otp-in:focus{border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,.12);}
        .otp-in::-webkit-inner-spin-button{-webkit-appearance:none;}
        .otp-in.filled{border-color:#3B82F6;background:#EFF6FF;}
        .timer{text-align:center;margin-bottom:.5rem;font-size:.85rem;color:#64748B;}
        .timer strong{color:#EF4444;}
        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:.7rem 1rem;color:#DC2626;font-size:.84rem;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;}
        .btn-v{width:100%;padding:1rem;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;border-radius:9px;font-size:1rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(59,130,246,.28);margin-bottom:1rem;}
        .btn-v:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.36);}
        .btn-v:disabled{opacity:.6;cursor:not-allowed;}
        .resend{text-align:center;font-size:.84rem;color:#64748B;}
        .resend button{background:none;border:none;color:#3B82F6;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;}
        .resend button:disabled{color:#94A3B8;cursor:not-allowed;}
        .note{background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:.75rem 1rem;font-size:.8rem;color:#64748B;margin-top:1rem;display:flex;align-items:flex-start;gap:.5rem;line-height:1.6;}
        @media(max-width:768px){.page{grid-template-columns:1fr;}.left{display:none;}}
      `}</style>

      <div className="page">
        <div className="left">
          <div className="b1"/><div className="b2"/>
          <div className="left-inner">
            <div className="shield">🛡️</div>
            <h2>Your account is<br/><em>almost ready.</em></h2>
            <p>We sent a 6-digit verification code to your email. Enter it to activate your account and access your dashboard.</p>
            <div className="sec-points">
              {[{i:'🔒',t:'End-to-end encrypted — your data is always private'},
                {i:'📧',t:'Code sent from no-reply@sponsorpath.com'},
                {i:'⏱️',t:'Code expires in 5 minutes for your security'},
                {i:'🚀',t:'After verifying — your dashboard is ready instantly'}].map(s=>(
                <div key={s.t} className="sp"><span className="icon">{s.i}</span><p>{s.t}</p></div>
              ))}
            </div>
          </div>
        </div>

        <div className="right">
          <div className="box">
            <Link href="/get-started" className="back-lnk">← Back to registration</Link>
            <div className="otp-icon">📱</div>
            <h1>Check Your Email</h1>
            <p className="hint">We sent a 6-digit code to</p>
            <p className="email-show">{email || 'your email address'}</p>

            <div className="otp-row" onPaste={handlePaste}>
              {otp.map((v,i)=>(
                <input key={i} id={`o${i}`} className={`otp-in${v?' filled':''}`}
                  type="number" value={v} maxLength={1}
                  onChange={e=>handleChange(i,e.target.value)}
                  onKeyDown={e=>handleKey(i,e)}
                  autoFocus={i===0}/>
              ))}
            </div>

            <div className="timer">Code expires in <strong>{fmt(timer)}</strong></div>

            {error && <div className="err">⚠️ {error}</div>}

            <button className="btn-v" onClick={verify} disabled={loading || otp.join('').length < 6}>
              {loading ? 'Verifying...' : 'Verify & Access Dashboard →'}
            </button>

            <div className="resend">
              Didn&apos;t receive the code?{' '}
              <button disabled={timer > 240} onClick={()=>setTimer(300)}>
                {timer > 240 ? `Resend in ${fmt(timer-240)}` : 'Resend code'}
              </button>
            </div>

            <div className="note">
              🔍 Can&apos;t find it? Check your <strong>spam/junk folder</strong>. The email comes from no-reply@sponsorpath.com
            </div>
          </div>
        </div>
      </div>
    </>
  )
}