// ════════════════════════════════════════════════════════
// FILE: lib/supabase.ts
// Complete Supabase client + all database helpers
// ════════════════════════════════════════════════════════

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

export async function signUp(email: string, password: string, meta: {
  firstName: string
  lastName: string
  visaStatus: string
}) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      data: {
        first_name: meta.firstName,
        last_name: meta.lastName,
        visa_status: meta.visaStatus,
      },
    },
  })
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════

export async function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('user_id', userId).single()
}

export async function saveProfile(userId: string, data: Partial<Profile>) {
  return supabase.from('profiles')
    .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()
}

export async function calculateProfileCompletion(userId: string): Promise<{ pct: number; missing: string[] }> {
  const { data: profile } = await getProfile(userId)
  if (!profile) return { pct: 0, missing: [] }

  const required = [
    'full_name',
    'email',
    'phone',
    'visa_status',
    'location_city',
    'target_roles',
    'salary_min',
    'salary_max',
  ]

  const missing = required.filter((field) => {
    const val = (profile as any)[field]
    return !val || (Array.isArray(val) && val.length === 0)
  })

  const pct = Math.round(((required.length - missing.length) / required.length) * 100)

  // Update profile with completion data
  await supabase.from('profiles').update({ 
    completion_pct: pct, 
    missing_fields: missing,
    profile_complete: pct === 100 
  }).eq('user_id', userId)

  return { pct, missing }
}

// ═══════════════════════════════════════════════════════════════════
// CVS
// ═══════════════════════════════════════════════════════════════════

export async function getCVs(userId: string) {
  return supabase.from('cvs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function getCV(cvId: string) {
  return supabase.from('cvs').select('*').eq('id', cvId).single()
}

export async function saveCV(userId: string, data: Partial<CV>) {
  return supabase.from('cvs')
    .insert({ user_id: userId, ...data })
    .select()
    .single()
}

export async function updateCV(cvId: string, data: Partial<CV>) {
  return supabase.from('cvs')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', cvId)
    .select()
    .single()
}

// ═══════════════════════════════════════════════════════════════════
// JOBS
// ═══════════════════════════════════════════════════════════════════

export async function getJobs(filters: {
  sponsored?: boolean
  contractType?: 'permanent' | 'contract'
  limit?: number
}) {
  let query = supabase.from('jobs')
    .select(`
      *,
      employer:employers(name, sponsor_status, sponsor_confidence)
    `)
    .eq('active', true)

  if (filters.sponsored !== undefined) {
    query = query.eq('sponsor_verified', filters.sponsored)
  }

  if (filters.contractType) {
    query = query.eq('contract_type', filters.contractType)
  }

  query = query
    .order('posted_at', { ascending: false })
    .limit(filters.limit || 50)

  return query
}

export async function getJob(jobId: string) {
  return supabase.from('jobs')
    .select(`
      *,
      employer:employers(name, sponsor_status, sponsor_confidence)
    `)
    .eq('id', jobId)
    .single()
}

// ═══════════════════════════════════════════════════════════════════
// JOB MATCHES
// ═══════════════════════════════════════════════════════════════════

export async function getJobMatches(userId: string, minScore = 0) {
  return supabase.from('job_matches')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('user_id', userId)
    .gte('fit_score', minScore)
    .order('fit_score', { ascending: false })
}

export async function saveJobMatch(userId: string, jobId: string, matchData: {
  fit_score: number
  skill_match: number
  title_match: number
  visa_factor: number
  salary_alignment: number
  location_score: number
  matched_skills_json: any
  missing_skills_json: any
}) {
  return supabase.from('job_matches')
    .upsert(
      { user_id: userId, job_id: jobId, ...matchData },
      { onConflict: 'user_id,job_id' }
    )
    .select()
    .single()
}

// ═══════════════════════════════════════════════════════════════════
// APPLICATIONS
// ═══════════════════════════════════════════════════════════════════

export async function getApplications(userId: string) {
  return supabase.from('applications')
    .select(`
      *,
      job:jobs(*),
      cv:cvs(*)
    `)
    .eq('user_id', userId)
    .order('applied_at', { ascending: false })
}

export async function getApplication(applicationId: string) {
  return supabase.from('applications')
    .select(`
      *,
      job:jobs(*),
      cv:cvs(*),
      events:application_events(*)
    `)
    .eq('id', applicationId)
    .single()
}

export async function saveApplication(userId: string, data: Partial<Application>) {
  // Generate unique tracking token
  const trackingToken = crypto.randomUUID()
  const trackingWebhook = `${process.env.NEXT_PUBLIC_APP_URL}/api/applications/track/${trackingToken}`

  return supabase.from('applications')
    .insert({
      user_id: userId,
      tracking_token: trackingToken,
      tracking_webhook: trackingWebhook,
      ...data,
    })
    .select()
    .single()
}

export async function updateApplicationStatus(applicationId: string, status: Application['status']) {
  const updateData: any = { status, updated_at: new Date().toISOString() }

  // Set timestamp based on status
  if (status === 'in_review') updateData.viewed_at = new Date().toISOString()
  if (status === 'interview') updateData.interview_at = new Date().toISOString()
  if (status === 'offer' || status === 'rejected') updateData.response_at = new Date().toISOString()

  return supabase.from('applications')
    .update(updateData)
    .eq('id', applicationId)
    .select()
    .single()
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════

export async function getNotifications(userId: string, unreadOnly = false) {
  let query = supabase.from('notifications')
    .select('*')
    .eq('user_id', userId)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  return query.order('created_at', { ascending: false }).limit(50)
}

export async function markNotificationRead(notificationId: string) {
  return supabase.from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
}

export async function createNotification(userId: string, data: {
  type: string
  title: string
  message?: string
  action_url?: string
  action_label?: string
  priority?: 'low' | 'medium' | 'high'
  data?: any
}) {
  return supabase.from('notifications')
    .insert({ user_id: userId, ...data })
    .select()
    .single()
}

// ═══════════════════════════════════════════════════════════════════
// ENGINE PREFERENCES
// ═══════════════════════════════════════════════════════════════════

export async function getEnginePreferences(userId: string) {
  const { data, error } = await supabase.from('engine_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Return defaults if no prefs exist
  if (error || !data) {
    return {
      data: {
        auto_submit: false,
        max_apps_per_day: 10,
        min_match_score: 70,
        email_alerts: true,
        weekly_digest: true,
        engine_active: true,
      },
      error: null,
    }
  }

  return { data, error: null }
}

export async function saveEnginePreferences(userId: string, prefs: Partial<EnginePreferences>) {
  return supabase.from('engine_preferences')
    .upsert(
      { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface Profile {
  user_id: string
  full_name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  visa_status?: string
  visa_expiry?: string
  location_city?: string
  uk_address?: string
  uk_postcode?: string
  radius_km?: number
  remote_pref?: 'office' | 'hybrid' | 'remote' | 'any'
  target_roles?: string[]
  salary_min?: number
  salary_max?: number
  salary_type?: 'annual' | 'day'
  notice_period?: string
  profile_complete?: boolean
  completion_pct?: number
  missing_fields?: string[]
  created_at?: string
  updated_at?: string
}

export interface CV {
  id?: string
  user_id?: string
  storage_url?: string
  parsed_json?: any
  raw_text?: string
  version_type?: 'base' | 'fixed' | 'tailored'
  base_cv_id?: string
  job_id?: string
  ats_score?: number
  ats_grade?: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  issues_json?: any[]
  fixes_applied?: string[]
  preview_html?: string
  created_at?: string
  updated_at?: string
}

export interface Job {
  id: string
  title: string
  company: string
  company_normalized: string
  employer_id?: string
  location?: string
  salary_min?: number
  salary_max?: number
  contract_type?: 'permanent' | 'contract'
  description?: string
  requirements?: string[]
  source?: string
  source_url?: string
  external_id?: string
  posted_at?: string
  expires_at?: string
  ingested_at?: string
  sponsor_verified?: boolean
  sponsor_confidence?: number
  ir35_status?: 'inside' | 'outside' | 'n/a'
  tags_json?: any
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Application {
  id?: string
  user_id?: string
  job_id?: string
  cv_id_used?: string
  job_title: string
  company: string
  location?: string
  job_url?: string
  status?: 'applied' | 'in_review' | 'interview' | 'offer' | 'rejected'
  applied_at?: string
  viewed_at?: string
  interview_at?: string
  response_at?: string
  follow_up_at?: string
  reminder_sent?: boolean
  notes?: string
  cover_letter?: string
  tailored_cv_text?: string
  auto_applied?: boolean
  tracking_webhook?: string
  tracking_token?: string
  created_at?: string
  updated_at?: string
}

export interface EnginePreferences {
  user_id?: string
  auto_submit?: boolean
  max_apps_per_day?: number
  min_match_score?: number
  email_alerts?: boolean
  weekly_digest?: boolean
  engine_active?: boolean
  last_run_at?: string
  updated_at?: string
  created_at?: string
}