// ============================================================
// FILE: src/components/Sidebar.tsx
// ============================================================
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const initials = ((user?.user_metadata?.first_name?.[0] || '') + (user?.user_metadata?.last_name?.[0] || '')).toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User'

  const navItems = [
    { href: '/dashboard',    emoji: '📊', label: 'Overview'      },
    { href: '/applications', emoji: '📋', label: 'Applications'  },
    { href: '/cv',           emoji: '📄', label: 'Resume & ATS'  },
    { href: '/jobs',         emoji: '⚙️',  label: 'Job Engine'    },
    { href: '/real-chances', emoji: '🎯', label: 'Real Chances'  },
    { href: '/profile',      emoji: '👤', label: 'My Profile'    },
  ]

  return (
    <>
      <style>{`
        @keyframes sb-pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}50%{box-shadow:0 0 0 7px rgba(16,185,129,0)}}
        @keyframes sb-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        .sb{
          width:230px;min-width:230px;
          background:linear-gradient(180deg,#0d1117 0%,#111827 50%,#0d1117 100%);
          height:100vh;position:fixed;top:0;left:0;
          display:flex;flex-direction:column;
          padding:22px 14px;z-index:200;
          border-right:1px solid rgba(255,255,255,.05);
          font-family:'DM Sans',sans-serif;
        }
        .sb-logo{display:flex;align-items:center;gap:10px;padding:6px 8px;margin-bottom:32px;text-decoration:none;animation:sb-in .4s ease both;}
        .sb-logo-icon{
          width:36px;height:36px;
          background:linear-gradient(135deg,#4f8ef7 0%,#a78bfa 100%);
          border-radius:10px;display:flex;align-items:center;justify-content:center;
          font-weight:900;color:#fff;font-size:17px;
          box-shadow:0 4px 14px rgba(79,142,247,.4);flex-shrink:0;
          transition:transform .2s;
        }
        .sb-logo:hover .sb-logo-icon{transform:scale(1.08) rotate(-4deg);}
        .sb-logo-text{font-size:17px;font-weight:800;color:#fff;letter-spacing:-.4px;}
        .sb-logo-text b{background:linear-gradient(90deg,#4f8ef7,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;}
        .sb-section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.22);padding:0 10px;margin-bottom:6px;margin-top:4px;}
        .sb-nav-item{
          display:flex;align-items:center;gap:11px;
          padding:10px 12px;border-radius:9px;
          color:rgba(255,255,255,.42);font-size:13.5px;font-weight:600;
          cursor:pointer;text-decoration:none;margin-bottom:2px;
          border:1px solid transparent;position:relative;
          transition:color .18s,background .18s,border-color .18s,transform .18s;
        }
        .sb-nav-item:hover{
          background:rgba(255,255,255,.06);
          color:rgba(255,255,255,.82);
          transform:translateX(2px);
        }
        .sb-nav-item.active{
          background:rgba(79,142,247,.14);
          color:#fff;border-color:rgba(79,142,247,.28);
          box-shadow:0 0 20px rgba(79,142,247,.1);
        }
        .sb-nav-item.active::before{
          content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
          width:3px;height:55%;
          background:linear-gradient(180deg,#4f8ef7,#a78bfa);
          border-radius:0 3px 3px 0;
        }
        .sb-nav-emoji{font-size:15px;width:20px;text-align:center;flex-shrink:0;}
        .sb-bottom{margin-top:auto;display:flex;flex-direction:column;gap:10px;}
        .sb-engine{
          background:rgba(16,185,129,.1);
          border:1px solid rgba(16,185,129,.2);
          border-radius:10px;padding:13px 14px;
        }
        .sb-engine-row{display:flex;align-items:center;gap:7px;margin-bottom:2px;}
        .sb-pulse{width:7px;height:7px;background:#10b981;border-radius:50%;animation:sb-pulse 2s infinite;flex-shrink:0;}
        .sb-engine-title{font-size:12px;font-weight:700;color:#10b981;}
        .sb-engine-sub{font-size:11px;color:rgba(16,185,129,.55);padding-left:14px;}
        .sb-user{
          display:flex;align-items:center;gap:9px;
          padding:10px 11px;background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.07);border-radius:9px;
        }
        .sb-avatar{
          width:32px;height:32px;border-radius:50%;flex-shrink:0;
          background:linear-gradient(135deg,#4f8ef7,#a78bfa);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:800;font-size:11px;
        }
        .sb-uname{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .sb-uemail{font-size:10px;color:rgba(255,255,255,.32);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .sb-signout{
          width:100%;padding:8px;background:transparent;
          border:1px solid rgba(255,255,255,.07);border-radius:8px;
          color:rgba(255,255,255,.38);font-size:12px;font-weight:600;
          cursor:pointer;transition:all .2s;font-family:inherit;
        }
        .sb-signout:hover{border-color:rgba(239,68,68,.4);color:#ef4444;background:rgba(239,68,68,.05);}
      `}</style>

      <nav className="sb">
        <Link href="/dashboard" className="sb-logo">
          <div className="sb-logo-icon">S</div>
          <div className="sb-logo-text">Sponsor<b>Path</b></div>
        </Link>

        <div className="sb-section-label">Main</div>
        {navItems.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sb-nav-item${pathname?.startsWith(item.href) ? ' active' : ''}`}
            style={{animationDelay:`${i*0.05}s`}}
          >
            <span className="sb-nav-emoji">{item.emoji}</span>
            {item.label}
          </Link>
        ))}

        <div className="sb-bottom">
          <div className="sb-engine">
            <div className="sb-engine-row">
              <div className="sb-pulse"/>
              <div className="sb-engine-title">SponsorPath Engine</div>
            </div>
            <div className="sb-engine-sub">Actively searching</div>
          </div>
          <div className="sb-user">
            <div className="sb-avatar">{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sb-uname">{displayName}</div>
              <div className="sb-uemail">{user?.email}</div>
            </div>
          </div>
          <button className="sb-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>
    </>
  )
}