-- Job Application Tracker — Neon Postgres schema.
--
-- Run once against your Neon database (psql "$DATABASE_URL" -f db/migrations/001_schema.sql).
-- There is no Row Level Security here: Neon has no auth layer, so ownership is
-- enforced in application code — every query is scoped by user_id, which is the
-- Clerk user id (text, e.g. "user_2abc..."), not a UUID.

create extension if not exists "pgcrypto";

-- Resumes: one row per uploaded file; the latest per user is the active resume.
create table if not exists resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  filename    text not null,
  content     text not null,           -- extracted plain text
  uploaded_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on resumes (user_id, uploaded_at desc);

-- Jobs: scraped listings, shared across all users (not user-scoped).
create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  external_id text not null,            -- source-specific id, prevents duplicates
  title       text not null,
  company     text not null,
  location    text,
  description text,
  url         text not null,
  posted_at   timestamptz,
  scraped_at  timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists jobs_source_idx on jobs (source);
create index if not exists jobs_posted_at_idx on jobs (posted_at desc nulls last);
create index if not exists jobs_scraped_at_idx on jobs (scraped_at);

-- Applications: a user's pipeline. One application per (user, job).
create table if not exists applications (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  job_id     uuid not null references jobs (id) on delete cascade,
  status     text not null default 'interested'
    check (status in ('interested', 'applied', 'interviewing', 'rejected', 'offer')),
  notes      text,
  applied_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists applications_user_id_idx on applications (user_id);
create index if not exists applications_job_id_idx on applications (job_id);

-- Per-user search preferences (keywords + locations).
create table if not exists user_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null unique,
  keywords   text not null default '',
  location   text not null default '',
  updated_at timestamptz not null default now()
);

-- Per-user LLM match scores. One score per (user, job); rescoring upserts.
create table if not exists user_job_scores (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  job_id          uuid not null references jobs (id) on delete cascade,
  score           numeric(5,2),
  score_reasoning text,
  why_apply       text,
  gaps            text,
  keyword_matches text default '',
  keyword_gaps    text default '',
  experience_fit  text default '',
  title_match     text default '',
  resume_tips     text,
  salary          text,
  career_growth   text,
  scored_at       timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists user_job_scores_user_id_idx on user_job_scores (user_id);
create index if not exists user_job_scores_job_id_idx on user_job_scores (job_id);
create index if not exists user_job_scores_scored_at_idx on user_job_scores (scored_at);
