// ════════════════════════════════════════════════════════
// FILE PATH: src/lib/supabase.ts
// ════════════════════════════════════════════════════════
// Install: npm install @supabase/ssr @supabase/supabase-js
// OTP REMOVED — users go directly to dashboard after login

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// ─── AUTH ────────────────────────────────────────────────
export async function signUp(email: string, password: string, meta: {
  firstName: string; lastName: string; visaStatus: string
  targetStreams: string[]; preferredLocations: string
}) {
  return supabase.auth.signUp({ email, password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'}/dashboard`,
      data: { first_name: meta.firstName, last_name: meta.lastName,
        visa_status: meta.visaStatus, target_streams: meta.targetStreams,
        preferred_locations: meta.preferredLocations }
    }
  })
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() { return supabase.auth.signOut() }

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'}/dashboard` }})
}

export async function signInWithLinkedIn() {
  return supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'}/dashboard` }})
}

// ─── MASTER PROFILE ──────────────────────────────────────
export async function getMasterProfile(userId: string) {
  return supabase.from('master_profiles').select('*').eq('user_id', userId).single()
}
export async function saveMasterProfile(userId: string, profile: Partial<MasterProfile>) {
  return supabase.from('master_profiles').upsert(
    { user_id: userId, ...profile, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }).select().single()
}

// ─── APPLICATIONS ────────────────────────────────────────
export async function getApplications(userId: string) {
  return supabase.from('applications').select('*').eq('user_id', userId)
    .order('applied_at', { ascending: false })
}
export async function saveApplication(userId: string, app: Partial<Application>) {
  return supabase.from('applications').insert({ user_id: userId, ...app }).select().single()
}
export async function updateApplicationStatus(id: string, status: string) {
  return supabase.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
}

// ─── NOTIFICATIONS ───────────────────────────────────────
export async function getNotifications(userId: string) {
  return supabase.from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(30)
}
export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ read: true }).eq('id', id)
}

// ─── ENGINE PREFERENCES ──────────────────────────────────
export async function getEnginePrefs(userId: string) {
  return supabase.from('engine_preferences').select('*').eq('user_id', userId).single()
}
export async function saveEnginePrefs(userId: string, prefs: Partial<EnginePreferences>) {
  return supabase.from('engine_preferences').upsert(
    { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }).select().single()
}

// ─── ATS ENGINE ──────────────────────────────────────────
export interface ATSResult {
  score: number; grade: 'Excellent'|'Good'|'Fair'|'Poor'
  checks: { label: string; status: 'pass'|'warn'|'fail'; message: string }[]
  suggestions: string[]; keywords: string[]
}

export function analyseATS(text: string, jd = ''): ATSResult {
  const t = text.toLowerCase(); const checks: ATSResult['checks'] = []; let score = 0
  const add = (label: string, ok: boolean, warn: boolean, pass: string, w: string, fail = '') => {
    if (ok) { score += 15; checks.push({label, status:'pass', message:pass}) }
    else if (warn) { score += 5; checks.push({label, status:'warn', message:w}) }
    else { checks.push({label, status:'fail', message: fail||w}) }
  }
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)
  const hasPhone = /(\+44|0)[0-9\s\-]{9,}/i.test(text)
  if (hasEmail && hasPhone) { score += 15; checks.push({label:'Contact Info', status:'pass', message:'Email and phone found'}) }
  else checks.push({label:'Contact Info', status:'warn', message:'Add email and phone number'})
  if (/linkedin\.com/i.test(text)) { score += 5; checks.push({label:'LinkedIn URL', status:'pass', message:'LinkedIn detected'}) }
  else checks.push({label:'LinkedIn URL', status:'fail', message:'Add LinkedIn URL — 20% more responses'})
  const secs = ['experience','education','skills','summary','profile']
  const found = secs.filter(s => t.includes(s))
  if (found.length >= 4) { score += 20; checks.push({label:'Resume Structure', status:'pass', message:'All key sections present'}) }
  else if (found.length >= 2) { score += 10; checks.push({label:'Resume Structure', status:'warn', message:`Add missing sections`}) }
  else checks.push({label:'Resume Structure', status:'fail', message:'Missing key sections'})
  if (/[0-9]+%|£[0-9]+|[0-9]+ (users|clients|projects|team)/i.test(text))
    { score += 20; checks.push({label:'Quantified Results', status:'pass', message:'Measurable results found'}) }
  else checks.push({label:'Quantified Results', status:'warn', message:'Add metrics: reduced costs 30%...'})
  const verbs = ['led','built','developed','delivered','improved','reduced','increased','designed','implemented','automated','deployed','managed']
  const vf = verbs.filter(v => t.includes(v))
  if (vf.length >= 5) { score += 15; checks.push({label:'Action Verbs', status:'pass', message:`Strong verbs: ${vf.slice(0,3).join(', ')}`}) }
  else checks.push({label:'Action Verbs', status:'warn', message:'Start bullets with action verbs'})
  const words = text.split(/\s+/).length
  if (words >= 300 && words <= 700) { score += 10; checks.push({label:'Length', status:'pass', message:`${words} words — ideal`}) }
  else if (words < 300) checks.push({label:'Length', status:'warn', message:`Only ${words} words — add detail`})
  else { score += 5; checks.push({label:'Length', status:'warn', message:`${words} words — consider trimming`}) }
  const tech = ['javascript','typescript','python','java','react','node','aws','azure','gcp','kubernetes','docker','sql','terraform','linux','git']
  const sf = tech.filter(s => t.includes(s))
  if (sf.length >= 4) { score += 15; checks.push({label:'Tech Skills', status:'pass', message:`${sf.length} skills detected`}) }
  else checks.push({label:'Tech Skills', status:'warn', message:'Expand technical skills'})
  const keywords: string[] = []
  if (jd) {
    const jdW = [...new Set((jd.toLowerCase().match(/\b[a-z]{4,}\b/g)||[])
      .filter(w => !['with','that','this','from','have','will','your','they'].includes(w)))]
    keywords.push(...jdW.filter(w => t.includes(w)).slice(0,12))
  }
  const grade: ATSResult['grade'] = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Poor'
  return { score: Math.min(score,100), grade, checks, suggestions: checks.filter(c=>c.status!=='pass').map(c=>c.message), keywords }
}

// ─── TYPES ───────────────────────────────────────────────
export interface MasterProfile {
  id?: string; user_id?: string; full_name: string; email: string
  phone?: string; linkedin_url?: string; current_role: string
  years_experience: number; visa_status: string; target_streams: string[]
  preferred_locations: string; skills: string[]; education: object[]
  experience: object[]; raw_resume_text?: string; ats_score: number
  ats_grade: string; profile_complete: boolean
}
export interface Application {
  id?: string; user_id?: string; job_title: string; company: string
  location: string; job_url?: string; job_board?: string; match_score: number
  status: 'Applied'|'Viewed'|'Interview'|'Offered'|'Rejected'
  resume_used?: string; sponsor_verified: boolean; auto_applied: boolean; applied_at?: string
}
export interface EnginePreferences {
  user_id?: string; max_apps_per_day: number; min_match_score: number
  preferred_locations: string[]; target_streams: string[]; job_boards: string[]
  auto_submit: boolean; email_alerts: boolean; engine_active: boolean
}