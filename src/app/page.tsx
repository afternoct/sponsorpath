import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;700&display=swap');
        :root { --blue:#3B82F6; --blue-l:#60A5FA; --green:#059669; --green-l:#34D399; --navy:#012169; --dark:#0F172A; --muted:#64748B; --border:#E2E8F0; --bg2:#F8FAFC; }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#0F172A;overflow-x:hidden;}
        a{text-decoration:none;color:inherit;}

        /* ════ NAV ════ */
        .nav{position:fixed;top:0;width:100%;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:1000;}
        .nav-wrap{max-width:1440px;margin:0 auto;padding:.3rem 2.5rem;display:flex;justify-content:space-between;align-items:center;}
        .logo-wrap{display:flex;align-items:center;}
        .logo-wrap img{height:80px!important;width:auto!important;display:block;object-fit:contain;}
        .nav-links{display:flex;gap:2.5rem;list-style:none;}
        .nav-links a{font-weight:500;font-size:.95rem;color:#0F172A;transition:color .25s;position:relative;padding-bottom:2px;}
        .nav-links a::after{content:'';position:absolute;bottom:-3px;left:0;width:0;height:2px;background:var(--blue);transition:width .3s;}
        .nav-links a:hover{color:var(--blue);}
        .nav-links a:hover::after{width:100%;}
        .nav-btns{display:flex;gap:.8rem;align-items:center;}
        .btn{display:inline-block;padding:.72rem 1.6rem;border-radius:8px;font-weight:600;font-size:.95rem;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;transition:all .25s;}
        .btn-ghost{background:transparent;color:#0F172A;border:1.5px solid var(--border);}
        .btn-ghost:hover{background:var(--bg2);border-color:var(--blue);}
        .btn-blue{background:var(--blue);color:#fff;box-shadow:0 4px 14px rgba(59,130,246,.28);}
        .btn-blue:hover{background:var(--blue-l);transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,.38);}
        .btn-green{background:var(--green);color:#fff;box-shadow:0 4px 14px rgba(5,150,105,.28);}
        .btn-green:hover{background:#047857;transform:translateY(-2px);}
        .btn-lg{padding:1rem 2.2rem;font-size:1.05rem;border-radius:10px;}

        /* ════ HERO ════ */
        .hero{margin-top:86px;background:linear-gradient(140deg,#EFF6FF 0%,#ECFDF5 45%,#EFF6FF 100%);padding:5rem 2.5rem 4.5rem;overflow:hidden;position:relative;}
        .hero-glow1{position:absolute;top:-80px;right:-80px;width:480px;height:480px;background:radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 70%);border-radius:50%;pointer-events:none;}
        .hero-glow2{position:absolute;bottom:-100px;left:-60px;width:380px;height:380px;background:radial-gradient(circle,rgba(16,185,129,.1) 0%,transparent 70%);border-radius:50%;pointer-events:none;}
        .hero-wrap{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;position:relative;z-index:1;}

        /* left */
        .hero-badge{display:inline-flex;align-items:center;gap:.55rem;padding:.48rem 1.1rem;background:rgba(1,33,105,.07);border:1.5px solid rgba(1,33,105,.16);border-radius:50px;font-size:.83rem;font-weight:700;color:var(--navy);margin-bottom:1.5rem;}
        .hero-left h1{font-family:'Archivo',sans-serif;font-size:3.8rem;font-weight:900;line-height:1.08;color:#0F172A;margin-bottom:1.25rem;letter-spacing:-.025em;}
        .hero-left h1 em{font-style:normal;background:linear-gradient(130deg,#3B82F6 0%,#012169 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero-left p{font-size:1.15rem;color:var(--muted);line-height:1.8;margin-bottom:2.5rem;max-width:500px;}
        .hero-btns{display:flex;gap:1rem;flex-wrap:wrap;}
        .hero-trust{margin-top:2rem;display:flex;align-items:center;gap:.75rem;color:var(--muted);font-size:.88rem;}
        .trust-dot{width:6px;height:6px;border-radius:50%;background:#10B981;}

        /* right — live dashboard */
        .hero-right{display:flex;justify-content:center;}
        .dash-card{width:100%;max-width:490px;background:linear-gradient(135deg,#1D4ED8 0%,#1E3A5F 100%);border-radius:22px;padding:2.1rem 2rem;box-shadow:0 32px 80px rgba(29,78,216,.25);position:relative;overflow:hidden;}
        .dash-card::before{content:'';position:absolute;top:-50px;right:-50px;width:190px;height:190px;background:rgba(255,255,255,.06);border-radius:50%;}
        .dash-card::after{content:'';position:absolute;bottom:-60px;left:-30px;width:230px;height:230px;background:rgba(52,211,153,.1);border-radius:50%;}
        .dc-top{display:flex;align-items:center;gap:.6rem;margin-bottom:1.3rem;position:relative;z-index:1;}
        .dc-dot{width:9px;height:9px;border-radius:50%;background:#34D399;}
        .dc-top h4{color:#fff;font-size:.92rem;font-weight:700;}
        .dc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1.1rem;position:relative;z-index:1;}
        .dc-s{background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.16);border-radius:9px;padding:.8rem .5rem;text-align:center;}
        .dc-s .n{font-family:'Archivo',sans-serif;font-size:1.4rem;font-weight:900;color:#fff;display:block;line-height:1;}
        .dc-s .l{font-size:.65rem;color:rgba(255,255,255,.65);margin-top:.2rem;display:block;}
        .dc-job{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:9px;padding:.8rem .95rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;position:relative;z-index:1;}
        .dc-job h5{color:#fff;font-size:.82rem;font-weight:700;margin-bottom:.15rem;}
        .dc-job p{color:rgba(255,255,255,.6);font-size:.7rem;}
        .dc-score{padding:.22rem .62rem;border-radius:50px;font-size:.74rem;font-weight:700;}
        .s-green{background:rgba(52,211,153,.22);color:#6EE7B7;}
        .s-blue{background:rgba(147,197,253,.2);color:#93C5FD;}
        .dc-pulse{display:flex;align-items:center;gap:.45rem;padding:.55rem .85rem;background:rgba(52,211,153,.16);border:1px solid rgba(52,211,153,.3);border-radius:8px;position:relative;z-index:1;}
        .pulse{width:7px;height:7px;background:#34D399;border-radius:50%;animation:blink 1.5s ease-in-out infinite;}
        @keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
        .dc-pulse span{color:#6EE7B7;font-size:.75rem;font-weight:700;}

        /* ════ STATS ════ */
        .stats{padding:2.25rem 2.5rem;border-bottom:1px solid var(--border);}
        .stats-wrap{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center;}
        .sc{padding:1.5rem;background:#fff;border:1px solid var(--border);border-radius:12px;transition:all .3s;}
        .sc:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(0,0,0,.07);border-color:var(--blue);}
        .sc-n{font-family:'Archivo',sans-serif;font-size:2.5rem;font-weight:900;color:var(--blue);line-height:1;margin-bottom:.3rem;}
        .sc-l{color:var(--muted);font-size:.85rem;font-weight:500;}

        /* ════ SECTION COMMON ════ */
        .stag{display:inline-block;padding:.4rem 1.1rem;background:var(--blue);color:#fff;border-radius:50px;font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:1rem;}
        .sh2{font-family:'Archivo',sans-serif;font-size:2.6rem;font-weight:800;color:#0F172A;margin-bottom:.85rem;line-height:1.2;}
        .ssub{font-size:1.05rem;color:var(--muted);}
        .shead{text-align:center;max-width:660px;margin:0 auto 3.5rem;}

        /* ════ FEATURES ════ */
        .features{padding:6rem 2.5rem;background:var(--bg2);}
        .feat-grid{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem;}
        .fc{background:#fff;padding:2.1rem;border-radius:16px;border:1px solid var(--border);transition:all .4s;position:relative;overflow:hidden;}
        .fc::before{content:'';position:absolute;top:0;left:0;width:100%;height:4px;background:linear-gradient(90deg,var(--blue),var(--navy));transform:scaleX(0);transform-origin:left;transition:transform .4s;}
        .fc:hover{transform:translateY(-7px);box-shadow:0 20px 40px rgba(0,0,0,.09);border-color:var(--blue);}
        .fc:hover::before{transform:scaleX(1);}
        .fi{width:52px;height:52px;background:linear-gradient(135deg,var(--blue),var(--navy));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.1rem;animation:float 3s ease-in-out infinite;}
        .fc:nth-child(2) .fi{animation-delay:.2s}.fc:nth-child(3) .fi{animation-delay:.4s}
        .fc:nth-child(4) .fi{animation-delay:.6s}.fc:nth-child(5) .fi{animation-delay:.8s}.fc:nth-child(6) .fi{animation-delay:1s}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .fc h3{font-family:'Archivo',sans-serif;font-size:1.18rem;font-weight:700;margin-bottom:.65rem;}
        .fc p{color:var(--muted);line-height:1.72;margin-bottom:1.1rem;font-size:.91rem;}
        .ftag{display:inline-flex;padding:.3rem .75rem;background:rgba(59,130,246,.1);color:var(--blue);border-radius:6px;font-size:.76rem;font-weight:700;}

        /* ════ HOW IT WORKS ════ */
        .hiw{padding:6rem 2.5rem;}
        .hiw-wrap{max-width:1440px;margin:0 auto;}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem;}
        .step{text-align:center;padding:2rem 1.5rem;border-radius:16px;border:1px solid var(--border);background:#fff;transition:all .3s;}
        .step:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(0,0,0,.08);border-color:var(--blue);}
        .snum{width:66px;height:66px;background:#fff;border:3px solid var(--blue);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.1rem;font-size:1.6rem;font-weight:900;font-family:'Archivo',sans-serif;color:var(--blue);box-shadow:0 5px 18px rgba(59,130,246,.16);transition:all .3s;}
        .step:hover .snum{background:var(--blue);color:#fff;}
        .step h3{font-family:'Archivo',sans-serif;font-size:1.08rem;font-weight:700;margin-bottom:.6rem;}
        .step p{color:var(--muted);font-size:.88rem;line-height:1.65;}
        .ebadge{display:inline-flex;align-items:center;gap:.28rem;padding:.26rem .65rem;background:linear-gradient(135deg,rgba(59,130,246,.1),rgba(1,33,105,.1));border:1px solid rgba(59,130,246,.2);border-radius:50px;font-size:.68rem;font-weight:700;color:var(--navy);margin-top:.6rem;}

        /* ════ ENGINE SECTION ════ */
        .engine{padding:5.5rem 2.5rem;background:linear-gradient(135deg,#0F172A 0%,#0F2952 100%);position:relative;overflow:hidden;}
        .engine::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 50%,rgba(59,130,246,.13) 0%,transparent 50%),radial-gradient(circle at 85% 50%,rgba(16,185,129,.09) 0%,transparent 50%);}
        .engine-wrap{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;position:relative;z-index:1;}
        .engine-txt h2{font-family:'Archivo',sans-serif;font-size:2.6rem;font-weight:900;color:#fff;line-height:1.2;margin-bottom:1.1rem;}
        .engine-txt h2 em{font-style:normal;background:linear-gradient(135deg,#60A5FA,#34D399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .engine-txt p{font-size:1.05rem;color:rgba(255,255,255,.78);line-height:1.82;margin-bottom:1.75rem;}
        .egrid{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem;}
        .ecard{padding:1.35rem;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;}
        .ecard .n{font-family:'Archivo',sans-serif;font-size:1.9rem;font-weight:900;color:#60A5FA;display:block;margin-bottom:.2rem;}
        .ecard .l{color:rgba(255,255,255,.6);font-size:.78rem;}

        /* ════ CTA ════ */
        .cta{padding:5.5rem 2.5rem;background:var(--bg2);border-top:1px solid var(--border);}
        .cta-wrap{max-width:760px;margin:0 auto;text-align:center;}
        .cta-wrap h2{font-family:'Archivo',sans-serif;font-size:2.8rem;font-weight:900;color:#0F172A;margin-bottom:1.1rem;line-height:1.2;}
        .cta-wrap p{font-size:1.15rem;color:var(--muted);margin-bottom:2.25rem;}
        .cta-btns{display:flex;gap:1.1rem;justify-content:center;}

        /* ════ FOOTER ════ */
        footer{background:#0F172A;color:rgba(255,255,255,.68);padding:3.5rem 2.5rem 1.75rem;}
        .foot-wrap{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4rem;margin-bottom:2.5rem;}
        .foot-logo img{height:62px!important;width:auto!important;filter:brightness(0) invert(1);margin-bottom:.9rem;display:block;}
        .foot-brand p{line-height:1.72;font-size:.9rem;}
        .foot-col h4{color:#fff;font-weight:700;margin-bottom:1rem;font-size:.92rem;}
        .foot-col ul{list-style:none;}
        .foot-col li{margin-bottom:.6rem;}
        .foot-col a{color:rgba(255,255,255,.6);font-size:.9rem;transition:color .25s;}
        .foot-col a:hover{color:#60A5FA;}
        .foot-bottom{max-width:1440px;margin:0 auto;padding-top:1.75rem;border-top:1px solid rgba(255,255,255,.1);text-align:center;color:rgba(255,255,255,.42);font-size:.84rem;}

        /* ════ RESPONSIVE ════ */
        @media(max-width:1100px){
          .hero-wrap,.engine-wrap{grid-template-columns:1fr;}
          .hero-right{display:none;}
          .feat-grid,.steps{grid-template-columns:1fr 1fr;}
        }
        @media(max-width:768px){
          .hero-left h1{font-size:2.6rem;}
          .nav-links{display:none;}
          .stats-wrap{grid-template-columns:1fr 1fr;}
          .feat-grid,.steps{grid-template-columns:1fr;}
          .foot-wrap{grid-template-columns:1fr;gap:2rem;}
          .hero-btns,.cta-btns{flex-direction:column;align-items:flex-start;}
          .sh2{font-size:2rem;}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-wrap">
          <div className="logo-wrap">
            <Image src="/logo.png" alt="SponsorPath" width={280} height={80} priority />
          </div>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
          <div className="nav-btns">
            <Link href="/signin" className="btn btn-ghost">Sign In</Link>
            <Link href="/get-started" className="btn btn-blue">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow1" /><div className="hero-glow2" />
        <div className="hero-wrap">

          {/* LEFT */}
          <div className="hero-left">
            <div className="hero-badge">
              <svg width="26" height="17" viewBox="0 0 60 36" style={{borderRadius:'3px',flexShrink:0}}>
                <rect width="60" height="36" fill="#012169"/>
                <path d="M0,0 L60,36 M60,0 L0,36" stroke="#fff" strokeWidth="6"/>
                <path d="M0,0 L60,36 M60,0 L0,36" stroke="#C8102E" strokeWidth="4"/>
                <path d="M30,0 V36 M0,18 H60" stroke="#fff" strokeWidth="10"/>
                <path d="M30,0 V36 M0,18 H60" stroke="#C8102E" strokeWidth="6"/>
              </svg>
              Built for UK Visa Candidates
            </div>
            <h1>
              Land Your UK Job.<br/>
              <em>SponsorPath Engine</em><br/>
              Handles the Rest.
            </h1>
            <p>
              Register once. Set your career preferences. The SponsorPath Engine searches
              thousands of roles, tailors your resume to every JD, and auto-submits
              applications — so you wake up to interview requests, not job-hunting stress.
            </p>
            <div className="hero-btns">
              <Link href="/get-started" className="btn btn-green btn-lg">Get Started Free →</Link>
              <Link href="#how-it-works" className="btn btn-ghost btn-lg">See How It Works</Link>
            </div>
            <div className="hero-trust">
              <div className="trust-dot"/><span>No credit card required</span>
              <div className="trust-dot"/><span>Free 14-day trial</span>
              <div className="trust-dot"/><span>Cancel anytime</span>
            </div>
          </div>

          {/* RIGHT — Live dashboard */}
          <div className="hero-right">
            <div className="dash-card">
              <div className="dc-top">
                <div className="dc-dot"/><h4>SponsorPath Dashboard</h4>
              </div>
              <div className="dc-grid">
                {[{n:'14',l:'Applied'},{n:'3',l:'Replies'},{n:'89%',l:'Avg Match'},{n:'✓',l:'ATS Pass'}].map(s=>(
                  <div key={s.l} className="dc-s">
                    <span className="n">{s.n}</span><span className="l">{s.l}</span>
                  </div>
                ))}
              </div>
              {[
                {t:'Senior DevOps Engineer',c:'Revolut · London',s:'94%',hi:true},
                {t:'Backend Software Engineer',c:'Monzo · London',s:'81%',hi:false},
                {t:'Data Engineer',c:'Wise · London',s:'88%',hi:true},
              ].map(j=>(
                <div key={j.t} className="dc-job">
                  <div><h5>{j.t}</h5><p>🏢 {j.c} · 🇬🇧 Sponsor ✓</p></div>
                  <span className={`dc-score ${j.hi?'s-green':'s-blue'}`}>{j.s}</span>
                </div>
              ))}
              <div className="dc-pulse">
                <div className="pulse"/><span>SponsorPath Engine actively searching...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats">
        <div className="stats-wrap">
          {[{n:'30%',l:'Response Rate'},{n:'5x',l:'Faster Applications'},{n:'30K+',l:'UK Sponsors Tracked'},{n:'0',l:'Fake Skills Added'}].map(s=>(
            <div key={s.l} className="sc"><div className="sc-n">{s.n}</div><div className="sc-l">{s.l}</div></div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="shead">
          <span className="stag">Why SponsorPath</span>
          <h2 className="sh2">Built Different. Built Better.</h2>
          <p className="ssub">A complete application quality engine — not just another resume builder.</p>
        </div>
        <div className="feat-grid">
          {[
            {i:'🎯',t:'Master Profile',d:"Upload once. We extract your real experience — nothing fabricated. Your verified truth source for every single application.",g:'100% Authentic'},
            {i:'⚙️',t:'SponsorPath Engine',d:"Our engine reads every JD, extracts requirements, detects mismatches early, and stops poor applications before they damage your reputation.",g:'Smart Matching'},
            {i:'✨',t:'Fresh CV Per Job',d:"Every application gets a brand-new tailored resume. Rewritten summary, reordered skills, job-specific language. Zero generic CVs ever.",g:'ATS-Optimised'},
            {i:'🇬🇧',t:'UK Visa Intelligence',d:"Detects UK sponsor licences, adapts for Graduate vs Skilled Worker visas. 30,000+ licensed sponsors tracked and updated weekly.",g:'UK-Specific'},
            {i:'🛡️',t:'Application Protection',d:"Hard stop for poor matches (<40%). No fake skills ever added. Daily application limits. We protect your professional reputation.",g:'Quality Gates'},
            {i:'📊',t:'Live Dashboard',d:"Track every application in real time. Response rates, interview conversions, top matched companies. Full visibility and analytics.",g:'Full Transparency'},
          ].map(f=>(
            <div key={f.t} className="fc">
              <div className="fi">{f.i}</div>
              <h3>{f.t}</h3><p>{f.d}</p>
              <span className="ftag">{f.g}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="hiw" id="how-it-works">
        <div className="hiw-wrap">
          <div className="shead">
            <span className="stag">Simple Process</span>
            <h2 className="sh2">From Sign Up to Dream Job</h2>
            <p className="ssub">One registration. Zero manual work. Maximum results.</p>
          </div>
          <div className="steps">
            {[
              {n:'1',t:'Register & Set Preferences',d:'Sign up and tell us your visa status, target stream — DevOps, Engineering, Finance, etc. — and your preferred UK locations.',e:false},
              {n:'2',t:'Upload Your Resume',d:'Upload your current CV. The SponsorPath Engine checks ATS standards and builds your verified Master Profile automatically.',e:true},
              {n:'3',t:'Engine Finds Your Jobs',d:'SponsorPath Engine searches job boards and company career pages daily in your chosen stream, filtering by UK sponsor licence status.',e:true},
              {n:'4',t:'Resume Matched to JD',d:'For every matched role, your resume is completely rewritten and tailored to that specific job description. A fresh CV every time.',e:true},
              {n:'5',t:'Applications Auto-Submitted',d:'SponsorPath Engine fills forms, answers screening questions, and submits your application directly to employers on your behalf.',e:true},
              {n:'6',t:'Track & Win Interviews',d:'Monitor every application in your dashboard. Get notified of responses. Focus on interview prep — not job hunting.',e:false},
            ].map(s=>(
              <div key={s.n} className="step">
                <div className="snum">{s.n}</div>
                <h3>{s.t}</h3><p>{s.d}</p>
                {s.e&&<div className="ebadge">⚡ SponsorPath Engine</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENGINE SHOWCASE ── */}
      <section className="engine">
        <div className="engine-wrap">
          <div className="engine-txt">
            <h2>Powered by the<br/><em>SponsorPath Engine</em></h2>
            <p>Our proprietary engine does what no job board can — reads your profile, understands your visa needs, searches thousands of jobs, tailors your resume for each one, and submits applications on your behalf. All automatically. All accurately. All day, every day.</p>
            <Link href="/get-started" className="btn btn-blue btn-lg">Start Free Trial</Link>
          </div>
          <div className="egrid">
            {[{n:'30K+',l:'UK Sponsors Tracked'},{n:'24/7',l:'Continuous Search'},{n:'<30s',l:'CV Per Job'},{n:'100%',l:'ATS Pass Rate'}].map(s=>(
              <div key={s.l} className="ecard"><span className="n">{s.n}</span><span className="l">{s.l}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta">
        <div className="cta-wrap">
          <h2>Ready to Stop Wasting Applications?</h2>
          <p>Let the SponsorPath Engine do the hard work while you prepare for interviews.</p>
          <div className="cta-btns">
            <Link href="/get-started" className="btn btn-blue btn-lg">Start Free Trial</Link>
            <Link href="/about" className="btn btn-ghost btn-lg">Learn More</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="foot-wrap">
          <div className="foot-brand">
            <div className="foot-logo"><Image src="/logo.png" alt="SponsorPath" width={240} height={62}/></div>
            <p>The SponsorPath Engine handles job search, resume tailoring, and application submission for UK visa candidates. Quality over quantity. Every single time.</p>
          </div>
          <div className="foot-col"><h4>Product</h4><ul>
            <li><a href="#features">Features</a></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#">Roadmap</a></li>
          </ul></div>
          <div className="foot-col"><h4>Resources</h4><ul>
            <li><a href="#">Blog</a></li>
            <li><a href="#">UK Sponsor List</a></li>
            <li><a href="#">Visa Guides</a></li>
            <li><a href="#">Help Centre</a></li>
          </ul></div>
          <div className="foot-col"><h4>Company</h4><ul>
            <li><Link href="/about">About Us</Link></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
          </ul></div>
        </div>
        <div className="foot-bottom"><p>&copy; 2026 SponsorPath. Built with ❤️ for UK job seekers. Not immigration advice.</p></div>
      </footer>
    </>
  )
}