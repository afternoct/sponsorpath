-- ═══════════════════════════════════════════════════════════════════
-- SPONSORPATH — PRODUCTION DATABASE SCHEMA
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  linkedin_url        TEXT,
  
  -- Visa & Location
  visa_status         TEXT,
  visa_expiry         DATE,
  location_city       TEXT DEFAULT 'London',
  uk_address          TEXT,
  uk_postcode         TEXT,
  radius_km           INT DEFAULT 50,
  remote_pref         TEXT CHECK (remote_pref IN ('office','hybrid','remote','any')) DEFAULT 'any',
  
  -- Job preferences
  target_roles        TEXT[] DEFAULT '{}',
  salary_min          INT,
  salary_max          INT,
  salary_type         TEXT CHECK (salary_type IN ('annual','day')) DEFAULT 'annual',
  notice_period       TEXT,
  
  -- Profile completion
  profile_complete    BOOLEAN DEFAULT false,
  completion_pct      INT DEFAULT 0,
  missing_fields      TEXT[] DEFAULT '{}',
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. PROFILE SKILLS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_skills (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill               TEXT NOT NULL,
  years_experience    TEXT,
  proficiency         TEXT CHECK (proficiency IN ('beginner','intermediate','expert')) DEFAULT 'intermediate',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_skills_user ON profile_skills(user_id);

-- ─────────────────────────────────────────
-- 3. PROFILE EXPERIENCE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_experience (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company             TEXT NOT NULL,
  title               TEXT NOT NULL,
  start_date          DATE,
  end_date            DATE,
  is_current          BOOLEAN DEFAULT false,
  bullets_json        JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_experience_user ON profile_experience(user_id);

-- ─────────────────────────────────────────
-- 4. CVS (Version Control System)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cvs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Storage
  storage_url         TEXT,
  parsed_json         JSONB,
  raw_text            TEXT,
  
  -- Version type
  version_type        TEXT CHECK (version_type IN ('base','fixed','tailored')) DEFAULT 'base',
  base_cv_id          UUID REFERENCES cvs(id) ON DELETE SET NULL,
  job_id              UUID, -- references jobs.id (soft ref)
  
  -- ATS Score
  ats_score           INT DEFAULT 0,
  ats_grade           TEXT CHECK (ats_grade IN ('Excellent','Good','Fair','Poor')) DEFAULT 'Poor',
  issues_json         JSONB DEFAULT '[]',
  fixes_applied       TEXT[] DEFAULT '{}',
  
  -- Preview
  preview_html        TEXT,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cvs_user ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_version_type ON cvs(version_type);
CREATE INDEX IF NOT EXISTS idx_cvs_base ON cvs(base_cv_id);

-- ─────────────────────────────────────────
-- 5. EMPLOYERS (Sponsor Register)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employers (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL UNIQUE,
  normalized_name     TEXT NOT NULL UNIQUE,
  
  -- Sponsor status
  sponsor_status      TEXT CHECK (sponsor_status IN ('confirmed','likely','unknown','unlikely')) DEFAULT 'unknown',
  sponsor_confidence  INT DEFAULT 0, -- 0-100
  confidence_override INT, -- Manual override
  
  -- Metadata
  industry            TEXT,
  size                TEXT,
  location            TEXT,
  
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employers_sponsor ON employers(sponsor_status);
CREATE INDEX IF NOT EXISTS idx_employers_normalized ON employers(normalized_name);

-- ─────────────────────────────────────────
-- 6. JOBS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Job details
  title               TEXT NOT NULL,
  company             TEXT NOT NULL,
  company_normalized  TEXT NOT NULL,
  employer_id         UUID REFERENCES employers(id) ON DELETE SET NULL,
  
  location            TEXT,
  salary_min          INT,
  salary_max          INT,
  contract_type       TEXT CHECK (contract_type IN ('permanent','contract')) DEFAULT 'permanent',
  
  description         TEXT,
  requirements        TEXT[] DEFAULT '{}',
  
  -- Source
  source              TEXT, -- 'reed', 'indeed', 'linkedin', 'direct'
  source_url          TEXT,
  external_id         TEXT UNIQUE,
  
  -- Dates
  posted_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  ingested_at         TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sponsor flags
  sponsor_verified    BOOLEAN DEFAULT false,
  sponsor_confidence  INT DEFAULT 0,
  ir35_status         TEXT CHECK (ir35_status IN ('inside','outside','n/a')) DEFAULT 'n/a',
  
  -- Metadata
  tags_json           JSONB DEFAULT '[]',
  active              BOOLEAN DEFAULT true,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_company_normalized ON jobs(company_normalized);
CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_sponsor ON jobs(sponsor_verified);
CREATE INDEX IF NOT EXISTS idx_jobs_contract ON jobs(contract_type);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(active);
CREATE INDEX IF NOT EXISTS idx_jobs_external ON jobs(external_id);

-- ─────────────────────────────────────────
-- 7. JOB MATCHES (Fit Scores)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_matches (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id              UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Match breakdown
  fit_score           INT DEFAULT 0, -- Overall 0-100
  skill_match         INT DEFAULT 0,
  title_match         INT DEFAULT 0,
  visa_factor         INT DEFAULT 0,
  salary_alignment    INT DEFAULT 0,
  location_score      INT DEFAULT 0,
  
  -- Details
  matched_skills_json JSONB DEFAULT '[]',
  missing_skills_json JSONB DEFAULT '[]',
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_score ON job_matches(fit_score DESC);

-- ─────────────────────────────────────────
-- 8. APPLICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,
  cv_id_used          UUID REFERENCES cvs(id) ON DELETE SET NULL,
  
  -- Application details
  job_title           TEXT NOT NULL,
  company             TEXT NOT NULL,
  location            TEXT,
  job_url             TEXT,
  
  -- Status tracking
  status              TEXT CHECK (status IN ('applied','in_review','interview','offer','rejected')) DEFAULT 'applied',
  applied_at          TIMESTAMPTZ DEFAULT NOW(),
  viewed_at           TIMESTAMPTZ,
  interview_at        TIMESTAMPTZ,
  response_at         TIMESTAMPTZ,
  
  -- Follow-up
  follow_up_at        TIMESTAMPTZ,
  reminder_sent       BOOLEAN DEFAULT false,
  
  -- Notes
  notes               TEXT,
  cover_letter        TEXT,
  tailored_cv_text    TEXT,
  
  -- Tracking
  auto_applied        BOOLEAN DEFAULT false,
  tracking_webhook    TEXT, -- Unique webhook URL for this application
  tracking_token      TEXT UNIQUE, -- Token in email signature
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_token ON applications(tracking_token);

-- ─────────────────────────────────────────
-- 9. APPLICATION EVENTS (Response Tracking)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_events (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id      UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  
  event_type          TEXT NOT NULL, -- 'email_opened', 'link_clicked', 'response_received'
  event_data          JSONB,
  
  ip_address          TEXT,
  user_agent          TEXT,
  
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_application_events_app ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_application_events_type ON application_events(event_type);

-- ─────────────────────────────────────────
-- 10. REAL CHANCES CACHE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS real_chances_cache (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Input hash (to cache results)
  input_hash          TEXT NOT NULL,
  
  -- Results
  overall_score       INT NOT NULL,
  breakdown_json      JSONB NOT NULL, -- {skill_match, market_demand, visa_factor, salary_alignment, cv_quality}
  reasons             TEXT[] DEFAULT '{}',
  improvements        JSONB DEFAULT '[]', -- [{fix: "...", impact: "+10%"}]
  
  expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, input_hash)
);
CREATE INDEX IF NOT EXISTS idx_real_chances_user ON real_chances_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_real_chances_expires ON real_chances_cache(expires_at);

-- ─────────────────────────────────────────
-- 11. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  type                TEXT NOT NULL, -- 'application_update', 'interview_scheduled', 'cv_fixed', etc
  title               TEXT NOT NULL,
  message             TEXT,
  
  action_url          TEXT,
  action_label        TEXT,
  
  read                BOOLEAN DEFAULT false,
  priority            TEXT CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  
  data                JSONB,
  
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ─────────────────────────────────────────
-- 12. ENGINE PREFERENCES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engine_preferences (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Automation
  auto_submit         BOOLEAN DEFAULT false,
  max_apps_per_day    INT DEFAULT 10,
  min_match_score     INT DEFAULT 70,
  
  -- Notifications
  email_alerts        BOOLEAN DEFAULT true,
  weekly_digest       BOOLEAN DEFAULT true,
  
  -- Engine control
  engine_active       BOOLEAN DEFAULT true,
  last_run_at         TIMESTAMPTZ,
  
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_chances_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_preferences ENABLE ROW LEVEL SECURITY;

-- Jobs and employers are public (read-only for users)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;

-- ── Policies ──
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills" ON profile_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own experience" ON profile_experience FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own CVs" ON cvs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own matches" ON job_matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own applications" ON applications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their application events" ON application_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM applications WHERE applications.id = application_events.application_id AND applications.user_id = auth.uid())
);
CREATE POLICY "Users can view their own real chances" ON real_chances_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own preferences" ON engine_preferences FOR ALL USING (auth.uid() = user_id);

-- Jobs and employers: read-only for authenticated users
CREATE POLICY "Anyone can view active jobs" ON jobs FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view employers" ON employers FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════



-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cvs_updated_at BEFORE UPDATE ON cvs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER job_matches_updated_at BEFORE UPDATE ON job_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER employers_updated_at BEFORE UPDATE ON employers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER engine_preferences_updated_at BEFORE UPDATE ON engine_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- SEED DATA: UK SPONSOR EMPLOYERS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO employers (name, normalized_name, sponsor_status, sponsor_confidence) VALUES
  ('Revolut', 'revolut', 'confirmed', 100),
  ('Monzo', 'monzo', 'confirmed', 100),
  ('Wise', 'wise', 'confirmed', 100),
  ('Starling Bank', 'starling bank', 'confirmed', 100),
  ('Checkout.com', 'checkout.com', 'confirmed', 100),
  ('Amazon', 'amazon', 'confirmed', 100),
  ('Google', 'google', 'confirmed', 100),
  ('Meta', 'meta', 'confirmed', 100),
  ('Microsoft', 'microsoft', 'confirmed', 100),
  ('Apple', 'apple', 'confirmed', 100),
  ('Deloitte', 'deloitte', 'confirmed', 100),
  ('PwC', 'pwc', 'confirmed', 100),
  ('KPMG', 'kpmg', 'confirmed', 100),
  ('EY', 'ey', 'confirmed', 100),
  ('Accenture', 'accenture', 'confirmed', 100),
  ('HSBC', 'hsbc', 'confirmed', 100),
  ('Barclays', 'barclays', 'confirmed', 100),
  ('Lloyds', 'lloyds', 'confirmed', 100),
  ('JPMorgan', 'jpmorgan', 'confirmed', 100),
  ('Goldman Sachs', 'goldman sachs', 'confirmed', 100)
ON CONFLICT (normalized_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- UPDATED SCHEMA - Better Sponsor Handling
-- Add this to your existing schema.sql (append to bottom)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- IMPROVED EMPLOYERS TABLE
-- ─────────────────────────────────────────

-- Add indexes for faster sponsor matching
CREATE INDEX IF NOT EXISTS idx_employers_normalized_search ON employers USING GIN (to_tsvector('english', normalized_name));
CREATE INDEX IF NOT EXISTS idx_employers_status_confidence ON employers(sponsor_status, sponsor_confidence);
CREATE INDEX IF NOT EXISTS idx_employers_updated ON employers(updated_at DESC);

-- Add function to auto-verify sponsors based on company name
CREATE OR REPLACE FUNCTION verify_sponsor(company_name TEXT)
RETURNS TABLE(verified BOOLEAN, confidence INT, employer_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (e.sponsor_status = 'confirmed') as verified,
    COALESCE(e.sponsor_confidence, 0) as confidence,
    e.id as employer_id
  FROM employers e
  WHERE 
    e.normalized_name = LOWER(TRIM(REGEXP_REPLACE(company_name, '[^a-zA-Z0-9\s]', '', 'g')))
    OR e.normalized_name LIKE '%' || LOWER(TRIM(REGEXP_REPLACE(company_name, '[^a-zA-Z0-9\s]', '', 'g'))) || '%'
  ORDER BY e.sponsor_confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add sync log table
CREATE TABLE IF NOT EXISTS sponsor_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_started_at TIMESTAMPTZ DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  total_sponsors INT,
  imported INT,
  errors INT,
  status TEXT CHECK (status IN ('running','completed','failed')) DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_sync_log_created ON sponsor_sync_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- SEED DATA - Just 20 high-priority sponsors for immediate use
-- Daily cron will sync full 30,000+ list from UK Home Office
-- ═══════════════════════════════════════════════════════════════════

-- Clear existing seed data
TRUNCATE TABLE employers CASCADE;

-- Insert 20 top sponsors (Tech + Finance + Consulting)
INSERT INTO employers (name, normalized_name, sponsor_status, sponsor_confidence, industry, location) VALUES
  -- Tech
  ('Revolut Ltd', 'revolut', 'confirmed', 100, 'Fintech', 'London'),
  ('Monzo Bank Limited', 'monzo bank', 'confirmed', 100, 'Fintech', 'London'),
  ('Wise Payments Limited', 'wise payments', 'confirmed', 100, 'Fintech', 'London'),
  ('Starling Bank Limited', 'starling bank', 'confirmed', 100, 'Fintech', 'London'),
  ('Checkout.com', 'checkout com', 'confirmed', 100, 'Fintech', 'London'),
  ('Amazon UK Services Ltd', 'amazon uk services', 'confirmed', 100, 'Technology', 'London'),
  ('Google UK Limited', 'google uk', 'confirmed', 100, 'Technology', 'London'),
  ('Meta Platforms Ireland Limited', 'meta platforms ireland', 'confirmed', 100, 'Technology', 'London'),
  ('Microsoft Limited', 'microsoft', 'confirmed', 100, 'Technology', 'Reading'),
  ('Apple Retail UK Limited', 'apple retail uk', 'confirmed', 100, 'Technology', 'London'),
  
  -- Finance
  ('HSBC UK Bank plc', 'hsbc uk bank', 'confirmed', 100, 'Banking', 'London'),
  ('Barclays Bank UK PLC', 'barclays bank uk', 'confirmed', 100, 'Banking', 'London'),
  ('Lloyds Banking Group plc', 'lloyds banking group', 'confirmed', 100, 'Banking', 'London'),
  ('JPMorgan Chase Bank', 'jpmorgan chase bank', 'confirmed', 100, 'Banking', 'London'),
  ('Goldman Sachs International', 'goldman sachs international', 'confirmed', 100, 'Banking', 'London'),
  
  -- Consulting
  ('Deloitte LLP', 'deloitte', 'confirmed', 100, 'Consulting', 'London'),
  ('PricewaterhouseCoopers LLP', 'pricewaterhousecoopers', 'confirmed', 100, 'Consulting', 'London'),
  ('KPMG LLP', 'kpmg', 'confirmed', 100, 'Consulting', 'London'),
  ('Ernst & Young LLP', 'ernst young', 'confirmed', 100, 'Consulting', 'London'),
  ('Accenture (UK) Limited', 'accenture uk', 'confirmed', 100, 'Consulting', 'London')
ON CONFLICT (normalized_name) DO UPDATE SET
  sponsor_status = EXCLUDED.sponsor_status,
  sponsor_confidence = EXCLUDED.sponsor_confidence,
  industry = EXCLUDED.industry,
  location = EXCLUDED.location,
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════