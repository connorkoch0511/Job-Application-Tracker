"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

const SOURCE_LABELS: Record<string, string> = { linkedin: "RemoteOK", indeed: "Remotive" };

type UserScore = {
  score: number;
  score_reasoning: string | null;
  why_apply: string | null;
  gaps: string | null;
};

type Job = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  posted_at: string | null;
  user_job_scores: UserScore[];
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null)
    return <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">Unscored</span>;
  const color =
    score >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30"
    : score >= 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  const label = score >= 80 ? "Strong match" : score >= 60 ? "Partial match" : "Weak match";
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${color} shrink-0`}>
      <span className="text-2xl font-bold leading-none">{Math.round(score)}</span>
      <span className="text-xs font-medium mt-0.5">{label}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"all" | "linkedin" | "indeed">("all");
  const [scoringAll, setScoringAll] = useState(false);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoreMsg, setScoreMsg] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    let query = supabase
      .from("jobs")
      .select("id, source, title, company, location, url, posted_at, user_job_scores(score, score_reasoning, why_apply, gaps)")
      .order("posted_at", { ascending: false });
    if (source !== "all") query = query.eq("source", source);
    const { data } = await query;
    // Sort: scored jobs by score desc, unscored at the bottom
    const sorted = (data ?? []).sort((a, b) => {
      const sa = a.user_job_scores?.[0]?.score ?? -1;
      const sb = b.user_job_scores?.[0]?.score ?? -1;
      return sb - sa;
    });
    setJobs(sorted as Job[]);
    setLoading(false);
  }, [source]);

  useEffect(() => { load(); }, [load]);

  async function scoreAll() {
    setScoringAll(true);
    setScoreMsg("Scoring all jobs — this takes a few minutes...");
    const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const json = await res.json();
    if (!res.ok) { setScoreMsg(`Error: ${json.error}`); setScoringAll(false); return; }
    setScoreMsg(`Done! ${json.results.length} jobs scored.`);
    setScoringAll(false);
    load();
  }

  async function scoreOne(jobId: string) {
    setScoringId(jobId);
    const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    const json = await res.json();
    if (!res.ok) alert(`Error: ${json.error}`);
    setScoringId(null);
    load();
  }

  async function markApplied(jobId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("applications").upsert(
      { job_id: jobId, user_id: user!.id, status: "applied", applied_at: new Date().toISOString() },
      { onConflict: "job_id" }
    );
    alert("Marked as applied!");
  }

  const scored = jobs.filter((j) => j.user_job_scores?.[0]?.score != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, j) => s + j.user_job_scores[0].score, 0) / scored.length)
    : 0;
  const strongMatches = scored.filter((j) => j.user_job_scores[0].score >= 80).length;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Jobs" value={jobs.length} />
        <StatCard label="Scored" value={scored.length} />
        <StatCard label="Avg Score" value={scored.length ? avgScore : "—"} />
        <StatCard label="Strong Matches" value={strongMatches} />
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Job Listings</h2>
          <div className="flex gap-2">
            {(["all", "linkedin", "indeed"] as const).map((s) => (
              <button key={s} onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${source === s ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {s === "all" ? "All" : SOURCE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <button onClick={scoreAll} disabled={scoringAll}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {scoringAll ? "Scoring..." : "Score All Jobs"}
        </button>
      </div>

      {scoreMsg && (
        <p className={`text-sm mb-4 ${scoreMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
          {scoreMsg}
        </p>
      )}

      {loading && <p className="text-gray-400">Loading jobs...</p>}

      <div className="space-y-3">
        {jobs.map((job) => {
          const s = job.user_job_scores?.[0];
          return (
            <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {SOURCE_LABELS[job.source] ?? job.source}
                    </span>
                    {job.posted_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(job.posted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-lg leading-snug">{job.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {job.company}{job.location && ` · ${job.location}`}
                  </p>
                </div>
                <ScoreBadge score={s?.score ?? null} />
              </div>

              {s?.why_apply && (
                <div className="mt-4 space-y-2">
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">Why Apply</p>
                    <p className="text-sm text-gray-300">{s.why_apply}</p>
                  </div>
                  {s.gaps && s.gaps !== "No significant gaps identified" && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1">Gaps to Address</p>
                      <p className="text-sm text-gray-300">{s.gaps}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-4 pt-3 border-t border-gray-800 flex-wrap">
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  View listing →
                </a>
                {!s && (
                  <button onClick={() => scoreOne(job.id)} disabled={scoringId === job.id}
                    className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors">
                    {scoringId === job.id ? "Scoring..." : "Score this job"}
                  </button>
                )}
                <button onClick={() => markApplied(job.id)}
                  className="text-sm text-gray-400 hover:text-white transition-colors">
                  Mark as applied
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && jobs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No jobs found. Run the scraper to fetch listings.</p>
        </div>
      )}
    </div>
  );
}
