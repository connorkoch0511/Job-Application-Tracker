import os
import json
import time
from dotenv import load_dotenv
from groq import Groq
import psycopg
from psycopg.rows import dict_row

load_dotenv(override=True)

DATABASE_URL = os.environ["DATABASE_URL"]
GROQ_API_KEY = os.environ["GROQ_API_KEY"]

client_groq = Groq(api_key=GROQ_API_KEY)

SCORE_PROMPT = """
You are an expert career coach performing a strict, honest evaluation of how well a candidate's resume matches a job listing. Do not be generous — if the candidate falls short of a requirement, say so clearly and penalize the score accordingly.

Resume:
{resume}

Job Title: {title}
Company: {company}
Job Description:
{description}

Evaluate across ALL of the following dimensions:

1. TECHNICAL SKILLS — Which required languages, frameworks, and tools does the candidate have? Which are missing?
2. YEARS OF EXPERIENCE — Count the candidate's total years of relevant professional experience from their resume dates. State the exact number. If the job requires more years than the candidate has, this is a significant gap and MUST lower the score by at least 15 points. Do not round up or give benefit of the doubt on experience.
3. SENIORITY MATCH — Compare the job's seniority level (junior/mid/senior/staff/principal) to what the candidate's resume suggests. A junior candidate applying to a senior role is a poor match.
4. JOB TITLE ALIGNMENT — Based on the candidate's resume, is this the type of role they should be targeting?
5. SALARY — If the job description mentions a specific salary, pay range, or compensation, extract it exactly (e.g. "$120,000–$150,000/yr" or "$45/hr"). If no salary is mentioned, return null.
6. CAREER GROWTH — Is this role a step up, lateral move, or step down for the candidate based on their current trajectory?
7. DOMAIN FIT — Does the candidate have relevant industry or domain experience?

Score from 0 to 100 — be strict:
- 90-100: Exceptional match — meets all requirements
- 70-89: Strong match — minor gaps only
- 50-69: Partial match — notable gaps (missing skills or experience shortfall of 1-2 years)
- 30-49: Weak match — significant gaps (missing key skills or experience shortfall of 3+ years)
- 0-29: Poor match — major missing requirements

Respond ONLY with valid JSON in this exact format:
{{
  "score": <number 0-100>,
  "reasoning": "<1 sentence overall verdict>",
  "why_apply": "<2-3 sentences on the strongest reasons this candidate should apply>",
  "gaps": "<1-2 sentences on the most critical missing requirements. If experience is short, state exactly how many years short they are.>",
  "keyword_matches": "<comma-separated list of required skills/technologies from the job posting that ARE present in the resume>",
  "keyword_gaps": "<comma-separated list of required skills/technologies from the job posting that are NOT in the resume>",
  "experience_fit": "<1 sentence: state the candidate's exact years of experience vs. the job's requirement, and whether they meet it>",
  "title_match": "<1 sentence: does this job title align with the candidate's career trajectory?>",
  "resume_tips": "<2-3 specific, actionable changes the candidate should make to their resume to improve their chances for THIS job (e.g. 'Add metrics to your project descriptions', 'Highlight your AWS experience in the summary')>",
  "salary": "<extracted salary/range from the job description, or null if not mentioned>",
  "career_growth": "<1 sentence: is this a step up, lateral move, or step down based on their current level and trajectory?>"
}}
"""


def score_job(resume: str, job: dict) -> dict:
    resume_trunc = resume[:3000]
    description_trunc = job.get("description", "No description provided")[:3000]

    prompt = SCORE_PROMPT.format(
        resume=resume_trunc,
        title=job["title"],
        company=job["company"],
        description=description_trunc,
    )

    response = client_groq.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    parsed = json.loads(response.choices[0].message.content)
    return {
        "score": float(parsed["score"]),
        "score_reasoning": parsed.get("reasoning", ""),
        "why_apply": parsed.get("why_apply", ""),
        "gaps": parsed.get("gaps", ""),
        "keyword_matches": parsed.get("keyword_matches", ""),
        "keyword_gaps": parsed.get("keyword_gaps", ""),
        "experience_fit": parsed.get("experience_fit", ""),
        "title_match": parsed.get("title_match", ""),
        "resume_tips": parsed.get("resume_tips", ""),
        "salary": parsed.get("salary") or "",
        "career_growth": parsed.get("career_growth", ""),
    }


UPSERT_SQL = """
insert into user_job_scores (
  user_id, job_id, score, score_reasoning, why_apply, gaps,
  keyword_matches, keyword_gaps, experience_fit, title_match,
  resume_tips, salary, career_growth, scored_at
) values (
  %(user_id)s, %(job_id)s, %(score)s, %(score_reasoning)s, %(why_apply)s, %(gaps)s,
  %(keyword_matches)s, %(keyword_gaps)s, %(experience_fit)s, %(title_match)s,
  %(resume_tips)s, %(salary)s, %(career_growth)s, now()
)
on conflict (user_id, job_id) do update set
  score = excluded.score,
  score_reasoning = excluded.score_reasoning,
  why_apply = excluded.why_apply,
  gaps = excluded.gaps,
  keyword_matches = excluded.keyword_matches,
  keyword_gaps = excluded.keyword_gaps,
  experience_fit = excluded.experience_fit,
  title_match = excluded.title_match,
  resume_tips = excluded.resume_tips,
  salary = excluded.salary,
  career_growth = excluded.career_growth,
  scored_at = excluded.scored_at
"""


def run():
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)

    # Get all users who have uploaded a resume — latest resume per user.
    # distinct on keeps the first row per user_id given the ordering below.
    user_resumes = conn.execute(
        """
        select distinct on (user_id) user_id, content, uploaded_at
        from resumes
        where user_id is not null
        order by user_id, uploaded_at desc
        """
    ).fetchall()

    if not user_resumes:
        print("No resumes found. Users must upload one via the web UI first.")
        return

    print(f"Found {len(user_resumes)} user(s) with resumes.")

    # Get all jobs
    all_jobs = conn.execute("select id, title, company, description from jobs").fetchall()
    print(f"Total jobs in database: {len(all_jobs)}")

    for user_row in user_resumes:
        user_id = user_row["user_id"]
        resume_text = user_row["content"]

        print(f"\nProcessing user {user_id}")

        # Load this user's keyword preferences
        prefs_row = conn.execute(
            "select keywords from user_preferences where user_id = %s limit 1",
            [user_id],
        ).fetchone()
        keywords_raw = (prefs_row["keywords"] if prefs_row else "") or ""
        keywords = [k.strip().lower() for k in keywords_raw.split(",") if k.strip()]

        try:
            scored_rows = conn.execute(
                "select job_id from user_job_scores where user_id = %s",
                [user_id],
            ).fetchall()
        except Exception as e:
            print(f"  Skipping: failed to query scores — {e}")
            continue

        scored_job_ids = {row["job_id"] for row in scored_rows}

        # Filter to unscored jobs; if user has keywords, score jobs that match
        # in the title, in the description, or have no description (LinkedIn jobs
        # fetched via keyword search are already pre-filtered at the source).
        candidate_jobs = [j for j in all_jobs if j["id"] not in scored_job_ids]
        if keywords:
            def matches(job):
                title = (job.get("title") or "").lower()
                desc = (job.get("description") or "").lower()
                if not desc:
                    # No description (LinkedIn) — require keyword in title only
                    return any(kw in title for kw in keywords)
                # Has description — match title or description
                return any(kw in title or kw in desc for kw in keywords)
            candidate_jobs = [j for j in candidate_jobs if matches(j)]

        # Cap at 50 per run to avoid excessive API usage
        unscored = candidate_jobs[:50]
        print(f"  Keywords: {keywords or 'none (scoring all)'} | Scoring {len(unscored)} jobs...")

        for i, job in enumerate(unscored):
            try:
                result = score_job(resume_text, job)
                conn.execute(UPSERT_SQL, {"user_id": user_id, "job_id": job["id"], **result})
                print(f"  [{result['score']:.1f}] {job['title']} @ {job['company']}")
            except Exception as e:
                print(f"  Error scoring {job['title']}: {e}")
            if i < len(unscored) - 1:
                time.sleep(2)

    print("\nScoring complete.")


if __name__ == "__main__":
    run()
