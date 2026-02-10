import Image from 'next/image'
import Link from 'next/link'

export default function GetStarted() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;900&family=DM+Sans:wght@400;500;700&display=swap');
        :root{--blue:#3B82F6;--navy:#012169;--green:#059669;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:var(--bg2);color:#0F172A;min-height:100vh;}
        a{text-decoration:none;color:inherit;}

        .page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}

        /* LEFT */
        .left{background:linear-gradient(135deg,#1D4ED8 0%,#0F2952 100%);padding:3rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
        .left::before{content:'';position:absolute;top:-80px;right:-80px;width:350px;height:350px;background:rgba(255,255,255,.06);border-radius:50%;}
        .left::after{content:'';position:absolute;bottom:-100px;left:-50px;width:300px;height:300px;background:rgba(52,211,153,.1);border-radius:50%;}
        .left-logo img{height:70px!important;width:auto!important;filter:brightness(0) invert(1);display:block;}
        .left-body{position:relative;z-index:1;}
        .left-body h2{font-family:'Archivo',sans-serif;font-size:2.1rem;font-weight:900;color:#fff;line-height:1.2;margin-bottom:1rem;}
        .left-body h2 em{font-style:normal;color:#34D399;}
        .left-body p{color:rgba(255,255,255,.75);line-height:1.8;margin-bottom:2rem;font-size:.97rem;}
        .steps-preview{display:flex;flex-direction:column;gap:.85rem;}
        .sp-step{display:flex;align-items:flex-start;gap:.85rem;}
        .sp-num{width:32px;height:32px;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.82rem;flex-shrink:0;}
        .sp-step h4{color:#fff;font-size:.9rem;font-weight:700;margin-bottom:.2rem;}
        .sp-step p{color:rgba(255,255,255,.6);font-size:.8rem;line-height:1.5;}
        .left-footer p{color:rgba(255,255,255,.45);font-size:.8rem;position:relative;z-index:1;}

        /* RIGHT */
        .right{display:flex;align-items:center;justify-content:center;padding:3rem 2rem;}
        .form-box{width:100%;max-width:480px;}
        .back{display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.88rem;margin-bottom:2rem;transition:color .25s;}
        .back:hover{color:var(--blue);}

        /* Progress */
        .progress{display:flex;align-items:center;gap:.5rem;margin-bottom:2rem;}
        .prog-step{display:flex;align-items:center;gap:.5rem;}
        .prog-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:700;border:2px solid var(--border);}
        .prog-dot.done{background:var(--green);border-color:var(--green);color:#fff;}
        .prog-dot.active{background:var(--blue);border-color:var(--blue);color:#fff;}
        .prog-dot.pending{background:#fff;color:var(--muted);}
        .prog-line{flex:1;height:2px;background:var(--border);}
        .prog-line.done{background:var(--green);}
        .prog-label{font-size:.72rem;color:var(--muted);margin-top:.3rem;text-align:center;}

        .form-box h1{font-family:'Archivo',sans-serif;font-size:1.9rem;font-weight:900;margin-bottom:.45rem;}
        .form-box .sub{color:var(--muted);font-size:.93rem;margin-bottom:1.75rem;}

        .form-group{margin-bottom:1.2rem;}
        .form-group label{display:block;font-weight:600;font-size:.87rem;margin-bottom:.42rem;color:#374151;}
        .form-group input,.form-group select{width:100%;padding:.82rem 1rem;border:1.5px solid var(--border);border-radius:8px;font-size:.93rem;font-family:'DM Sans',sans-serif;color:#0F172A;background:#fff;transition:border-color .25s,box-shadow .25s;outline:none;}
        .form-group input:focus,.form-group select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.12);}
        .form-group input::placeholder{color:#94A3B8;}
        .two-fields{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}

        /* Stream chips */
        .chips{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:.5rem;}
        .chip{padding:.45rem 1rem;border:1.5px solid var(--border);border-radius:50px;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .25s;background:#fff;}
        .chip:hover{border-color:var(--blue);color:var(--blue);}
        .chip.sel{background:var(--blue);color:#fff;border-color:var(--blue);}

        .terms{font-size:.82rem;color:var(--muted);margin-bottom:1.5rem;line-height:1.6;}
        .terms a{color:var(--blue);font-weight:600;}

        .btn-submit{width:100%;padding:1rem;background:var(--green);color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;box-shadow:0 4px 14px rgba(5,150,105,.28);}
        .btn-submit:hover{background:#047857;transform:translateY(-1px);}

        .divider-or{display:flex;align-items:center;gap:1rem;margin:1.4rem 0;color:var(--muted);font-size:.86rem;}
        .divider-or::before,.divider-or::after{content:'';flex:1;border-top:1px solid var(--border);}

        .social-btn{width:100%;padding:.82rem;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-size:.9rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.65rem;transition:all .25s;margin-bottom:.7rem;}
        .social-btn:hover{border-color:var(--blue);background:var(--bg2);}

        .signin-link{text-align:center;margin-top:1.5rem;font-size:.9rem;color:var(--muted);}
        .signin-link a{color:var(--blue);font-weight:700;}

        @media(max-width:768px){.page{grid-template-columns:1fr;}.left{display:none;}.right{padding:2rem 1.5rem;align-items:flex-start;padding-top:3rem;}.two-fields{grid-template-columns:1fr;}}
      `}</style>

      <div className="page">
        {/* LEFT */}
        <div className="left">
          <div className="left-logo"><Image src="/logo.png" alt="SponsorPath" width={220} height={70} priority/></div>
          <div className="left-body">
            <h2>Start landing UK jobs<br/>with the <em>SponsorPath Engine.</em></h2>
            <p>Register in 2 minutes. Set your preferences. The engine handles the rest — 24/7, automatically, while you sleep.</p>
            <div className="steps-preview">
              {[
                {n:'1',t:'Create your account',d:'Email, password — takes 60 seconds.'},
                {n:'2',t:'Set your preferences',d:'Tell us your stream: DevOps, Finance, Engineering...'},
                {n:'3',t:'Upload your resume',d:'One time only. We build your Master Profile.'},
                {n:'4',t:'Engine starts working',d:'SponsorPath Engine finds & applies to jobs for you.'},
              ].map(s=>(
                <div key={s.n} className="sp-step">
                  <div className="sp-num">{s.n}</div>
                  <div><h4>{s.t}</h4><p>{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="left-footer"><p>Not immigration advice. &copy; 2026 SponsorPath</p></div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="form-box">
            <Link href="/" className="back">← Back to home</Link>

            {/* Progress bar */}
            <div className="progress">
              <div>
                <div className="prog-dot active">1</div>
              </div>
              <div className="prog-line"/>
              <div>
                <div className="prog-dot pending">2</div>
              </div>
              <div className="prog-line"/>
              <div>
                <div className="prog-dot pending">3</div>
              </div>
            </div>

            <h1>Create Your Account</h1>
            <p className="sub">Free to start. No credit card required.</p>

            <div className="two-fields">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" placeholder="John"/>
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" placeholder="Smith"/>
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com"/>
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="At least 8 characters"/>
            </div>

            <div className="form-group">
              <label>Visa Status</label>
              <select>
                <option value="">Select your visa status...</option>
                <option>Graduate Visa (PSW)</option>
                <option>Skilled Worker Visa</option>
                <option>Student Visa (need sponsorship on graduation)</option>
                <option>British Citizen / ILR</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Target Career Stream (select all that apply)</label>
              <div className="chips">
                {['Software Engineering','DevOps / Cloud','Data & Analytics','Product Management','Finance','Business Analysis','Consulting','Marketing','Design','Other'].map(c=>(
                  <span key={c} className="chip">{c}</span>
                ))}
              </div>
            </div>

            <p className="terms">
              By creating an account you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. We will never share your data with employers or third parties.
            </p>

            <button className="btn-submit">Create Account & Continue →</button>

            <div className="divider-or">or sign up with</div>

            <button className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <button className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              Continue with LinkedIn
            </button>

            <div className="signin-link">Already have an account? <Link href="/signin">Sign in</Link></div>
          </div>
        </div>
      </div>
    </>
  )
}