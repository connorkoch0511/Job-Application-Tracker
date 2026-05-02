import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCORE_PROMPT = `You are a career coach evaluating how well a candidate's resume matches a job listing.

Resume:
{resume}

Job Title: {title}
Company: {company}
Job Description:
{description}

Evaluate the match across these criteria:
- Technical skills alignment (languages, frameworks, tools)
- Years and type of experience
- Domain/industry fit
- Seniority level match
- Any must-have requirements the candidate lacks

Score from 0 to 100:
- 90-100: Exceptional match — apply immediately
- 70-89: Strong match — worth applying with a tailored cover letter
- 50-69: Partial match — consider applying if you can address the gaps
- 0-49: Poor match — significant missing requirements

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "why_apply": "<2-3 sentences on the strongest reasons this candidate should apply>",
  "gaps": "<1-2 sentences on the most important missing skills, or 'No significant gaps identified' if score is 80+>",
  "reasoning": "<1 sentence overall verdict>"
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

  // Get user's latest resume
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

  const { jobId } = await req.json();

  // Fetch jobs to score
  const query = supabase.from("jobs").select("id, title, company, description");
  const { data: jobs } = jobId
    ? await query.eq("id", jobId)
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
        scored_at: new Date().toISOString(),
      }, { onConflict: "user_id,job_id" });
      results.push({ id: job.id, score: scored.score });
    } catch (e) {
      results.push({ id: job.id, error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
