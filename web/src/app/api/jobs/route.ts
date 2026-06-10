import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

// Returns all jobs, each with the current user's score (if any) nested in a
// user_job_scores array to match the shape the Jobs page expects. Jobs are
// shared across users; only the score join is user-scoped.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = (await sql`
    select
      j.id, j.source, j.title, j.company, j.location, j.url, j.posted_at,
      s.score::float as score, s.score_reasoning, s.why_apply, s.gaps,
      s.keyword_matches, s.keyword_gaps, s.experience_fit, s.title_match,
      s.resume_tips, s.salary, s.career_growth
    from jobs j
    left join user_job_scores s on s.job_id = j.id and s.user_id = ${userId}
    order by j.posted_at desc nulls last
  `) as Record<string, unknown>[];

  const jobs = rows.map((r) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    company: r.company,
    location: r.location,
    url: r.url,
    posted_at: r.posted_at,
    user_job_scores:
      r.score === null || r.score === undefined
        ? []
        : [
            {
              score: r.score,
              score_reasoning: r.score_reasoning,
              why_apply: r.why_apply,
              gaps: r.gaps,
              keyword_matches: r.keyword_matches,
              keyword_gaps: r.keyword_gaps,
              experience_fit: r.experience_fit,
              title_match: r.title_match,
              resume_tips: r.resume_tips,
              salary: r.salary,
              career_growth: r.career_growth,
            },
          ],
  }));

  return NextResponse.json({ jobs });
}
