# Job Application Tracker

An AI-powered job tracker that scrapes remote listings daily, scores them against your resume using an LLM, and surfaces the roles most worth your time.

## Features

- **Automated daily scraping** — pulls new listings from RemoteOK and Remotive via GitHub Actions cron
- **LLM resume matching** — scores each job 0–100 against your resume using Groq's LLaMA 3.1, with a "Why Apply" summary and "Gaps to Address" breakdown
- **Per-user scoring** — every user uploads their own resume and gets personalized scores; scores are never shared between accounts
- **In-browser scoring** — score all jobs at once or trigger scoring on a single listing without leaving the UI
- **Application pipeline** — track jobs through Interested → Applied → Interviewing → Rejected / Offer
- **Daily email digest** — Vercel cron sends a morning summary of your top-scored new listings (SMTP configurable)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| LLM | Groq API — `llama-3.1-8b-instant` |
| Scraping | Python — RemoteOK API, Remotive API |
| Cron (scrape) | GitHub Actions — daily at 9am UTC |
| Cron (digest) | Vercel Cron — daily at 8am UTC |
| Deployment | Vercel |

## How It Works

```
GitHub Actions (daily)
  └─ scraper/main.py        # fetches new jobs → upserts to `jobs` table
  └─ scorer/main.py         # scores new jobs for every user with a resume
                            # → writes to `user_job_scores` table

User (browser)
  └─ uploads resume         # POST /api/resume → stored in `resumes` table
  └─ clicks "Score All"     # POST /api/score  → Groq LLM → user_job_scores
  └─ marks as applied       # upserts to `applications` table
```

Scoring uses a structured prompt that evaluates technical skill alignment, experience level, domain fit, and seniority match. The model responds with a JSON object containing the numeric score, reasoning, personalized "why apply" text, and skill gaps. Both the resume and job description are truncated to 3,000 characters to stay within free-tier token limits.

## Project Structure

```
.
├── .github/workflows/
│   └── scrape_and_score.yml   # daily GitHub Actions job
├── scraper/
│   ├── main.py                # orchestrates both scrapers
│   ├── linkedin.py            # RemoteOK API client
│   ├── indeed.py              # Remotive API client
│   └── requirements.txt
├── scorer/
│   ├── main.py                # scores unscored jobs for all users
│   └── requirements.txt
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_add_scoring_fields.sql
└── web/                       # Next.js app
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # job listings + scoring UI
    │   │   ├── applications/      # application pipeline
    │   │   ├── resume/            # resume upload
    │   │   ├── login/ signup/     # auth pages
    │   │   └── api/
    │   │       ├── score/         # LLM scoring endpoint
    │   │       ├── resume/        # resume upload + PDF extraction
    │   │       └── digest/        # email digest cron endpoint
    │   ├── components/NavBar.tsx
    │   ├── lib/
    │   │   ├── supabase-browser.ts
    │   │   └── supabase-server.ts
    │   └── middleware.ts          # auth route protection
    └── vercel.json
```

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free tier)

### 1. Database

Run the following SQL files in order in your Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_scoring_fields.sql
```

Then run this SQL to add auth support:

```sql
-- Add user_id to resumes
alter table resumes add column if not exists user_id uuid references auth.users(id);

-- Add user_id to applications
alter table applications add column if not exists user_id uuid references auth.users(id);

-- Per-user scores table
create table if not exists user_job_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  score numeric(5,2),
  score_reasoning text,
  why_apply text,
  gaps text,
  scored_at timestamptz,
  unique(user_id, job_id)
);

-- Enable RLS
alter table resumes enable row level security;
alter table applications enable row level security;
alter table user_job_scores enable row level security;
alter table jobs enable row level security;

-- RLS policies
create policy "users see own resumes" on resumes for all using (auth.uid() = user_id);
create policy "users see own applications" on applications for all using (auth.uid() = user_id);
create policy "users see own scores" on user_job_scores for all using (auth.uid() = user_id);
create policy "all users read jobs" on jobs for select using (true);
```

In Supabase → Authentication → URL Configuration, set your Site URL to your deployed app URL and add it to the Redirect URLs list.

### 2. Web App

```bash
cd web
cp .env.local.example .env.local
# fill in the values below
npm install
npm run dev
```

**`web/.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — email digest
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=you@gmail.com
DIGEST_TO=you@gmail.com
CRON_SECRET=a-random-secret
```

### 3. Python Scraper & Scorer

```bash
pip install -r scraper/requirements.txt
pip install -r scorer/requirements.txt
```

Create a `.env` file in the project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=gsk_...
JOB_KEYWORDS=python,aws,backend
JOB_LOCATION=remote
```

Run manually:

```bash
python scraper/main.py   # fetch new listings
python scorer/main.py    # score jobs for all users who have uploaded a resume
```

## Deployment

### Vercel

1. Import the repo in [Vercel](https://vercel.com) and set the **root directory** to `web`
2. Add all environment variables from `web/.env.local`
3. The daily email digest cron is configured in `web/vercel.json` and runs automatically

### GitHub Actions (daily scraper)

Add these secrets to your repo under Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your service role key |
| `GROQ_API_KEY` | Your Groq API key |
| `JOB_KEYWORDS` | Comma-separated keywords, e.g. `python,aws` |
| `JOB_LOCATION` | e.g. `remote` |

The workflow (`.github/workflows/scrape_and_score.yml`) runs every day at 9am UTC and can also be triggered manually from the Actions tab.

## Usage

1. **Sign up** and confirm your email
2. Go to **Resume** and upload your resume (`.pdf` or `.txt`)
3. Go to **Jobs** and click **Score All Jobs** — the LLM will evaluate every listing against your resume
4. Browse results sorted by match score; each card shows why you should apply and what gaps to address
5. Click **View listing →** to open the job, then **Mark as applied** to add it to your pipeline
6. Track progress in **Applications** by moving cards through the status stages
