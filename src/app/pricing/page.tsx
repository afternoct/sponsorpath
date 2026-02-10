import Image from 'next/image'
import Link from 'next/link'

export default function Pricing() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;700&display=swap');
        :root{--blue:#3B82F6;--navy:#012169;--green:#059669;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
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
        .btn-w{width:100%;text-align:center;}

        .hero{margin-top:86px;background:linear-gradient(140deg,#EFF6FF 0%,#ECFDF5 100%);padding:4.5rem 2.5rem 3.5rem;text-align:center;}
        .hero h1{font-family:'Archivo',sans-serif;font-size:3.2rem;font-weight:900;margin-bottom:1.1rem;}
        .hero h1 em{font-style:normal;background:linear-gradient(135deg,#3B82F6,#012169);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero p{font-size:1.15rem;color:var(--muted);max-width:580px;margin:0 auto 2rem;}
        .toggle{display:inline-flex;background:var(--bg2);border:1px solid var(--border);border-radius:50px;padding:.3rem;}
        .toggle span{padding:.5rem 1.5rem;border-radius:50px;font-size:.9rem;font-weight:600;cursor:pointer;}
        .toggle span.active{background:var(--blue);color:#fff;}
        .toggle span:not(.active){color:var(--muted);}

        .pricing-wrap{max-width:1200px;margin:0 auto;padding:4rem 2.5rem 6rem;}
        .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;align-items:start;}
        .plan{background:#fff;border:1.5px solid var(--border);border-radius:20px;padding:2.25rem;position:relative;transition:all .3s;}
        .plan:hover{box-shadow:0 20px 50px rgba(0,0,0,.1);}
        .plan.popular{border-color:var(--blue);box-shadow:0 20px 50px rgba(59,130,246,.15);}
        .pop-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--blue);color:#fff;padding:.35rem 1.2rem;border-radius:50px;font-size:.78rem;font-weight:700;white-space:nowrap;}
        .plan-name{font-family:'Archivo',sans-serif;font-size:1.3rem;font-weight:700;margin-bottom:.5rem;}
        .plan-desc{color:var(--muted);font-size:.9rem;margin-bottom:1.5rem;line-height:1.6;}
        .plan-price{margin-bottom:1.75rem;}
        .plan-price .amount{font-family:'Archivo',sans-serif;font-size:3rem;font-weight:900;color:#0F172A;line-height:1;}
        .plan-price .period{color:var(--muted);font-size:.9rem;margin-left:.3rem;}
        .plan-price .save{display:inline-block;margin-top:.4rem;padding:.25rem .75rem;background:rgba(5,150,105,.12);color:var(--green);border-radius:50px;font-size:.78rem;font-weight:700;}
        .divider{border:none;border-top:1px solid var(--border);margin:1.75rem 0;}
        .features-list{list-style:none;margin-bottom:2rem;}
        .features-list li{display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.85rem;font-size:.92rem;line-height:1.5;}
        .features-list li .check{color:var(--green);font-size:1rem;flex-shrink:0;margin-top:.1rem;}
        .features-list li .cross{color:#94A3B8;font-size:1rem;flex-shrink:0;margin-top:.1rem;}
        .features-list li.muted{color:var(--muted);}

        .faq{max-width:800px;margin:0 auto;padding:0 2.5rem 5rem;}
        .faq h2{font-family:'Archivo',sans-serif;font-size:2.2rem;font-weight:800;text-align:center;margin-bottom:2.5rem;}
        .qa{border-bottom:1px solid var(--border);padding:1.5rem 0;}
        .qa h3{font-family:'Archivo',sans-serif;font-size:1.05rem;font-weight:700;margin-bottom:.65rem;}
        .qa p{color:var(--muted);font-size:.93rem;line-height:1.75;}

        .cta-sec{padding:5rem 2.5rem;background:linear-gradient(135deg,#0F172A,#0F2952);text-align:center;}
        .cta-sec h2{font-family:'Archivo',sans-serif;font-size:2.4rem;font-weight:900;color:#fff;margin-bottom:1rem;}
        .cta-sec p{color:rgba(255,255,255,.75);font-size:1.1rem;margin-bottom:2rem;}
        .cta-btns{display:flex;gap:1.1rem;justify-content:center;}
        .btn-white{background:#fff;color:#0F172A;}
        .btn-white:hover{background:var(--bg2);}
        .btn-outline-w{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.3);}
        .btn-outline-w:hover{border-color:#fff;background:rgba(255,255,255,.08);}

        footer{background:#0F172A;color:rgba(255,255,255,.5);padding:1.75rem 2.5rem;text-align:center;font-size:.86rem;}
        @media(max-width:900px){.plans{grid-template-columns:1fr;}.nav-links{display:none;}.hero h1{font-size:2.2rem;}.cta-btns{flex-direction:column;align-items:center;}}
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
        <h1>Simple, <em>Honest Pricing</em></h1>
        <p>Start free. Upgrade when you're ready. Cancel anytime. No hidden fees.</p>
        <div className="toggle">
          <span className="active">Monthly</span>
          <span>Annual <span style={{color:'#059669',fontSize:'.78rem',fontWeight:700}}> Save 20%</span></span>
        </div>
      </section>

      <div className="pricing-wrap">
        <div className="plans">
          {/* Starter */}
          <div className="plan">
            <div className="plan-name">Starter</div>
            <div className="plan-desc">Perfect for getting started and testing the SponsorPath Engine.</div>
            <div className="plan-price">
              <span className="amount">Free</span>
            </div>
            <Link href="/get-started" className="btn btn-ghost btn-w">Get Started Free</Link>
            <hr className="divider"/>
            <ul className="features-list">
              {[
                {t:'5 applications per month',ok:true},
                {t:'Basic CV tailoring',ok:true},
                {t:'UK sponsor licence check',ok:true},
                {t:'Job match scoring',ok:true},
                {t:'Application dashboard',ok:true},
                {t:'Auto-submit applications',ok:false},
                {t:'Company career page search',ok:false},
                {t:'Priority support',ok:false},
              ].map(f=>(
                <li key={f.t} className={!f.ok?'muted':''}>
                  <span className={f.ok?'check':'cross'}>{f.ok?'✓':'✗'}</span>{f.t}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro — Popular */}
          <div className="plan popular">
            <div className="pop-badge">⭐ Most Popular</div>
            <div className="plan-name">Pro</div>
            <div className="plan-desc">Full SponsorPath Engine access. Designed for serious job seekers.</div>
            <div className="plan-price">
              <span className="amount">£29</span>
              <span className="period">/month</span>
              <div className="save">Save £70/yr on annual</div>
            </div>
            <Link href="/get-started" className="btn btn-blue btn-w">Start Free 14-Day Trial</Link>
            <hr className="divider"/>
            <ul className="features-list">
              {[
                {t:'50 applications per month',ok:true},
                {t:'Advanced CV tailoring per JD',ok:true},
                {t:'UK sponsor licence check',ok:true},
                {t:'Smart job match scoring',ok:true},
                {t:'Full application dashboard',ok:true},
                {t:'Auto-submit to job boards',ok:true},
                {t:'Company career page search',ok:true},
                {t:'Email support',ok:true},
              ].map(f=>(
                <li key={f.t}>
                  <span className="check">✓</span>{f.t}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="plan">
            <div className="plan-name">Premium</div>
            <div className="plan-desc">Maximum applications, priority engine, dedicated support.</div>
            <div className="plan-price">
              <span className="amount">£59</span>
              <span className="period">/month</span>
              <div className="save">Save £142/yr on annual</div>
            </div>
            <Link href="/get-started" className="btn btn-blue btn-w">Start Free 14-Day Trial</Link>
            <hr className="divider"/>
            <ul className="features-list">
              {[
                {t:'Unlimited applications',ok:true},
                {t:'Priority CV tailoring engine',ok:true},
                {t:'UK sponsor licence check',ok:true},
                {t:'Advanced match scoring + insights',ok:true},
                {t:'Full application dashboard + analytics',ok:true},
                {t:'Auto-submit to all platforms',ok:true},
                {t:'30,000+ company career pages',ok:true},
                {t:'Priority 24/7 support',ok:true},
              ].map(f=>(
                <li key={f.t}>
                  <span className="check">✓</span>{f.t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="faq">
        <h2>Frequently Asked Questions</h2>
        {[
          {q:'Do I need a credit card to start?',a:'No. The Starter plan is completely free with no card required. For Pro and Premium trials, we ask for payment details but won\'t charge until day 15.'},
          {q:'Can I cancel anytime?',a:'Yes, absolutely. Cancel from your dashboard at any time. No questions asked, no cancellation fees.'},
          {q:'What happens when I hit my application limit?',a:'The SponsorPath Engine will pause and notify you. You can upgrade your plan or wait for the next billing cycle — your data is always safe.'},
          {q:'Is my visa status kept confidential?',a:'Yes. Your visa information is used only to filter job searches and is never shared with employers or third parties.'},
          {q:'What job boards does SponsorPath search?',a:'LinkedIn, Indeed, Reed, CWJobs, Totaljobs, plus 30,000+ company career pages directly. Premium users get full access to all sources.'},
        ].map(f=>(
          <div key={f.q} className="qa"><h3>{f.q}</h3><p>{f.a}</p></div>
        ))}
      </section>

      <section className="cta-sec">
        <h2>Start For Free Today</h2>
        <p>No credit card required. Full engine access on your free trial.</p>
        <div className="cta-btns">
          <Link href="/get-started" className="btn btn-white btn-lg">Get Started Free</Link>
          <Link href="/about" className="btn btn-outline-w btn-lg">Learn More</Link>
        </div>
      </section>
      <footer><p>&copy; 2026 SponsorPath. Not immigration advice.</p></footer>
    </>
  )
}