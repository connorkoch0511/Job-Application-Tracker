-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Resumes: stores the most recent uploaded resume
create table resumes (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  content text not null,       -- extracted plain text from the uploaded file
  uploaded_at timestamptz not null default now()
);

-- Jobs: scraped listings from LinkedIn and Indeed
create table jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('linkedin', 'indeed')),
  external_id text not null,   -- source-specific ID to prevent duplicate inserts
  title text not null,
  company text not null,
  location text,
  description text,
  url text not null,
  posted_at timestamptz,
  scraped_at timestamptz not null default now(),
  score numeric(5,2),          -- LLM match score 0–100
  score_reasoning text,        -- LLM explanation for the score
  scored_at timestamptz,
  unique (source, external_id)
);

-- Applications: tracks which jobs you've acted on
create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  status text not null default 'interested'
    check (status in ('interested', 'applied', 'interviewing', 'rejected', 'offer')),
  notes text,
  applied_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Index for fast score-sorted job listing
create index jobs_score_idx on jobs (score desc nulls last);
-- Index for filtering by source
create index jobs_source_idx on jobs (source);
-- Index for looking up applications by job
create index applications_job_id_idx on applications (job_id);
