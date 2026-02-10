'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    const particles: {x:number,y:number,vx:number,vy:number,r:number,o:number}[] = []
    for (let i = 0; i < 55; i++) particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35, r: Math.random()*2+.5, o: Math.random()*.4+.1 })
    let raf: number
    function draw() {
      ctx!.clearRect(0,0,canvas!.width,canvas!.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x<0) p.x=canvas!.width; if (p.x>canvas!.width) p.x=0
        if (p.y<0) p.y=canvas!.height; if (p.y>canvas!.height) p.y=0
        ctx!.beginPath(); ctx!.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx!.fillStyle = `rgba(96,165,250,${p.o})`; ctx!.fill()
      })
      particles.forEach((a,i) => particles.slice(i+1).forEach(b => {
        const d = Math.hypot(a.x-b.x,a.y-b.y)
        if (d<110) { ctx!.beginPath(); ctx!.moveTo(a.x,a.y); ctx!.lineTo(b.x,b.y); ctx!.strokeStyle=`rgba(96,165,250,${.1*(1-d/110)})`; ctx!.lineWidth=.5; ctx!.stroke() }
      }))
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }), { threshold: 0.12 })
    document.querySelectorAll('.rv,.rl,.rr').forEach(el => obs.observe(el))
    const nav = document.getElementById('navbar')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => { obs.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        :root{--blue:#3B82F6;--blue-d:#1D4ED8;--blue-l:#60A5FA;--green:#059669;--green-l:#34D399;--navy:#012169;--dark:#0A0F1E;--muted:#64748B;--border:#E2E8F0;--bg2:#F8FAFC;}
        *{margin:0;padding:0;box-sizing:border-box;} html{scroll-behavior:smooth;}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:var(--dark);overflow-x:hidden;} a{text-decoration:none;color:inherit;}
        /* reveals */
        .rv{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}
        .rl{opacity:0;transform:translateX(-36px);transition:opacity .7s ease,transform .7s ease;}
        .rr{opacity:0;transform:translateX(36px);transition:opacity .7s ease,transform .7s ease;}
        .rv.in,.rl.in,.rr.in{opacity:1;transform:none;}
        .d1{transition-delay:.1s!important;}.d2{transition-delay:.2s!important;}.d3{transition-delay:.3s!important;}.d4{transition-delay:.4s!important;}.d5{transition-delay:.5s!important;}
        /* NAV */
        .nav{position:fixed;top:0;width:100%;background:rgba(255,255,255,.96);backdrop-filter:blur(20px);border-bottom:1px solid transparent;z-index:1000;transition:all .3s;}
        .nav.scrolled{border-color:var(--border);box-shadow:0 2px 20px rgba(0,0,0,.07);}
        .nw{max-width:1440px;margin:0 auto;padding:.35rem 2.5rem;display:flex;justify-content:space-between;align-items:center;}
        /* LOGO — animated pulse on load */
        .logo-link{display:flex;align-items:center;}
        .logo-link img{height:82px!important;width:auto!important;display:block;animation:logoPop .8s cubic-bezier(.34,1.56,.64,1) both;}
        @keyframes logoPop{from{opacity:0;transform:scale(.7) rotate(-5deg)}to{opacity:1;transform:scale(1) rotate(0)}}
        .logo-link:hover img{animation:logoWiggle .5s ease;}
        @keyframes logoWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
        .nl{display:flex;gap:2.5rem;list-style:none;}
        .nl a{font-weight:500;font-size:.95rem;color:var(--dark);transition:color .25s;position:relative;padding-bottom:2px;}
        .nl a::after{content:'';position:absolute;bottom:-3px;left:0;width:0;height:2px;background:var(--blue);transition:width .3s;}
        .nl a:hover{color:var(--blue);} .nl a:hover::after{width:100%;}
        .nb{display:flex;gap:.8rem;align-items:center;}
        /* BUTTONS */
        .btn{display:inline-block;padding:.72rem 1.65rem;border-radius:9px;font-weight:600;font-size:.95rem;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;transition:all .25s;position:relative;overflow:hidden;}
        .btn-ghost{background:transparent;color:var(--dark);border:1.5px solid var(--border);}
        .btn-ghost:hover{background:var(--bg2);border-color:var(--blue);}
        .btn-blue{background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;box-shadow:0 4px 16px rgba(59,130,246,.28);}
        .btn-blue:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(59,130,246,.38);}
        .btn-green{background:linear-gradient(135deg,#059669,#047857);color:#fff;box-shadow:0 4px 16px rgba(5,150,105,.28);}
        .btn-green:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(5,150,105,.38);}
        .btn-lg{padding:1rem 2.25rem;font-size:1.05rem;border-radius:11px;}
        /* HERO */
        .hero{position:relative;margin-top:88px;min-height:91vh;background:linear-gradient(145deg,#EFF6FF 0%,#F0FDF4 45%,#EFF6FF 100%);overflow:hidden;display:flex;align-items:center;}
        .hcanvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .blob{position:absolute;border-radius:50%;filter:blur(75px);pointer-events:none;animation:blobFloat 9s ease-in-out infinite;}
        .b1{width:560px;height:560px;background:radial-gradient(circle,rgba(59,130,246,.14),transparent 70%);top:-120px;right:-80px;}
        .b2{width:480px;height:480px;background:radial-gradient(circle,rgba(16,185,129,.11),transparent 70%);bottom:-80px;left:-60px;animation-delay:3s;}
        .b3{width:280px;height:280px;background:radial-gradient(circle,rgba(139,92,246,.09),transparent 70%);top:35%;left:42%;animation-delay:6s;}
        @keyframes blobFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(25px,-18px) scale(1.04)}66%{transform:translate(-18px,25px) scale(.96)}}
        .hw{max-width:1440px;margin:0 auto;padding:4rem 2.5rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;position:relative;z-index:1;width:100%;}
        .badge{display:inline-flex;align-items:center;gap:.55rem;padding:.5rem 1.1rem;background:rgba(1,33,105,.07);border:1.5px solid rgba(1,33,105,.17);border-radius:50px;font-size:.83rem;font-weight:700;color:var(--navy);margin-bottom:1.5rem;animation:slideDown .8s ease both;}
        @keyframes slideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
        .hero h1{font-family:'Archivo',sans-serif;font-size:3.8rem;font-weight:900;line-height:1.08;color:var(--dark);letter-spacing:-.03em;margin-bottom:1.25rem;animation:slideUp .9s ease .1s both;}
        @keyframes slideUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        .hero h1 .gw{background:linear-gradient(135deg,#3B82F6,#1D4ED8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero-p{font-size:1.15rem;color:var(--muted);line-height:1.82;margin-bottom:2.5rem;max-width:500px;animation:slideUp .9s ease .2s both;}
        .hero-btns{display:flex;gap:1rem;flex-wrap:wrap;animation:slideUp .9s ease .3s both;}
        .hero-trust{margin-top:1.75rem;display:flex;align-items:center;gap:1.2rem;color:var(--muted);font-size:.84rem;animation:slideUp .9s ease .4s both;}
        .ti{display:flex;align-items:center;gap:.4rem;}
        .td{width:6px;height:6px;border-radius:50%;background:var(--green);}
        /* DASHBOARD MOCKUP */
        .hero-vis{display:flex;justify-content:center;position:relative;}
        .dash{width:100%;max-width:500px;background:linear-gradient(145deg,#1E3A8A,#1E2D5E);border-radius:22px;padding:2rem 1.9rem;box-shadow:0 40px 100px rgba(30,58,138,.28),0 0 0 1px rgba(255,255,255,.08);position:relative;overflow:hidden;animation:slideUp .9s ease .15s both;}
        .dash::before{content:'';position:absolute;top:-60px;right:-60px;width:210px;height:210px;background:rgba(255,255,255,.04);border-radius:50%;}
        .dash::after{content:'';position:absolute;bottom:-80px;left:-40px;width:250px;height:250px;background:rgba(52,211,153,.07);border-radius:50%;}
        .dt{display:flex;align-items:center;gap:.6rem;margin-bottom:1.35rem;position:relative;z-index:1;}
        .dlive{width:9px;height:9px;border-radius:50%;background:#34D399;animation:livePulse 2s ease-in-out infinite;}
        @keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}60%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
        .dt h4{color:#fff;font-size:.92rem;font-weight:700;}
        .dg{display:grid;grid-template-columns:repeat(4,1fr);gap:.68rem;margin-bottom:1.1rem;position:relative;z-index:1;}
        .ds{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:.82rem .4rem;text-align:center;transition:transform .3s;cursor:default;}
        .ds:hover{transform:scale(1.06);}
        .ds .n{font-family:'Archivo',sans-serif;font-size:1.45rem;font-weight:900;color:#fff;display:block;line-height:1;}
        .ds .l{font-size:.63rem;color:rgba(255,255,255,.58);margin-top:.2rem;display:block;}
        .dj{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:.8rem .95rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:.58rem;position:relative;z-index:1;transition:all .3s;cursor:default;}
        .dj:hover{background:rgba(255,255,255,.15);transform:translateX(3px);}
        .dj h5{color:#fff;font-size:.8rem;font-weight:700;margin-bottom:.14rem;}
        .dj p{color:rgba(255,255,255,.55);font-size:.68rem;}
        .sc{padding:.23rem .62rem;border-radius:50px;font-size:.72rem;font-weight:700;}
        .sg{background:rgba(52,211,153,.22);color:#6EE7B7;} .sb{background:rgba(147,197,253,.2);color:#93C5FD;}
        .de{display:flex;align-items:center;gap:.45rem;padding:.52rem .88rem;background:rgba(52,211,153,.13);border:1px solid rgba(52,211,153,.27);border-radius:8px;position:relative;z-index:1;margin-top:.35rem;}
        .epulse{width:7px;height:7px;background:#34D399;border-radius:50%;animation:livePulse 1.5s ease-in-out infinite;}
        .de span{color:#6EE7B7;font-size:.74rem;font-weight:700;}
        /* floating badges */
        .fb{position:absolute;background:#fff;border-radius:12px;padding:.58rem .95rem;box-shadow:0 8px 28px rgba(0,0,0,.12);font-size:.78rem;font-weight:700;display:flex;align-items:center;gap:.45rem;white-space:nowrap;z-index:3;}
        .fb1{top:-12px;right:-20px;color:var(--green);animation:fbFloat 4s ease-in-out infinite;}
        .fb2{bottom:24px;left:-28px;color:var(--blue);animation:fbFloat 4s ease-in-out infinite;animation-delay:2s;}
        @keyframes fbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        /* STATS */
        .stats{padding:2.5rem 2.5rem;border-bottom:1px solid var(--border);}
        .sw{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center;}
        .stc{padding:1.55rem;background:#fff;border:1px solid var(--border);border-radius:14px;transition:all .35s;cursor:default;}
        .stc:hover{transform:translateY(-5px);box-shadow:0 12px 32px rgba(0,0,0,.08);border-color:var(--blue);}
        .stn{font-family:'Archivo',sans-serif;font-size:2.55rem;font-weight:900;background:linear-gradient(135deg,#3B82F6,#1D4ED8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:.38rem;}
        .stl{color:var(--muted);font-size:.88rem;font-weight:500;}
        /* SECTION SHARED */
        .stag{display:inline-block;padding:.42rem 1.1rem;background:linear-gradient(135deg,var(--blue),var(--blue-d));color:#fff;border-radius:50px;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:1.1rem;}
        .sh2{font-family:'Archivo',sans-serif;font-size:2.6rem;font-weight:800;color:var(--dark);margin-bottom:.85rem;line-height:1.18;}
        .ssub{font-size:1.05rem;color:var(--muted);}
        .shead{text-align:center;max-width:660px;margin:0 auto 3.5rem;}
        /* FEATURES */
        .features{padding:6.5rem 2.5rem;background:linear-gradient(180deg,var(--bg2),#fff);}
        .fg{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;}
        .fc{background:#fff;padding:2.2rem;border-radius:18px;border:1px solid var(--border);transition:all .4s;position:relative;overflow:hidden;cursor:default;}
        .fc::before{content:'';position:absolute;top:0;left:0;width:100%;height:4px;background:linear-gradient(90deg,var(--blue),var(--navy));transform:scaleX(0);transform-origin:left;transition:transform .4s;}
        .fc:hover{transform:translateY(-8px);box-shadow:0 24px 50px rgba(0,0,0,.09);border-color:var(--blue);}
        .fc:hover::before{transform:scaleX(1);}
        .fi{width:56px;height:56px;background:linear-gradient(135deg,var(--blue),var(--navy));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.2rem;animation:iconF 3s ease-in-out infinite;}
        @keyframes iconF{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .fc:nth-child(2) .fi{animation-delay:.3s}.fc:nth-child(3) .fi{animation-delay:.6s}.fc:nth-child(4) .fi{animation-delay:.9s}.fc:nth-child(5) .fi{animation-delay:1.2s}.fc:nth-child(6) .fi{animation-delay:1.5s}
        .fc h3{font-family:'Archivo',sans-serif;font-size:1.2rem;font-weight:700;margin-bottom:.65rem;}
        .fc p{color:var(--muted);line-height:1.72;margin-bottom:1.1rem;font-size:.92rem;}
        .ftag{display:inline-flex;padding:.32rem .78rem;background:rgba(59,130,246,.1);color:var(--blue);border-radius:6px;font-size:.76rem;font-weight:700;}
        /* HOW IT WORKS */
        .hiw{padding:6.5rem 2.5rem;}
        .steps{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;}
        .step{text-align:center;padding:2.2rem 1.5rem;border-radius:18px;border:1px solid var(--border);background:#fff;transition:all .35s;position:relative;overflow:hidden;}
        .step:hover{transform:translateY(-6px);box-shadow:0 20px 50px rgba(0,0,0,.09);border-color:var(--blue);}
        .snum{width:68px;height:68px;background:#fff;border:3px solid var(--blue);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.2rem;font-size:1.65rem;font-weight:900;font-family:'Archivo',sans-serif;color:var(--blue);box-shadow:0 6px 20px rgba(59,130,246,.18);transition:all .3s;}
        .step:hover .snum{background:linear-gradient(135deg,var(--blue),var(--navy));color:#fff;border-color:transparent;}
        .step h3{font-family:'Archivo',sans-serif;font-size:1.1rem;font-weight:700;margin-bottom:.65rem;}
        .step p{color:var(--muted);font-size:.88rem;line-height:1.68;}
        .ebadge{display:inline-flex;align-items:center;gap:.28rem;padding:.28rem .68rem;background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(1,33,105,.12));border:1px solid rgba(59,130,246,.22);border-radius:50px;font-size:.7rem;font-weight:700;color:var(--navy);margin-top:.65rem;}
        /* ENGINE */
        .engine{padding:6rem 2.5rem;background:linear-gradient(145deg,#0A0F1E,#0F2952);position:relative;overflow:hidden;}
        .engine::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 50%,rgba(59,130,246,.14) 0%,transparent 50%),radial-gradient(circle at 85% 50%,rgba(16,185,129,.09) 0%,transparent 50%);}
        .engine::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;animation:gridShift 22s linear infinite;}
        @keyframes gridShift{from{transform:translate(0,0)}to{transform:translate(48px,48px)}}
        .ew{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;position:relative;z-index:1;}
        .et h2{font-family:'Archivo',sans-serif;font-size:2.7rem;font-weight:900;color:#fff;line-height:1.18;margin-bottom:1.2rem;}
        .et h2 em{font-style:normal;background:linear-gradient(135deg,#60A5FA,#34D399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .et p{font-size:1.05rem;color:rgba(255,255,255,.76);line-height:1.85;margin-bottom:1.8rem;}
        .egrid{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem;}
        .ecard{padding:1.4rem;text-align:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:14px;transition:all .3s;}
        .ecard:hover{background:rgba(255,255,255,.12);transform:scale(1.04);}
        .ecard .n{font-family:'Archivo',sans-serif;font-size:2rem;font-weight:900;color:#60A5FA;display:block;margin-bottom:.2rem;}
        .ecard .l{color:rgba(255,255,255,.58);font-size:.78rem;}
        /* CTA */
        .cta{padding:6rem 2.5rem;background:linear-gradient(145deg,#EFF6FF,#ECFDF5);border-top:1px solid var(--border);}
        .ctaw{max-width:760px;margin:0 auto;text-align:center;}
        .ctaw h2{font-family:'Archivo',sans-serif;font-size:2.9rem;font-weight:900;color:var(--dark);margin-bottom:1.1rem;line-height:1.18;}
        .ctaw p{font-size:1.15rem;color:var(--muted);margin-bottom:2.5rem;}
        .ctab{display:flex;gap:1.1rem;justify-content:center;}
        /* FOOTER */
        footer{background:#0A0F1E;color:rgba(255,255,255,.62);padding:3.5rem 2.5rem 1.75rem;}
        .fw{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4rem;margin-bottom:2.5rem;}
        .flogo img{height:64px!important;width:auto!important;filter:brightness(0) invert(1);margin-bottom:.9rem;display:block;}
        .fbrand p{line-height:1.75;font-size:.9rem;}
        .fcol h4{color:#fff;font-weight:700;margin-bottom:1rem;font-size:.92rem;}
        .fcol ul{list-style:none;} .fcol li{margin-bottom:.6rem;}
        .fcol a{color:rgba(255,255,255,.55);font-size:.9rem;transition:color .25s;} .fcol a:hover{color:#60A5FA;}
        .fbot{max-width:1440px;margin:0 auto;padding-top:1.75rem;border-top:1px solid rgba(255,255,255,.1);text-align:center;color:rgba(255,255,255,.35);font-size:.84rem;}
        @media(max-width:1100px){.hw,.ew{grid-template-columns:1fr;}.hero-vis,.fb1,.fb2{display:none;}.fg,.steps{grid-template-columns:1fr 1fr;}}
        @media(max-width:768px){.hero h1{font-size:2.6rem;}.nl{display:none;}.sw{grid-template-columns:1fr 1fr;}.fg,.steps{grid-template-columns:1fr;}.fw{grid-template-columns:1fr;gap:2rem;}.hero-btns,.ctab{flex-direction:column;align-items:flex-start;}.sh2{font-size:2rem;}}
      `}</style>

      <nav className="nav" id="navbar">
        <div className="nw">
          <Link href="/" className="logo-link">
            <Image src="/logo.png" alt="SponsorPath" width={280} height={82} priority />
          </Link>
          <ul className="nl">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
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
        <canvas ref={canvasRef} className="hcanvas" />
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
        <div className="hw">
          <div>
            <div className="badge">
              <svg width="26" height="17" viewBox="0 0 60 36" style={{borderRadius:'3px',flexShrink:0}}>
                <rect width="60" height="36" fill="#012169"/>
                <path d="M0,0 L60,36 M60,0 L0,36" stroke="#fff" strokeWidth="6"/>
                <path d="M0,0 L60,36 M60,0 L0,36" stroke="#C8102E" strokeWidth="4"/>
                <path d="M30,0 V36 M0,18 H60" stroke="#fff" strokeWidth="10"/>
                <path d="M30,0 V36 M0,18 H60" stroke="#C8102E" strokeWidth="6"/>
              </svg>
              Built for UK Visa Candidates
            </div>
            <h1>Land Your UK Job.<br/><span className="gw">SponsorPath Engine</span><br/>Handles the Rest.</h1>
            <p className="hero-p">Register once. Set your career preferences. The SponsorPath Engine searches thousands of roles, tailors your resume to every JD, and auto-submits applications — so you wake up to interview requests, not job-hunting stress.</p>
            <div className="hero-btns">
              <Link href="/get-started" className="btn btn-green btn-lg">Get Started Free →</Link>
              <Link href="#how-it-works" className="btn btn-ghost btn-lg">See How It Works</Link>
            </div>
            <div className="hero-trust">
              <div className="ti"><div className="td"/><span>No credit card required</span></div>
              <div className="ti"><div className="td"/><span>Free 14-day trial</span></div>
              <div className="ti"><div className="td"/><span>Cancel anytime</span></div>
            </div>
          </div>
          <div className="hero-vis">
            <div style={{position:'relative'}}>
              <div className="fb fb1">✅ 3 Interview Requests!</div>
              <div className="fb fb2">⚡ 12 Jobs Applied Today</div>
              <div className="dash">
                <div className="dt"><div className="dlive"/><h4>SponsorPath Dashboard</h4></div>
                <div className="dg">{[{n:'14',l:'Applied'},{n:'3',l:'Replies'},{n:'89%',l:'Match'},{n:'✓',l:'ATS'}].map(s=><div key={s.l} className="ds"><span className="n">{s.n}</span><span className="l">{s.l}</span></div>)}</div>
                {[{t:'Senior DevOps Engineer',c:'Revolut · London',s:'94%',g:true},{t:'Backend Engineer',c:'Monzo · London',s:'81%',g:false},{t:'Data Engineer',c:'Wise · London',s:'88%',g:true}].map(j=>(
                  <div key={j.t} className="dj"><div><h5>{j.t}</h5><p>🏢 {j.c} · 🇬🇧 Sponsor ✓</p></div><span className={`sc ${j.g?'sg':'sb'}`}>{j.s}</span></div>
                ))}
                <div className="de"><div className="epulse"/><span>SponsorPath Engine actively searching...</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="sw">{[{n:'30%',l:'Response Rate'},{n:'5x',l:'Faster Applications'},{n:'30K+',l:'UK Sponsors'},{n:'0',l:'Fake Skills Added'}].map((s,i)=><div key={s.l} className={`stc rv d${i+1}`}><div className="stn">{s.n}</div><div className="stl">{s.l}</div></div>)}</div>
      </section>

      <section className="features" id="features">
        <div className="shead rv"><span className="stag">Why SponsorPath</span><h2 className="sh2">Built Different. Built Better.</h2><p className="ssub">A complete application quality engine — not just a resume builder.</p></div>
        <div className="fg">
          {[{i:'🎯',t:'Master Profile',d:'Upload once. We extract your real experience — nothing fabricated. Your verified truth source for every single application.',g:'100% Authentic'},{i:'⚙️',t:'SponsorPath Engine',d:'Our engine reads every JD, extracts requirements, detects mismatches, and stops poor applications before they damage your reputation.',g:'Smart Matching'},{i:'✨',t:'Fresh CV Per Job',d:'Every application gets a brand-new tailored resume. Rewritten summary, reordered skills, job-specific language. Zero generic CVs.',g:'ATS-Optimised'},{i:'🇬🇧',t:'UK Visa Intelligence',d:'Detects UK sponsor licences, adapts for Graduate vs Skilled Worker visas. 30,000+ licensed sponsors tracked weekly.',g:'UK-Specific'},{i:'🛡️',t:'Application Protection',d:'Hard stop for poor matches (<40%). No fake skills ever. Daily limits. We protect your professional reputation.',g:'Quality Gates'},{i:'📊',t:'Live Dashboard',d:'Track every application in real time. Response rates, interview conversions, top companies. Full analytics.',g:'Full Transparency'}].map((f,i)=>(
            <div key={f.t} className={`fc rv d${(i%3)+1}`}><div className="fi">{f.i}</div><h3>{f.t}</h3><p>{f.d}</p><span className="ftag">{f.g}</span></div>
          ))}
        </div>
      </section>

      <section className="hiw" id="how-it-works">
        <div className="shead rv"><span className="stag">Simple Process</span><h2 className="sh2">From Sign Up to Dream Job</h2><p className="ssub">One registration. Zero manual work. Maximum results.</p></div>
        <div className="steps">
          {[{n:'1',t:'Register & Set Preferences',d:'Sign up and tell us your visa status, target stream — DevOps, Engineering, Finance — and preferred UK locations.',e:false},{n:'2',t:'Upload Your Resume',d:'Upload your CV. The SponsorPath Engine checks ATS standards and builds your verified Master Profile automatically.',e:true},{n:'3',t:'Engine Finds Your Jobs',d:'SponsorPath Engine searches job boards and company career pages daily, filtering by UK sponsor licence status.',e:true},{n:'4',t:'Resume Matched to JD',d:'For every matched role, your resume is completely rewritten and tailored to that specific job description. Fresh CV every time.',e:true},{n:'5',t:'Applications Auto-Submitted',d:'SponsorPath Engine fills forms, answers screening questions, and submits your application directly to employers.',e:true},{n:'6',t:'Track & Win Interviews',d:'Monitor every application in your dashboard. Get notified of responses. Focus on interviews — not job hunting.',e:false}].map((s,i)=>(
            <div key={s.n} className={`step rv d${(i%3)+1}`}><div className="snum">{s.n}</div><h3>{s.t}</h3><p>{s.d}</p>{s.e&&<div className="ebadge">⚡ SponsorPath Engine</div>}</div>
          ))}
        </div>
      </section>

      <section className="engine">
        <div className="ew">
          <div className="et rl"><h2>Powered by the<br/><em>SponsorPath Engine</em></h2><p>Our proprietary engine does what no job board can — reads your profile, understands your visa needs, searches thousands of jobs, tailors your resume for each one, and submits applications on your behalf. All automatically. All accurately. All day, every day.</p><Link href="/get-started" className="btn btn-blue btn-lg">Start Free Trial</Link></div>
          <div className="egrid rr">{[{n:'30K+',l:'UK Sponsors Tracked'},{n:'24/7',l:'Continuous Search'},{n:'<30s',l:'CV Per Job'},{n:'100%',l:'ATS Pass Rate'}].map(s=><div key={s.l} className="ecard"><span className="n">{s.n}</span><span className="l">{s.l}</span></div>)}</div>
        </div>
      </section>

      <section className="cta">
        <div className="ctaw rv"><h2>Ready to Stop Wasting Applications?</h2><p>Let the SponsorPath Engine do the hard work while you prepare for interviews.</p><div className="ctab"><Link href="/get-started" className="btn btn-blue btn-lg">Start Free Trial</Link><Link href="/about" className="btn btn-ghost btn-lg">Learn More</Link></div></div>
      </section>

      <footer>
        <div className="fw">
          <div className="fbrand"><div className="flogo"><Image src="/logo.png" alt="SponsorPath" width={240} height={64}/></div><p>The SponsorPath Engine handles job search, resume tailoring, and application submission for UK visa candidates. Quality over quantity. Every single time.</p></div>
          <div className="fcol"><h4>Product</h4><ul><li><a href="#features">Features</a></li><li><Link href="/pricing">Pricing</Link></li><li><a href="#how-it-works">How It Works</a></li><li><a>Roadmap</a></li></ul></div>
          <div className="fcol"><h4>Resources</h4><ul><li><a>Blog</a></li><li><a>UK Sponsor List</a></li><li><a>Visa Guides</a></li><li><a>Help Centre</a></li></ul></div>
          <div className="fcol"><h4>Company</h4><ul><li><Link href="/about">About Us</Link></li><li><a>Contact</a></li><li><a>Privacy</a></li><li><a>Terms</a></li></ul></div>
        </div>
        <div className="fbot"><p>© 2026 SponsorPath. Built with ❤️ for UK job seekers. Not immigration advice.</p></div>
      </footer>
    </>
  )
}