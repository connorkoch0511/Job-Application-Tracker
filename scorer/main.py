import os
import json
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from groq import Groq
from supabase import create_client

load_dotenv(override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
GROQ_API_KEY = os.environ["GROQ_API_KEY"]

client_groq = Groq(api_key=GROQ_API_KEY)

SCORE_PROMPT = """
You are a recruiter evaluating how well a candidate's resume matches a job listing.

Resume:
{resume}

Job Title: {title}
Company: {company}
Job Description:
{description}

Score how well this resume matches the job on a scale from 0 to 100, where:
- 90-100: Exceptional match, candidate is highly qualified
- 70-89: Good match, candidate meets most requirements
- 50-69: Moderate match, candidate meets some requirements
- 0-49: Poor match, significant gaps

Respond ONLY with valid JSON in this exact format:
{{
  "score": <number 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>"
}}
"""


def score_job(resume: str, job: dict) -> tuple[float, str]:
    # Truncate to stay within the 6000 TPM free tier limit (~4 chars per token)
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
    return float(parsed["score"]), parsed["reasoning"]


def run():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    resume_result = (
        client.table("resumes")
        .select("content")
        .order("uploaded_at", desc=True)
        .limit(1)
        .execute()
    )
    if not resume_result.data:
        print("No resume found. Upload one via the web UI first.")
        return

    resume_text = resume_result.data[0]["content"]

    jobs_result = (
        client.table("jobs")
        .select("id, title, company, description")
        .is_("score", "null")
        .execute()
    )
    jobs = jobs_result.data
    print(f"Scoring {len(jobs)} unscored jobs...")

    for i, job in enumerate(jobs):
        try:
            score, reasoning = score_job(resume_text, job)
            client.table("jobs").update({
                "score": score,
                "score_reasoning": reasoning,
                "scored_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", job["id"]).execute()
            print(f"  [{score:.1f}] {job['title']} @ {job['company']}")
        except Exception as e:
            print(f"  Error scoring {job['title']}: {e}")
        if i < len(jobs) - 1:
            time.sleep(2)

    print("Scoring complete.")


if __name__ == "__main__":
    run()
