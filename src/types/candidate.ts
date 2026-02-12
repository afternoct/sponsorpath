// ============================================================
// SPONSORPATH — CANDIDATE PROFILE (Single Source of Truth)
// Every piece of data extracted from a CV lives here.
// Profile is auto-filled from this. Never blank.
// ============================================================

export interface ContactInfo {
  full_name:            string
  email:                string
  phone:                string
  linkedin_url:         string
  location:             string
  visa_status?:         string   // filled on onboarding
  right_to_work?:       boolean
  requires_sponsorship?:boolean
}

export interface WorkEntry {
  title:    string
  company:  string
  location: string
  dates:    string
  current:  boolean
  bullets:  string[]
}

export interface EducationEntry {
  degree:      string
  institution: string
  location:    string
  dates:       string
  grade?:      string
}

export interface CandidateProfile {
  // ── identity
  user_id:          string
  // ── contact
  contact:          ContactInfo
  // ── experience
  work_history:     WorkEntry[]
  total_years_exp:  number
  current_title:    string
  current_company:  string
  // ── education
  education:        EducationEntry[]
  highest_degree:   string
  // ── skills
  all_skills:       string[]   // every skill, deduped
  tech_skills:      string[]   // tech/tools only
  // ── other
  certifications:   string[]
  languages:        Array<{ name: string; level: string }>
  soft_skills:      string[]
  // ── summary
  professional_summary: string
  // ── targets (CV extracted + user input)
  target_roles:     string[]
  target_location:  string
}

export interface ATSResult {
  score:  number
  grade:  'A+' | 'A' | 'B' | 'C' | 'D'
  passed: string[]
  issues: string[]
}