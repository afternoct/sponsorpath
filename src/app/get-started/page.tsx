'use client'
import Link from 'next/link'
import { useEffect } from 'react'

export default function About() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries =>
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.rv,.rl,.rr').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--green:#059669;--navy:#012169;--dark:#0A0F1E;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;} html{scroll-behavior:smooth;}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:var(--dark);overflow-x:hidden;} a{text-decoration:none;color:inherit;}
        .rv{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease;}
        .rl{opacity:0;transform:translateX(-35px);transition:opacity .7s ease,transform .7s ease;}
        .rr{opacity:0;transform:translateX(35px);transition:opacity .7s ease,transform .7s ease;}
        .rv.in,.rl.in,.rr.in{opacity:1;transform:none;}
        .d1{transition-delay:.1s!important;}.d2{transition-delay:.2s!important;}.d3{transition-delay:.3s!important;}.d4{transition-delay:.4s!important;}

        /* NAV */
        .nav{position:fixed;top:0;width:100%;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:1000;}
        .nw{max-width:1440px;margin:0 auto;padding:.35rem 2.5rem;display:flex;justify-content:space-between;align-items:center;}
        .logo-box{display:flex;align-items:center;gap:.65rem;}
        .logo-ic{width:42px;height:42px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.25rem;font-family:'Archivo',sans-serif;animation:logoPop .8s cubic-bezier(.34,1.56,.64,1) both;}
        @keyframes logoPop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
        .logo-nm{font-family:'Archivo',sans-serif;font-size:1.2rem;font-weight:900;color:#0A0F1E;}
        .logo-nm span{color:#3B82F6;}
        .nl{display:flex;gap:2.5rem;list-style:none;}
        .nl a{font-weight:500;font-size:.95rem;color:#0A0F1E;transition:color .25s;position:relative;padding-bottom:2px;}
        .nl a::after{content:'';position:absolute;bottom:-3px;left:0;width:0;height:2px;background:var(--blue);transition:width .3s;}
        .nl a:hover{color:var(--blue);} .nl a:hover::after{width:100%;}
        .nb{display:flex;gap:.8rem;}
        .btn{display:inline-block;padding:.7rem 1.6rem;border-radius:9px;font-weight:600;font-size:.93rem;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;transition:all .25s;}
        .btn-ghost{background:transparent;color:#0A0F1E;border:1.5px solid var(--border);}
        .btn-ghost:hover{background:var(--bg2);border-color:var(--blue);}
        .btn-blue{background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;box-shadow:0 4px 14px rgba(59,130,246,.28);}
        .btn-blue:hover{transform:translateY(-2px);}
        .btn-lg{padding:.95rem 2.2rem;font-size:1.03rem;border-radius:11px;}

        /* HERO */
        .hero{margin-top:86px;background:linear-gradient(145deg,#EFF6FF 0%,#F0FDF4 50%,#EFF6FF 100%);padding:5.5rem 2.5rem 4.5rem;text-align:center;position:relative;overflow:hidden;}
        .hero-blob1,.hero-blob2{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;animation:blobF 9s ease-in-out infinite;}
        .hero-blob1{width:500px;height:500px;background:radial-gradient(circle,rgba(59,130,246,.12),transparent 70%);top:-100px;right:-100px;}
        .hero-blob2{width:450px;height:450px;background:radial-gradient(circle,rgba(16,185,129,.1),transparent 70%);bottom:-100px;left:-80px;animation-delay:4s;}
        @keyframes blobF{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
        .hero h1{font-family:'Archivo',sans-serif;font-size:3.4rem;font-weight:900;margin-bottom:1.2rem;line-height:1.1;position:relative;z-index:1;}
        .hero h1 em{font-style:normal;background:linear-gradient(135deg,#3B82F6,#1D4ED8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero p{font-size:1.18rem;color:var(--muted);max-width:680px;margin:0 auto;line-height:1.85;position:relative;z-index:1;}

        /* SECTIONS */
        .sec{padding:5.5rem 2.5rem;}
        .sec-alt{background:var(--bg2);}
        .w{max-width:1200px;margin:0 auto;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;}
        .sh2{font-family:'Archivo',sans-serif;font-size:2.5rem;font-weight:800;margin-bottom:1rem;line-height:1.18;}
        .stag{display:inline-block;padding:.4rem 1rem;background:linear-gradient(135deg,var(--blue),var(--blue-d));color:#fff;border-radius:50px;font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:1rem;}
        .p{color:var(--muted);line-height:1.85;font-size:1rem;margin-bottom:1rem;}

        /* Blue box */
        .blue-box{background:linear-gradient(145deg,#1E3A8A,#012169);border-radius:20px;padding:2.75rem;color:#fff;position:relative;overflow:hidden;}
        .blue-box::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:rgba(255,255,255,.04);border-radius:50%;}
        .blue-box h3{font-family:'Archivo',sans-serif;font-size:1.7rem;font-weight:800;margin-bottom:1rem;position:relative;z-index:1;}
        .blue-box p{opacity:.86;line-height:1.8;font-size:.98rem;position:relative;z-index:1;}

        /* 3-col grid */
        .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem;}
        .card{background:#fff;padding:2rem;border-radius:16px;border:1px solid var(--border);transition:all .35s;position:relative;overflow:hidden;}
        .card.acc{border-left:4px solid var(--blue);}
        .card.cen{text-align:center;}
        .card:hover{transform:translateY(-6px);box-shadow:0 18px 42px rgba(0,0,0,.09);border-color:var(--blue);}
        .card h3{font-family:'Archivo',sans-serif;font-size:1.08rem;font-weight:700;margin-bottom:.65rem;}
        .card p{color:var(--muted);font-size:.9rem;line-height:1.72;}
        .card-ic{font-size:2.3rem;margin-bottom:.9rem;animation:iconF 3s ease-in-out infinite;}
        .card:nth-child(2) .card-ic{animation-delay:.4s;}
        .card:nth-child(3) .card-ic{animation-delay:.8s;}
        @keyframes iconF{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

        /* Values dark */
        .dark-sec{padding:5.5rem 2.5rem;background:linear-gradient(145deg,#0A0F1E,#0F2952);position:relative;overflow:hidden;}
        .dark-sec::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;animation:gridShift 22s linear infinite;}
        @keyframes gridShift{from{transform:translate(0,0)}to{transform:translate(48px,48px)}}
        .dark-sec::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 50%,rgba(59,130,246,.12),transparent 50%),radial-gradient(circle at 80% 50%,rgba(52,211,153,.09),transparent 50%);pointer-events:none;}
        .dw{max-width:1200px;margin:0 auto;text-align:center;position:relative;z-index:1;}
        .dw h2{font-family:'Archivo',sans-serif;font-size:2.5rem;font-weight:800;color:#fff;margin-bottom:.75rem;}
        .dw .dsub{color:rgba(255,255,255,.65);margin-bottom:3rem;font-size:1rem;}
        .vg{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:left;}
        .v{padding:1.75rem;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:14px;transition:all .32s;}
        .v:hover{background:rgba(255,255,255,.12);transform:translateY(-4px);}
        .vic{font-size:1.8rem;margin-bottom:.8rem;}
        .v h3{color:#fff;font-weight:700;margin-bottom:.5rem;font-size:.98rem;}
        .v p{color:rgba(255,255,255,.6);font-size:.84rem;line-height:1.65;}

        /* Stats strip */
        .stats-strip{padding:3rem 2.5rem;background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
        .strip-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center;}
        .st{padding:1.4rem;border-radius:14px;border:1px solid var(--border);transition:all .3s;}
        .st:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(0,0,0,.07);border-color:var(--blue);}
        .stn{font-family:'Archivo',sans-serif;font-size:2.6rem;font-weight:900;background:linear-gradient(135deg,#3B82F6,#1D4ED8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:.35rem;}
        .stl{color:var(--muted);font-size:.85rem;font-weight:500;}

        /* CTA */
        .cta-sec{padding:5.5rem 2.5rem;background:linear-gradient(145deg,#EFF6FF,#ECFDF5);border-top:1px solid var(--border);}
        .ctaw{max-width:760px;margin:0 auto;text-align:center;}
        .ctaw h2{font-family:'Archivo',sans-serif;font-size:2.8rem;font-weight:900;color:var(--dark);margin-bottom:1rem;line-height:1.18;}
        .ctaw p{font-size:1.12rem;color:var(--muted);margin-bottom:2.25rem;}
        .ctab{display:flex;gap:1.1rem;justify-content:center;}
        footer{background:#0A0F1E;color:rgba(255,255,255,.4);padding:1.75rem 2.5rem;text-align:center;font-size:.83rem;}
        @media(max-width:960px){.two,.g3,.vg{grid-template-columns:1fr;}.nl{display:none;}.hero h1{font-size:2.5rem;}.strip-inner{grid-template-columns:1fr 1fr;}.ctab{flex-direction:column;align-items:center;}}
      `}</style>

      <nav className="nav">
        <div className="nw">
          <Link href="/" className="logo-box"><div className="logo-ic">S</div><div className="logo-nm">Sponsor<span>Path</span></div></Link>
          <ul className="nl">
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#how-it-works">How It Works</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
          <div className="nb">
            <Link href="/signin" className="btn btn-ghost">Sign In</Link>
            <Link href="/get-started" className="btn btn-blue">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-blob1"/><div className="hero-blob2"/>
        <h1>We Built the Tool<br/><em>We Wished We Had</em></h1>
        <p>SponsorPath was born from watching talented international professionals struggle in the UK job market — not from lack of skill, but because the system was stacked against them.</p>
      </section>

      <section className="sec">
        <div className="w two">
          <div className="rl">
            <span className="stag">Our Mission</span>
            <h2 className="sh2">Level the playing field for every UK visa candidate.</h2>
            <p className="p">The UK job market is deeply complex for international candidates. Between decoding visa requirements, finding sponsors, tailoring resumes, and applying to hundreds of roles — it becomes a full-time job just to find a job.</p>
            <p className="p">We built SponsorPath to change that. The SponsorPath Engine automates the entire process so talented professionals can focus on what truly matters: preparing for interviews and building their career.</p>
            <p className="p"><strong>Our promise:</strong> Quality over quantity. Every application accurate, every resume tailored, every submission intentional. Zero fake skills. Zero spam. Zero wasted effort.</p>
          </div>
          <div className="rr">
            <div className="blue-box">
              <h3>🇬🇧 Purpose-Built for the UK</h3>
              <p>Specifically designed for UK visa sponsorship, post-study work routes, and the Skilled Worker pathway. We understand Home Office rules and the sponsor register so you don&apos;t have to.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="strip-inner">
          {[{n:'30K+',l:'Licensed UK Sponsors'},{n:'30%',l:'Response Rate'},{n:'5x',l:'Faster Than Manual'},{n:'0',l:'Fake Skills Added'}].map((s,i)=>(
            <div key={s.l} className={`st rv d${i+1}`}><div className="stn">{s.n}</div><div className="stl">{s.l}</div></div>
          ))}
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="w">
          <h2 className="sh2 rv" style={{textAlign:'center',marginBottom:'2.5rem'}}>The Problem We&apos;re Solving</h2>
          <div className="g3">
            {[{t:'Sponsorship Confusion',d:"Finding which companies hold UK sponsor licences is unreliable. Most candidates apply blindly, wasting time on roles that can't legally hire them."},{t:'Generic CVs Get Rejected',d:'Sending the same resume gives less than 5% response rates. ATS systems filter unoptimised CVs before a human ever reads them.'},{t:'Application Fatigue',d:'Manually applying to dozens of jobs daily is exhausting and demoralising. Talented candidates burn out before they find their opportunity.'}].map((c,i)=>(
              <div key={c.t} className={`card acc rv d${i+1}`}><h3>{c.t}</h3><p>{c.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="w">
          <h2 className="sh2 rv" style={{textAlign:'center',marginBottom:'2.5rem'}}>How SponsorPath Fixes This</h2>
          <div className="g3">
            {[{i:'🗄️',t:'Live Sponsor Database',d:'30,000+ UK licensed sponsors tracked weekly from official government sources. Every application goes to a verified sponsor only.'},{i:'⚙️',t:'SponsorPath Engine',d:'Tailors your resume to every single job description — rewriting summaries, reordering skills, matching keywords. Completely unique every time.'},{i:'🚀',t:'Full Automation',d:'From job discovery to submission, the SponsorPath Engine runs 24/7. You focus on interviews — not the grind.'}].map((c,i)=>(
              <div key={c.t} className={`card cen rv d${i+1}`}><div className="card-ic">{c.i}</div><h3>{c.t}</h3><p>{c.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="dark-sec">
        <div className="dw">
          <h2 className="rv">Our Values</h2>
          <p className="dsub rv">Everything we build is guided by these principles.</p>
          <div className="vg">
            {[{i:'🎯',t:'Truth First',d:'We never add fake skills or fabricate experience. Your application is always a truthful representation of who you are.'},{i:'🛡️',t:'Protect Candidates',d:"We'd rather reject a poor application than submit one that damages your professional reputation."},{i:'🇬🇧',t:'UK-Focused',d:'Every feature built with UK visa rules, sponsor requirements, and employment law in mind. Specialists, not generalists.'},{i:'⚡',t:'Always Improving',d:'The SponsorPath Engine learns from outcomes — better matches, better CVs, better results every single week.'}].map((v,i)=>(
              <div key={v.t} className={`v rv d${i+1}`}><div className="vic">{v.i}</div><h3>{v.t}</h3><p>{v.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-sec">
        <div className="ctaw rv">
          <h2>Ready to Land Your UK Job?</h2>
          <p>Let the SponsorPath Engine do the hard work while you prepare for interviews.</p>
          <div className="ctab">
            <Link href="/get-started" className="btn btn-blue btn-lg">Start Free Trial</Link>
            <Link href="/pricing" className="btn btn-ghost btn-lg">View Pricing</Link>
          </div>
        </div>
      </section>
      <footer><p>© 2026 SponsorPath. Not immigration advice.</p></footer>
    </>
  )
}