'use client'
// ═══════════════════════════════════════════════════════════════════
// PROFILE PAGE - Auto-filled forms from CV extraction
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getProfile, saveProfile, calculateProfileCompletion } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/signin'); return }
      setUser(session.user)
      
      const { data } = await getProfile(session.user.id)
      if (data) {
        setProfile(data)
      }
    })
  }, [router])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)

    try {
      await saveProfile(user.id, profile)
      await calculateProfileCompletion(user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
      alert('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
  }

  const completionPct = profile?.completion_pct || 0
  const missingFields = profile?.missing_fields || []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#F1F5F9;}
        .page{max-width:1400px;margin:0 auto;padding:40px 24px;}
        
        .page-header{margin-bottom:32px;}
        .page-header h1{font-size:32px;font-weight:900;color:#0F172A;margin-bottom:8px;}
        .page-header p{font-size:16px;color:#64748B;}
        
        .completion-banner{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:2px solid rgba(59,130,246,.2);border-radius:12px;padding:24px;margin-bottom:32px;}
        .completion-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .completion-title{font-size:18px;font-weight:800;color:#0F172A;}
        .completion-pct{font-size:32px;font-weight:900;background:linear-gradient(135deg,#3B82F6,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .completion-bar{height:12px;background:rgba(59,130,246,.1);border-radius:20px;overflow:hidden;}
        .completion-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#8B5CF6);border-radius:20px;transition:width .8s ease;}
        .missing-fields{margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;}
        .missing-badge{padding:6px 12px;background:rgba(239,68,68,.1);color:#B91C1C;border-radius:6px;font-size:12px;font-weight:700;}
        
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
        .card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05);}
        .card-title{font-size:20px;font-weight:800;margin-bottom:20px;color:#0F172A;}
        .card-desc{font-size:14px;color:#64748B;margin-bottom:24px;line-height:1.6;}
        
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
        .form-group{display:flex;flex-direction:column;gap:8px;}
        .form-label{font-size:13px;font-weight:700;color:#64748B;}
        .form-input{padding:12px 16px;border:2px solid #E2E8F0;border-radius:8px;font-size:15px;font-family:inherit;transition:all .2s;background:#fff;}
        .form-input:focus{outline:none;border-color:#3B82F6;background:#F8FAFC;}
        .form-select{padding:12px 16px;border:2px solid #E2E8F0;border-radius:8px;font-size:15px;font-family:inherit;background:#fff;cursor:pointer;}
        .form-select:focus{outline:none;border-color:#3B82F6;}
        
        .save-btn{width:100%;padding:16px;background:linear-gradient(135deg,#3B82F6,#1E40AF);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(59,130,246,.3);transition:all .2s;margin-top:24px;}
        .save-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,.4);}
        .save-btn:disabled{opacity:.5;cursor:not-allowed;}
        .save-btn.saved{background:linear-gradient(135deg,#10B981,#047857);}
        
        .info-box{background:rgba(59,130,246,.05);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:16px;font-size:13px;color:#1E40AF;line-height:1.6;margin-bottom:24px;}
        .info-box strong{color:#1E3A8A;}
      `}</style>

      <div className="page">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Your profile is auto-filled when you upload a CV. Complete all fields for best results.</p>
        </div>

        <div className="completion-banner">
          <div className="completion-header">
            <div className="completion-title">Profile Completion</div>
            <div className="completion-pct">{completionPct}%</div>
          </div>
          <div className="completion-bar">
            <div className="completion-fill" style={{width: `${completionPct}%`}}/>
          </div>
          {missingFields.length > 0 && (
            <div className="missing-fields">
              <span style={{fontSize:'12px',color:'#64748B',fontWeight:700}}>Missing:</span>
              {missingFields.map((field: string) => (
                <span key={field} className="missing-badge">
                  {field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid">
          {/* MASTER PROFILE */}
          <div className="card">
            <h3 className="card-title">👤 Master Profile</h3>
            <p className="card-desc">
              Used by the engine for every application. Auto-filled when you upload your CV.
            </p>

            <div className="info-box">
              <strong>Auto-fill working:</strong> Upload a CV in the Resume & ATS tab and these fields will be automatically populated with data extracted from your CV.
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={profile.full_name || ''}
                  onChange={e => updateField('full_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={profile.email || ''}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={profile.phone || ''}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="+44 7700 000000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input
                  className="form-input"
                  value={profile.linkedin_url || ''}
                  onChange={e => updateField('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Visa Status</label>
              <select
                className="form-select"
                value={profile.visa_status || ''}
                onChange={e => updateField('visa_status', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Graduate Visa (PSW)">Graduate Visa (PSW)</option>
                <option value="Skilled Worker Visa">Skilled Worker Visa</option>
                <option value="Student Visa">Student Visa</option>
                <option value="British Citizen / ILR">British Citizen / ILR</option>
                <option value="EU Settled Status">EU Settled Status</option>
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Visa Expiry Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={profile.visa_expiry || ''}
                  onChange={e => updateField('visa_expiry', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">UK Postcode</label>
                <input
                  className="form-input"
                  value={profile.uk_postcode || ''}
                  onChange={e => updateField('uk_postcode', e.target.value)}
                  placeholder="E1 6AN"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full UK Address</label>
              <input
                className="form-input"
                value={profile.uk_address || ''}
                onChange={e => updateField('uk_address', e.target.value)}
                placeholder="123 High Street, London E1 6AN"
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Salary Type</label>
                <select
                  className="form-select"
                  value={profile.salary_type || 'annual'}
                  onChange={e => updateField('salary_type', e.target.value)}
                >
                  <option value="annual">Annual (£/year)</option>
                  <option value="day">Day Rate (£/day)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location Preference</label>
                <input
                  className="form-input"
                  value={profile.location_city || ''}
                  onChange={e => updateField('location_city', e.target.value)}
                  placeholder="London"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Min. Salary {profile.salary_type === 'day' ? '(£/day)' : '(£/year)'}
                </label>
                <input
                  className="form-input"
                  type="number"
                  value={profile.salary_min || ''}
                  onChange={e => updateField('salary_min', parseInt(e.target.value))}
                  placeholder={profile.salary_type === 'day' ? '400' : '50000'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Max. Salary {profile.salary_type === 'day' ? '(£/day)' : '(£/year)'}
                </label>
                <input
                  className="form-input"
                  type="number"
                  value={profile.salary_max || ''}
                  onChange={e => updateField('salary_max', parseInt(e.target.value))}
                  placeholder={profile.salary_type === 'day' ? '700' : '80000'}
                />
              </div>
            </div>

            <button
              className={`save-btn ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : saved ? '✅ Saved Successfully' : 'Save Profile'}
            </button>
          </div>

          {/* ENGINE PREFERENCES */}
          <div className="card">
            <h3 className="card-title">⚙️ Job Preferences</h3>
            <p className="card-desc">
              Tell the engine what you're looking for.
            </p>

            <div className="form-group">
              <label className="form-label">Target Roles (comma separated)</label>
              <input
                className="form-input"
                value={profile.target_roles?.join(', ') || ''}
                onChange={e => updateField('target_roles', e.target.value.split(',').map((s: string) => s.trim()))}
                placeholder="Software Engineer, DevOps Engineer"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Remote Preference</label>
              <select
                className="form-select"
                value={profile.remote_pref || 'any'}
                onChange={e => updateField('remote_pref', e.target.value)}
              >
                <option value="any">Any</option>
                <option value="office">Office Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote Only</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Search Radius (km)</label>
              <select
                className="form-select"
                value={profile.radius_km || 50}
                onChange={e => updateField('radius_km', parseInt(e.target.value))}
              >
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="200">200 km (nationwide)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notice Period</label>
              <select
                className="form-select"
                value={profile.notice_period || ''}
                onChange={e => updateField('notice_period', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Immediate">Immediate</option>
                <option value="1 week">1 week</option>
                <option value="2 weeks">2 weeks</option>
                <option value="1 month">1 month</option>
                <option value="2 months">2 months</option>
                <option value="3 months">3 months</option>
              </select>
            </div>

            <div style={{background:'rgba(16,185,129,.05)',border:'1px solid rgba(16,185,129,.15)',borderRadius:'8px',padding:'16px',marginTop:'24px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                <span style={{fontSize:'20px'}}>✨</span>
                <span style={{fontSize:'14px',fontWeight:800,color:'#047857'}}>Auto-fill Tip</span>
              </div>
              <p style={{fontSize:'13px',color:'#065F46',lineHeight:1.6}}>
                Most of these fields are automatically extracted when you upload your CV. Just review and adjust as needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}