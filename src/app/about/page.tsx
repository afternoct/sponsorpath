import Image from 'next/image'
import Link from 'next/link'

export default function About() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;700&display=swap');
        :root{--blue:#3B82F6;--navy:#012169;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#0F172A;}
        a{text-decoration:none;color:inherit;}
        .nav{position:fixed;top:0;width:100%;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:1000;}
        .nav-wrap{max-width:1440px;margin:0 auto;padding:.3rem 2.5rem;display:flex;justify-content:space-between;align-items:center;}
        .nav-wrap img{height:80px!important;width:auto!important;display:block;}
        .nav-links{display:flex;gap:2.5rem;list-style:none;}
        .nav-links a{font-weight:500;font-size:.95rem;transition:color .25s;}
        .nav-links a:hover{color:var(--blue);}
        .nav-btns{display:flex;gap:.8rem;}
        .btn{display:inline-block;padding:.72rem 1.6rem;border-radius:8px;font-weight:600;font-size:.95rem;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;transition:all .25s;}
        .btn-ghost{background:transparent;color:#0F172A;border:1.5px solid var(--border);}
        .btn-ghost:hover{background:var(--bg2);border-color:var(--blue);}
        .btn-blue{background:var(--blue);color:#fff;}
        .btn-blue:hover{transform:translateY(-2px);}
        .btn-lg{padding:1rem 2.2rem;font-size:1.05rem;border-radius:10px;}

        .hero{margin-top:86px;background:linear-gradient(140deg,#EFF6FF 0%,#ECFDF5 100%);padding:5rem 2.5rem;text-align:center;}
        .hero h1{font-family:'Archivo',sans-serif;font-size:3.4rem;font-weight:900;margin-bottom:1.25rem;line-height:1.1;}
        .hero h1 em{font-style:normal;background:linear-gradient(135deg,#3B82F6,#012169);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero p{font-size:1.2rem;color:var(--muted);max-width:680px;margin:0 auto;line-height:1.8;}

        .sec{padding:5.5rem 2.5rem;}
        .sec-alt{background:var(--bg2);}
        .wrap{max-width:1200px;margin:0 auto;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;}
        .h2{font-family:'Archivo',sans-serif;font-size:2.4rem;font-weight:800;margin-bottom:1.1rem;}
        .p{color:var(--muted);line-height:1.85;font-size:1.02rem;margin-bottom:1.1rem;}
        .blue-box{background:linear-gradient(135deg,#1D4ED8,#012169);border-radius:20px;padding:2.75rem;color:#fff;}
        .blue-box h3{font-family:'Archivo',sans-serif;font-size:1.65rem;font-weight:800;margin-bottom:1rem;}
        .blue-box p{opacity:.88;line-height:1.75;}
        .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem;}
        .card{background:#fff;padding:2rem;border-radius:16px;border:1px solid var(--border);}
        .card.acc{border-left:4px solid var(--blue);}
        .card.center{text-align:center;}
        .card h3{font-family:'Archivo',sans-serif;font-size:1.1rem;font-weight:700;margin-bottom:.7rem;}
        .card p{color:var(--muted);font-size:.92rem;line-height:1.72;}
        .card-ic{font-size:2.2rem;margin-bottom:.9rem;}
        .cht{text-align:center;margin-bottom:2.5rem;}
        .dark{padding:5.5rem 2.5rem;background:linear-gradient(135deg,#0F172A,#0F2952);}
        .dark-wrap{max-width:1200px;margin:0 auto;text-align:center;}
        .dark-wrap h2{font-family:'Archivo',sans-serif;font-size:2.4rem;font-weight:800;color:#fff;margin-bottom:.75rem;}
        .dark-wrap .sub{color:rgba(255,255,255,.7);margin-bottom:3rem;}
        .vg{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:left;}
        .v{padding:1.75rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:14px;}
        .v .ic{font-size:1.7rem;margin-bottom:.8rem;}
        .v h3{color:#fff;font-weight:700;margin-bottom:.5rem;font-size:.98rem;}
        .v p{color:rgba(255,255,255,.62);font-size:.86rem;line-height:1.65;}
        .cta-sec{padding:5.5rem 2.5rem;background:var(--bg2);text-align:center;border-top:1px solid var(--border);}
        .cta-sec h2{font-family:'Archivo',sans-serif;font-size:2.6rem;font-weight:900;margin-bottom:1rem;}
        .cta-sec p{font-size:1.15rem;color:var(--muted);margin-bottom:2.25rem;}
        .cta-btns{display:flex;gap:1.1rem;justify-content:center;}
        footer{background:#0F172A;color:rgba(255,255,255,.5);padding:1.75rem 2.5rem;text-align:center;font-size:.86rem;}
        @media(max-width:900px){.two,.g3,.vg{grid-template-columns:1fr;}.nav-links{display:none;}.hero h1{font-size:2.4rem;}.cta-btns{flex-direction:column;align-items:center;}}
      `}</style>

      <nav className="nav">
        <div className="nav-wrap">
          <Link href="/"><Image src="/logo.png" alt="SponsorPath" width={280} height={80} priority/></Link>
          <ul className="nav-links">
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#how-it-works">How It Works</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
          <div className="nav-btns">
            <Link href="/signin" className="btn btn-ghost">Sign In</Link>
            <Link href="/get-started" className="btn btn-blue">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <h1>We Built the Tool<br/><em>We Wished We Had</em></h1>
        <p>SponsorPath was born from watching talented international professionals struggle in the UK job market — not from lack of skill, but because the system was stacked against them.</p>
      </section>

      <section className="sec">
        <div className="wrap two">
          <div>
            <h2 className="h2">Our Mission</h2>
            <p className="p">The UK job market is deeply complex for international candidates. Between decoding visa requirements, identifying licensed sponsors, tailoring resumes, and applying to hundreds of roles — it becomes a full-time job just to find a job.</p>
            <p className="p">We built SponsorPath to level the playing field. The SponsorPath Engine automates the entire process so talented professionals can focus on preparing for interviews and building their UK career.</p>
            <p className="p"><strong>Our promise:</strong> Quality over quantity. Every application is accurate, every resume is tailored, every submission intentional. Zero fake skills. Zero spam. Zero wasted effort.</p>
          </div>
          <div className="blue-box">
            <h3>🇬🇧 Purpose-Built for the UK</h3>
            <p>Specifically designed for the complexities of UK visa sponsorship, post-study work routes, and the Skilled Worker visa pathway. We understand the Home Office rules and sponsor register so you don't have to.</p>
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <h2 className="h2 cht">The Problem We're Solving</h2>
          <div className="g3">
            {[
              {t:'Sponsorship Confusion',d:"Finding which companies hold UK sponsor licences is unreliable and time-consuming. Most candidates apply blindly, wasting time on roles that can't legally hire them."},
              {t:'Generic CVs Get Rejected',d:'Sending the same resume to every job gives less than 5% response rates. ATS systems filter unoptimised CVs before a human ever sees them.'},
              {t:'Application Fatigue',d:'Manually applying to dozens of jobs daily is exhausting and unsustainable. Talented candidates burn out before they find their opportunity.'},
            ].map(c=><div key={c.t} className="card acc"><h3>{c.t}</h3><p>{c.d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <h2 className="h2 cht">How SponsorPath Fixes This</h2>
          <div className="g3">
            {[
              {ic:'🗄️',t:'Live Sponsor Database',d:'30,000+ UK licensed sponsors tracked and updated weekly from official government sources. Every application goes to a verified sponsor.'},
              {ic:'⚙️',t:'SponsorPath Engine',d:'Tailors your resume to every single job description — rewriting summaries, reordering skills, matching keywords. Every CV is completely unique.'},
              {ic:'🚀',t:'Full Automation',d:'From job discovery to submission, the SponsorPath Engine runs 24/7 so you can focus on interviews, not job hunting.'},
            ].map(c=><div key={c.t} className="card center"><div className="card-ic">{c.ic}</div><h3>{c.t}</h3><p>{c.d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="dark-wrap">
          <h2>Our Values</h2>
          <p className="sub">Everything we build is guided by these principles.</p>
          <div className="vg">
            {[
              {i:'🎯',t:'Truth First',d:'We never add fake skills or fabricate experience. Your application is always a truthful, accurate representation of who you are.'},
              {i:'🛡️',t:'Protect Candidates',d:"We'd rather reject a bad application than submit one that damages your reputation. Quality gates exist to protect you."},
              {i:'🇬🇧',t:'UK-Focused',d:'Every feature is built with UK visa rules, sponsor requirements, and employment law in mind. Specialists, not generalists.'},
              {i:'⚡',t:'Always Improving',d:'The SponsorPath Engine learns from outcomes. Better matches, better CVs, better results — every week.'},
            ].map(v=><div key={v.t} className="v"><div className="ic">{v.i}</div><h3>{v.t}</h3><p>{v.d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="cta-sec">
        <h2>Ready to Land Your UK Job?</h2>
        <p>Let the SponsorPath Engine do the hard work while you prepare for interviews.</p>
        <div className="cta-btns">
          <Link href="/get-started" className="btn btn-blue btn-lg">Start Free Trial</Link>
          <Link href="/pricing" className="btn btn-ghost btn-lg">View Pricing</Link>
        </div>
      </section>
      <footer><p>&copy; 2026 SponsorPath. Not immigration advice.</p></footer>
    </>
  )
}