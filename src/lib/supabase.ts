// lib/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// SponsorPath — Supabase Integration Layer
// Handles: Auth (email + OTP), User Profiles, ATS Scoring, Job Search
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


// ═══════════════════════════════════════════════════════════════
// AUTH — Sign Up
// ═══════════════════════════════════════════════════════════════
export async function signUp(email: string, password: string, userData: {
  firstName: string
  lastName: string
  visaStatus: string
  targetStreams: string[]
  preferredLocations: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        visa_status: userData.visaStatus,
        target_streams: userData.targetStreams,
        preferred_locations: userData.preferredLocations,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }
  })
  return { data, error }
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Sign In with OTP (email + password → sends OTP)
// ═══════════════════════════════════════════════════════════════
export async function signIn(email: string, password: string) {
  // Step 1: verify password
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { data: null, error }

  // Step 2: send OTP to email for 2FA
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }
  })

  return { data, error: otpError }
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Verify OTP
// ═══════════════════════════════════════════════════════════════
export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  return { data, error }
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Sign In with Google
// ═══════════════════════════════════════════════════════════════
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
  })
  return { data, error }
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Sign In with LinkedIn
// ═══════════════════════════════════════════════════════════════
export async function signInWithLinkedIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
  })
  return { data, error }
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Sign Out
// ═══════════════════════════════════════════════════════════════
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Get Current Session
// ═══════════════════════════════════════════════════════════════
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}


// ═══════════════════════════════════════════════════════════════
// MASTER PROFILE — Save / Get
// ═══════════════════════════════════════════════════════════════
export async function saveMasterProfile(userId: string, profile: {
  fullName: string
  email: string
  currentRole: string
  yearsExperience: number
  visaStatus: string
  targetStreams: string[]
  preferredLocations: string
  skills: string[]
  education: object[]
  experience: object[]
  atsScore: number
}) {
  const { data, error } = await supabase
    .from('master_profiles')
    .upsert({
      user_id: userId,
      ...profile,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()
  return { data, error }
}

export async function getMasterProfile(userId: string) {
  const { data, error } = await supabase
    .from('master_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}


// ═══════════════════════════════════════════════════════════════
// ATS SCORING — Analyse resume text
// ═══════════════════════════════════════════════════════════════
export interface ATSResult {
  score: number          // 0-100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  checks: {
    label: string
    status: 'pass' | 'warn' | 'fail'
    message: string
  }[]
  keywords: string[]
  suggestions: string[]
}

export function analyseATS(resumeText: string, jobDescription?: string): ATSResult {
  const text = resumeText.toLowerCase()
  const checks: ATSResult['checks'] = []
  let score = 0

  // Check: Contact info
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText)
  const hasPhone = /(\+44|0)[0-9\s\-]{10,}/i.test(resumeText)
  const hasLinkedIn = /linkedin\.com/i.test(resumeText)
  if (hasEmail && hasPhone) { score += 15; checks.push({label:'Contact Info',status:'pass',message:'Email and phone number found'}) }
  else { checks.push({label:'Contact Info',status:'warn',message:'Add complete contact details'}) }
  if (hasLinkedIn) { score += 5; checks.push({label:'LinkedIn URL',status:'pass',message:'LinkedIn profile detected'}) }
  else { checks.push({label:'LinkedIn URL',status:'fail',message:'Add your LinkedIn URL for 20% more responses'}) }

  // Check: Sections
  const sections = ['experience', 'education', 'skills', 'summary', 'profile']
  const foundSections = sections.filter(s => text.includes(s))
  if (foundSections.length >= 4) { score += 20; checks.push({label:'Resume Structure',status:'pass',message:'All key sections present'}) }
  else if (foundSections.length >= 2) { score += 10; checks.push({label:'Resume Structure',status:'warn',message:`Add missing sections: ${sections.filter(s=>!text.includes(s)).join(', ')}`}) }
  else { checks.push({label:'Resume Structure',status:'fail',message:'Resume missing key sections'}) }

  // Check: Measurable achievements
  const hasMetrics = /[0-9]+%|£[0-9]+|\$[0-9]+|[0-9]+ (users|clients|projects|team|members|months|years|hours)/i.test(resumeText)
  if (hasMetrics) { score += 20; checks.push({label:'Quantified Achievements',status:'pass',message:'Measurable results found — great for ATS'}) }
  else { checks.push({label:'Quantified Achievements',status:'warn',message:'Add numbers: reduced costs by 30%, led team of 8, etc.'}) }

  // Check: Action verbs
  const actionVerbs = ['led','managed','built','developed','delivered','improved','reduced','increased','designed','implemented','automated','deployed','architected','created','launched']
  const verbsFound = actionVerbs.filter(v => text.includes(v))
  if (verbsFound.length >= 5) { score += 15; checks.push({label:'Action Verbs',status:'pass',message:`Strong action verbs: ${verbsFound.slice(0,4).join(', ')}`}) }
  else { checks.push({label:'Action Verbs',status:'warn',message:'Start bullet points with strong action verbs'}) }

  // Check: Length
  const wordCount = resumeText.split(/\s+/).length
  if (wordCount >= 300 && wordCount <= 700) { score += 10; checks.push({label:'Resume Length',status:'pass',message:`${wordCount} words — ideal length`}) }
  else if (wordCount < 300) { checks.push({label:'Resume Length',status:'warn',message:`Only ${wordCount} words — add more detail`}) }
  else { score += 5; checks.push({label:'Resume Length',status:'warn',message:`${wordCount} words — consider trimming to 600`}) }

  // Check: Skills section
  const techSkills = ['javascript','typescript','python','java','react','node','aws','azure','gcp','kubernetes','docker','sql','ci/cd','git','terraform','linux']
  const skillsFound = techSkills.filter(s => text.includes(s))
  if (skillsFound.length >= 4) { score += 15; checks.push({label:'Technical Skills',status:'pass',message:`${skillsFound.length} tech skills detected`}) }
  else { checks.push({label:'Technical Skills',status:'warn',message:'Expand your skills section with relevant keywords'}) }

  // Job description keyword matching
  const keywords: string[] = []
  if (jobDescription) {
    const jdWords = jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    const unique = [...new Set(jdWords)].filter(w => !['with','that','this','from','have','will','your','they'].includes(w))
    const matched = unique.filter(w => text.includes(w))
    keywords.push(...matched.slice(0, 10))
    const matchPct = (matched.length / Math.max(unique.length, 1)) * 100
    if (matchPct >= 60) score += 10
  }

  const grade: ATSResult['grade'] = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Poor'
  const suggestions = checks.filter(c=>c.status!=='pass').map(c=>c.message)

  return { score: Math.min(score, 100), grade, checks, keywords, suggestions }
}


// ═══════════════════════════════════════════════════════════════
// JOB APPLICATIONS — Save
// ═══════════════════════════════════════════════════════════════
export async function saveApplication(userId: string, application: {
  jobTitle: string
  company: string
  location: string
  matchScore: number
  jobBoardUrl: string
  status: 'Applied' | 'Viewed' | 'Interview' | 'Rejected'
  resumeVersion: string
}) {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      ...application,
      applied_at: new Date().toISOString()
    })
    .select()
  return { data, error }
}

export async function getApplications(userId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('applied_at', { ascending: false })
  return { data, error }
}


// ═══════════════════════════════════════════════════════════════
// DATABASE SCHEMA (run in Supabase SQL editor)
// ═══════════════════════════════════════════════════════════════
/*
-- Master Profiles table
CREATE TABLE master_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  email TEXT,
  current_role TEXT,
  years_experience INT,
  visa_status TEXT,
  target_streams TEXT[],
  preferred_locations TEXT,
  skills TEXT[],
  education JSONB DEFAULT '[]',
  experience JSONB DEFAULT '[]',
  ats_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  match_score INT,
  job_board_url TEXT,
  status TEXT DEFAULT 'Applied',
  resume_version TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE master_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data
CREATE POLICY "Users own their profile" ON master_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their applications" ON applications FOR ALL USING (auth.uid() = user_id);
*/