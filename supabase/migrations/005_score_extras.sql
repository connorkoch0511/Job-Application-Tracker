ALTER TABLE user_job_scores
  ADD COLUMN IF NOT EXISTS resume_tips TEXT,
  ADD COLUMN IF NOT EXISTS salary TEXT,
  ADD COLUMN IF NOT EXISTS career_growth TEXT,
  ADD COLUMN IF NOT EXISTS application_urgency TEXT;
