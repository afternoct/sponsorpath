-- ════════════════════════════════════════════════════════════════
-- FILE: src/db/schema.sql
-- WHERE: Run this in Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════
-- SponsorPath — Complete Database Schema
-- Run top to bottom. Safe to re-run (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────
-- 1. MASTER PROFILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_profiles (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  linkedin_url        TEXT,
  current_role        TEXT,
  years_experience    INT DEFAULT 0,
  visa_status         TEXT,
  target_streams      TEXT[]  DEFAULT '{}',
  preferred_locations TEXT    DEFAULT 'London',
  skills              TEXT[]  DEFAULT '{}',
  education           JSONB   DEFAULT '[]',
  experience          JSONB   DEFAULT '[]',
  raw_resume_text     TEXT,
  ats_score           INT     DEFAULT 0,
  ats_grade           TEXT    DEFAULT 'Not checked',
  ats_checks          JSONB   DEFAULT '[]',
  ats_suggestions     JSONB   DEFAULT '[]',
  profile_complete    BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. APPLICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_title       TEXT NOT NULL,
  company         TEXT NOT NULL,
  location        TEXT DEFAULT 'London',
  job_url         TEXT,
  job_board       TEXT DEFAULT 'LinkedIn',
  match_score     INT  DEFAULT 0,
  status          TEXT DEFAULT 'Applied'
                  CHECK (status IN ('Applied','Viewed','Interview','Offered','Rejected')),
  resume_used     TEXT,  -- the tailored resume text used
  cover_letter    TEXT,
  sponsor_verified BOOLEAN DEFAULT true,
  auto_applied    BOOLEAN DEFAULT false,
  notes           TEXT,
  applied_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. JOB CACHE (scraped jobs stored here)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_cache (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id     TEXT UNIQUE,
  job_title       TEXT NOT NULL,
  company         TEXT NOT NULL,
  location        TEXT,
  description     TEXT,
  requirements    TEXT[],
  salary_range    TEXT,
  job_url         TEXT NOT NULL,
  job_board       TEXT,
  sponsor_verified BOOLEAN DEFAULT false,
  sponsor_tier    TEXT,
  posted_at       TIMESTAMPTZ,
  scraped_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- ─────────────────────────────────────────
-- 4. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL
             CHECK (type IN ('application_sent','interview_invite','job_viewed','match_found','ats_complete','weekly_summary')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  read       BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 5. ENGINE PREFERENCES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engine_preferences (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  max_apps_per_day    INT  DEFAULT 10,
  min_match_score     INT  DEFAULT 70,
  preferred_locations TEXT[] DEFAULT '{"London"}',
  target_streams      TEXT[] DEFAULT '{}',
  job_boards          TEXT[] DEFAULT '{"LinkedIn","Indeed","Reed"}',
  auto_submit         BOOLEAN DEFAULT true,
  email_alerts        BOOLEAN DEFAULT true,
  engine_active       BOOLEAN DEFAULT true,
  last_run_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 6. AUTO-UPDATE updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_master_profiles_updated ON master_profiles;
CREATE TRIGGER trg_master_profiles_updated
  BEFORE UPDATE ON master_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated ON applications;
CREATE TRIGGER trg_applications_updated
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_engine_prefs_updated ON engine_preferences;
CREATE TRIGGER trg_engine_prefs_updated
  BEFORE UPDATE ON engine_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 7. INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_user    ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status  ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_date    ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_job_cache_expires    ON job_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_cache_verified   ON job_cache(sponsor_verified);

-- ─────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE master_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cache          ENABLE ROW LEVEL SECURITY;

-- master_profiles: own row only
DROP POLICY IF EXISTS "users_own_profile" ON master_profiles;
CREATE POLICY "users_own_profile" ON master_profiles
  FOR ALL USING (auth.uid() = user_id);

-- applications: own rows only
DROP POLICY IF EXISTS "users_own_applications" ON applications;
CREATE POLICY "users_own_applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

-- notifications: own rows only
DROP POLICY IF EXISTS "users_own_notifications" ON notifications;
CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- engine_preferences: own row only
DROP POLICY IF EXISTS "users_own_prefs" ON engine_preferences;
CREATE POLICY "users_own_prefs" ON engine_preferences
  FOR ALL USING (auth.uid() = user_id);

-- job_cache: readable by all authenticated users (shared cache)
DROP POLICY IF EXISTS "all_read_jobs" ON job_cache;
CREATE POLICY "all_read_jobs" ON job_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- service_role can write to job_cache (for scraper)
DROP POLICY IF EXISTS "service_write_jobs" ON job_cache;
CREATE POLICY "service_write_jobs" ON job_cache
  FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────
-- 9. AUTO-CREATE engine prefs on signup
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO engine_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────
-- MIGRATION: Add IR35 + contract type columns to job_cache
-- Run this if you already ran schema.sql previously
-- ─────────────────────────────────────────
ALTER TABLE job_cache ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'permanent';
ALTER TABLE job_cache ADD COLUMN IF NOT EXISTS ir35_status   TEXT DEFAULT 'permanent';
ALTER TABLE job_cache ADD COLUMN IF NOT EXISTS posted_days_ago INT DEFAULT 7;
ALTER TABLE job_cache ADD COLUMN IF NOT EXISTS match_score   INT DEFAULT 0;

-- Index for fast IR35 filtering
CREATE INDEX IF NOT EXISTS idx_job_cache_ir35     ON job_cache(ir35_status);
CREATE INDEX IF NOT EXISTS idx_job_cache_contract ON job_cache(contract_type);

-- ─────────────────────────────────────────
-- MIGRATION v2: New profile fields
-- Run in Supabase → SQL Editor
-- Safe to re-run (IF NOT EXISTS on all)
-- ─────────────────────────────────────────
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS visa_expiry    DATE;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS uk_address     TEXT;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS uk_postcode    TEXT;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS salary_type    TEXT DEFAULT 'annual';
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS salary_min     INT;
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS salary_max     INT;

-- years_experience already exists as INT, upgrade to TEXT for "1–2 years" format
ALTER TABLE master_profiles ALTER COLUMN years_experience TYPE TEXT USING years_experience::TEXT;