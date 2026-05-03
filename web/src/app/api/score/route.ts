import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCORE_PROMPT = `You are an expert career coach performing a detailed evaluation of how well a candidate's resume matches a job listing.

Resume:
{resume}

Job Title: {title}
Company: {company}
Job Description:
{description}

Evaluate across ALL of the following dimensions:

1. TECHNICAL SKILLS — Which required languages, frameworks, and tools does the candidate have? Which are missing?
2. YEARS OF EXPERIENCE — Estimate the candidate's total years of relevant experience from their resume. Does it meet the job's stated requirements?
3. SENIORITY MATCH — Compare the job's seniority level (junior/mid/senior/staff/principal) to what the candidate's resume suggests.
4. JOB TITLE ALIGNMENT — Based on the candidate's resume, is this the type of role they should be targeting, or is it a mismatch with their career path?
5. COMPENSATION FIT — If the job mentions a salary or pay range, assess whether it is appropriate for the candidate's experience level. If no salary is mentioned, state that.
6. DOMAIN FIT — Does the candidate have relevant industry or domain experience?

Score from 0 to 100:
- 90-100: Exceptional match — apply immediately
- 70-89: Strong match — worth applying with tailored materials
- 50-69: Partial match — significant gaps but worth considering
- 0-49: Poor match — major missing requirements

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "reasoning": "<1 sentence overall verdict>",
  "why_apply": "<2-3 sentences on the strongest reasons this candidate should apply, referencing specific skills and experience>",
  "gaps": "<1-2 sentences on the most critical missing requirements, or 'No significant gaps identified' if score is 80+>",
  "keyword_matches": "<comma-separated list of required skills/technologies from the job posting that ARE present in the resume>",
  "keyword_gaps": "<comma-separated list of required skills/technologies from the job posting that are NOT in the resume>",
  "experience_fit": "<1 sentence: estimate the candidate's years of experience and whether it meets the job requirements>",
  "title_match": "<1 sentence: does this job title align with the candidate's career trajectory and the type of roles their resume targets?>"
}`;

async function scoreJob(resume: string, job: { title: string; company: string; description: string | null }) {
  const prompt = SCORE_PROMPT
    .replace("{resume}", resume.slice(0, 3000))
    .replace("{title}", job.title)
    .replace("{company}", job.company)
    .replace("{description}", (job.description ?? "No description provided").slice(0, 3000));

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content ?? "{}");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: resumeData } = await supabase
    .from("resumes")
    .select("content")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (!resumeData?.length) {
    return NextResponse.json({ error: "No resume found. Upload one first." }, { status: 400 });
  }
  const resume = resumeData[0].content;

  const { jobIds } = await req.json();

  // jobIds = array of specific IDs to score; if omitted, score all
  const query = supabase.from("jobs").select("id, title, company, description");
  const { data: jobs } = jobIds?.length
    ? await query.in("id", jobIds)
    : await query;

  if (!jobs?.length) return NextResponse.json({ error: "No jobs found" }, { status: 404 });

  const results = [];
  for (const job of jobs) {
    try {
      const scored = await scoreJob(resume, job);
      await supabase.from("user_job_scores").upsert({
        user_id: user.id,
        job_id: job.id,
        score: parseFloat(scored.score),
        score_reasoning: scored.reasoning ?? "",
        why_apply: scored.why_apply ?? "",
        gaps: scored.gaps ?? "",
        keyword_matches: scored.keyword_matches ?? "",
        keyword_gaps: scored.keyword_gaps ?? "",
        experience_fit: scored.experience_fit ?? "",
        title_match: scored.title_match ?? "",
        scored_at: new Date().toISOString(),
      }, { onConflict: "user_id,job_id" });
      results.push({ id: job.id, score: scored.score });
    } catch (e) {
      results.push({ id: job.id, error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
