// ════════════════════════════════════════════════════════
// FILE PATH: src/app/pricing/page.tsx  →  localhost:3000/pricing
// ════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

  const plans = [
    {
      name:'Starter', desc:'Perfect for testing the SponsorPath Engine.', monthly:0, annual:0, cta:'Get Started Free', ctaClass:'ghost', popular:false,
      features:[{ok:true,t:'5 applications per month'},{ok:true,t:'Basic CV tailoring'},{ok:true,t:'UK sponsor licence check'},{ok:true,t:'Job match scoring'},{ok:true,t:'Application dashboard'},{ok:false,t:'Auto-submit applications'},{ok:false,t:'Company career pages'},{ok:false,t:'Priority support'}]
    },
    {
      name:'Pro', desc:'Full SponsorPath Engine access for serious job seekers.', monthly:29, annual:23, cta:'Start Free 14-Day Trial', ctaClass:'blue', popular:true,
      features:[{ok:true,t:'50 applications per month'},{ok:true,t:'Advanced CV tailoring per JD'},{ok:true,t:'UK sponsor licence check'},{ok:true,t:'Smart match scoring'},{ok:true,t:'Full application dashboard'},{ok:true,t:'Auto-submit to job boards'},{ok:true,t:'Company career pages'},{ok:true,t:'Email support'}]
    },
    {
      name:'Premium', desc:'Maximum applications, priority engine, dedicated support.', monthly:59, annual:47, cta:'Start Free 14-Day Trial', ctaClass:'blue', popular:false,
      features:[{ok:true,t:'Unlimited applications'},{ok:true,t:'Priority CV tailoring engine'},{ok:true,t:'UK sponsor licence check'},{ok:true,t:'Advanced scoring + insights'},{ok:true,t:'Full dashboard + analytics'},{ok:true,t:'Auto-submit all platforms'},{ok:true,t:'30,000+ company pages'},{ok:true,t:'Priority 24/7 support'}]
    }
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--green:#059669;--navy:#012169;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;} html{scroll-behavior:smooth;}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#0A0F1E;} a{text-decoration:none;color:inherit;}
        .nav{position:fixed;top:0;width:100%;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:1000;}
        .nw{max-width:1440px;margin:0 auto;padding:.35rem 2.5rem;display:flex;justify-content:space-between;align-items:center;}
        .logo-link{display:flex;align-items:center;gap:.6rem;}
        .logo-icon{width:40px;height:40px;background:linear-gradient(135deg,#3B82F6,#34D399);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1.2rem;font-family:'Archivo',sans-serif;}
        .logo-name{font-family:'Archivo',sans-serif;font-size:1.2rem;font-weight:900;color:#0A0F1E;}
        .logo-name span{color:#3B82F6;}
        /* Also try real image, show icon as fallback */
        .logo-img{height:80px!important;width:auto!important;display:block;}
        .nl{display:flex;gap:2.5rem;list-style:none;}
        .nl a{font-weight:500;font-size:.95rem;color:#0A0F1E;transition:color .25s;}
        .nl a:hover{color:var(--blue);}
        .nb{display:flex;gap:.8rem;}
        .btn{display:inline-block;padding:.72rem 1.65rem;border-radius:9px;font-weight:600;font-size:.95rem;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;transition:all .25s;}
        .btn-ghost{background:transparent;color:#0A0F1E;border:1.5px solid var(--border);}
        .btn-ghost:hover{background:var(--bg2);border-color:var(--blue);}
        .btn-blue{background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;box-shadow:0 4px 14px rgba(59,130,246,.28);}
        .btn-blue:hover{transform:translateY(-2px);}
        .btn-lg{padding:1rem 2.25rem;font-size:1.05rem;border-radius:11px;}

        .hero{margin-top:86px;background:linear-gradient(145deg,#EFF6FF 0%,#ECFDF5 50%,#EFF6FF 100%);padding:4.5rem 2.5rem 3.5rem;text-align:center;}
        .hero h1{font-family:'Archivo',sans-serif;font-size:3.1rem;font-weight:900;margin-bottom:1rem;line-height:1.12;}
        .hero h1 em{font-style:normal;background:linear-gradient(135deg,#3B82F6,#1D4ED8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero p{font-size:1.1rem;color:var(--muted);max-width:560px;margin:0 auto 2rem;line-height:1.8;}

        /* TOGGLE */
        .toggle-wrap{display:flex;align-items:center;justify-content:center;gap:1rem;margin-bottom:0;}
        .toggle-lbl{font-weight:600;font-size:.95rem;}
        .toggle-track{width:52px;height:28px;background:var(--border);border-radius:50px;cursor:pointer;position:relative;transition:background .3s;}
        .toggle-track.on{background:var(--blue);}
        .toggle-thumb{position:absolute;top:3px;left:3px;width:22px;height:22px;background:#fff;border-radius:50%;transition:transform .3s;box-shadow:0 2px 6px rgba(0,0,0,.15);}
        .toggle-track.on .toggle-thumb{transform:translateX(24px);}
        .save-badge{padding:.25rem .7rem;background:rgba(5,150,105,.12);color:var(--green);border-radius:50px;font-size:.78rem;font-weight:700;}

        /* PLANS */
        .plans-wrap{max-width:1200px;margin:0 auto;padding:3.5rem 2.5rem 5rem;}
        .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;align-items:start;}
        .plan{background:#fff;border:1.5px solid var(--border);border-radius:20px;padding:2.25rem;position:relative;transition:all .3s;}
        .plan:hover{box-shadow:0 20px 50px rgba(0,0,0,.1);}
        .plan.pop{border-color:var(--blue);box-shadow:0 20px 50px rgba(59,130,246,.14);}
        .pop-tag{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;padding:.35rem 1.2rem;border-radius:50px;font-size:.78rem;font-weight:700;white-space:nowrap;}
        .plan-name{font-family:'Archivo',sans-serif;font-size:1.3rem;font-weight:700;margin-bottom:.45rem;}
        .plan-desc{color:var(--muted);font-size:.88rem;margin-bottom:1.5rem;line-height:1.6;}
        .plan-price{margin-bottom:1.75rem;}
        .p-amount{font-family:'Archivo',sans-serif;font-size:3rem;font-weight:900;color:#0A0F1E;line-height:1;}
        .p-period{color:var(--muted);font-size:.9rem;margin-left:.3rem;}
        .p-save{display:inline-block;margin-top:.4rem;padding:.25rem .72rem;background:rgba(5,150,105,.1);color:var(--green);border-radius:50px;font-size:.76rem;font-weight:700;}
        .plan hr{border:none;border-top:1px solid var(--border);margin:1.75rem 0;}
        .feat-list{list-style:none;margin-bottom:1.75rem;}
        .feat-list li{display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.8rem;font-size:.9rem;line-height:1.5;}
        .ck{color:var(--green);flex-shrink:0;margin-top:.1rem;} .cx{color:#94A3B8;flex-shrink:0;margin-top:.1rem;}
        .feat-list li.dim{color:var(--muted);}
        .plan-btn{width:100%;padding:.9rem;border:none;border-radius:9px;font-size:.95rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;}
        .plan-btn.ghost{background:transparent;color:#0A0F1E;border:1.5px solid var(--border);}
        .plan-btn.ghost:hover{background:var(--bg2);border-color:var(--blue);}
        .plan-btn.blue{background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;box-shadow:0 4px 14px rgba(59,130,246,.28);}
        .plan-btn.blue:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(59,130,246,.36);}

        /* FAQ */
        .faq{max-width:800px;margin:0 auto;padding:0 2.5rem 5rem;}
        .faq h2{font-family:'Archivo',sans-serif;font-size:2.1rem;font-weight:800;text-align:center;margin-bottom:2.5rem;}
        .qa{border-bottom:1px solid var(--border);padding:1.4rem 0;}
        .qa h3{font-family:'Archivo',sans-serif;font-size:1.02rem;font-weight:700;margin-bottom:.6rem;}
        .qa p{color:var(--muted);font-size:.9rem;line-height:1.75;}

        .cta-sec{padding:5rem 2.5rem;background:linear-gradient(135deg,#0A0F1E,#0F2952);text-align:center;}
        .cta-sec h2{font-family:'Archivo',sans-serif;font-size:2.4rem;font-weight:900;color:#fff;margin-bottom:1rem;}
        .cta-sec p{color:rgba(255,255,255,.72);font-size:1.1rem;margin-bottom:2rem;}
        .ctab{display:flex;gap:1.1rem;justify-content:center;}
        .btn-wh{background:#fff;color:#0A0F1E;} .btn-wh:hover{background:var(--bg2);}
        .btn-ow{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.3);} .btn-ow:hover{border-color:#fff;}
        footer{background:#0A0F1E;color:rgba(255,255,255,.45);padding:1.75rem 2.5rem;text-align:center;font-size:.84rem;}
        @media(max-width:900px){.plans{grid-template-columns:1fr;}.nl{display:none;}.hero h1{font-size:2.2rem;}.ctab{flex-direction:column;align-items:center;}}
      `}</style>

      <nav className="nav">
        <div className="nw">
          <Link href="/" className="logo-link">
            <div className="logo-icon">S</div>
            <div className="logo-name">Sponsor<span>Path</span></div>
          </Link>
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
        <h1>Simple, <em>Honest Pricing</em></h1>
        <p>Start free. Upgrade when you&apos;re ready. Cancel anytime. No hidden fees.</p>
        <div className="toggle-wrap">
          <span className="toggle-lbl" style={{color:annual?'var(--muted)':'#0A0F1E'}}>Monthly</span>
          <div className={`toggle-track${annual?' on':''}`} onClick={()=>setAnnual(!annual)}>
            <div className="toggle-thumb"/>
          </div>
          <span className="toggle-lbl" style={{color:annual?'#0A0F1E':'var(--muted)'}}>Annual</span>
          <span className="save-badge">Save 20%</span>
        </div>
      </section>

      <div className="plans-wrap">
        <div className="plans">
          {plans.map(plan=>(
            <div key={plan.name} className={`plan${plan.popular?' pop':''}`}>
              {plan.popular&&<div className="pop-tag">⭐ Most Popular</div>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-desc">{plan.desc}</div>
              <div className="plan-price">
                {plan.monthly===0 ? (
                  <span className="p-amount">Free</span>
                ) : (
                  <>
                    <span className="p-amount">£{annual?plan.annual:plan.monthly}</span>
                    <span className="p-period">/month</span>
                    {annual&&<div className="p-save">Save £{(plan.monthly-plan.annual)*12}/yr on annual</div>}
                  </>
                )}
              </div>
              <Link href="/get-started">
                <button className={`plan-btn ${plan.ctaClass}`}>{plan.cta}</button>
              </Link>
              <hr/>
              <ul className="feat-list">
                {plan.features.map(f=>(
                  <li key={f.t} className={!f.ok?'dim':''}>
                    <span className={f.ok?'ck':'cx'}>{f.ok?'✓':'✗'}</span>{f.t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <section className="faq">
        <h2>Frequently Asked Questions</h2>
        {[
          {q:'Do I need a credit card to start?',a:"No. The Starter plan is completely free with no card required. For Pro and Premium trials, we ask for payment details but won't charge until day 15."},
          {q:'Can I cancel anytime?',a:'Yes, absolutely. Cancel from your dashboard at any time. No questions asked, no cancellation fees.'},
          {q:'What happens when I hit my application limit?',a:'The SponsorPath Engine will pause and notify you. You can upgrade or wait for the next billing cycle — your data is always safe.'},
          {q:'Is my visa status kept confidential?',a:'Yes. Your visa information is used only to filter job searches and is never shared with employers or third parties.'},
          {q:'What job boards does SponsorPath search?',a:'LinkedIn, Indeed, Reed, CWJobs, Totaljobs, plus 30,000+ company career pages directly. Premium users get full access to all sources.'},
        ].map(f=><div key={f.q} className="qa"><h3>{f.q}</h3><p>{f.a}</p></div>)}
      </section>

      <section className="cta-sec">
        <h2>Start For Free Today</h2>
        <p>No credit card required. Full engine access on your free trial.</p>
        <div className="ctab">
          <Link href="/get-started" className="btn btn-wh btn-lg">Get Started Free</Link>
          <Link href="/about" className="btn btn-ow btn-lg">Learn More</Link>
        </div>
      </section>
      <footer><p>© 2026 SponsorPath. Not immigration advice.</p></footer>
    </>
  )
}