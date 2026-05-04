"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

const SOURCE_LABELS: Record<string, string> = {
  remoteok: "RemoteOK",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  themuse: "The Muse",
  linkedin: "LinkedIn",
  indeed: "Indeed",
};

type UserScore = {
  score: number;
  score_reasoning: string | null;
  why_apply: string | null;
  gaps: string | null;
  keyword_matches: string | null;
  keyword_gaps: string | null;
  experience_fit: string | null;
  title_match: string | null;
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

function KeywordPills({ label, keywords, color }: { label: string; keywords: string; color: "green" | "red" }) {
  const items = keywords.split(",").map((k) => k.trim()).filter(Boolean);
  if (!items.length) return null;
  const styles = color === "green"
    ? "bg-green-500/10 text-green-400 border-green-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((kw) => (
          <span key={kw} className={`text-xs px-2 py-0.5 rounded-full border ${styles}`}>{kw}</span>
        ))}
      </div>
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
  const [source, setSource] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [scoringVisible, setScoringVisible] = useState(false);
  const [scoreMsg, setScoreMsg] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => {
        // Don't pre-fill keyword search — preferences drive cron scoring, not the search box
        if (d.location) setLocationFilter(d.location);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("id, source, title, company, location, url, posted_at, user_job_scores(score, score_reasoning, why_apply, gaps, keyword_matches, keyword_gaps, experience_fit, title_match)")
      .order("posted_at", { ascending: false });

    const sorted = (data ?? []).sort((a, b) => {
      const sa = (a as Job).user_job_scores?.[0]?.score ?? -1;
      const sb = (b as Job).user_job_scores?.[0]?.score ?? -1;
      return sb - sa;
    });
    setJobs(sorted as Job[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const availableSources = Array.from(new Set(jobs.map((j) => j.source)));

  const visible = jobs.filter((job) => {
    if (source !== "all" && job.source !== source) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) return false;
    }
    if (locationFilter) {
      const locs = locationFilter.split(",").map((l) => l.trim().toLowerCase()).filter(Boolean);
      const jobLoc = (job.location ?? "").toLowerCase();
      if (!locs.some((l) => jobLoc.includes(l))) return false;
    }
    return true;
  });

  const unscoredVisible = visible.filter((j) => !j.user_job_scores?.[0]);

  async function scoreVisible() {
    const toScore = unscoredVisible.slice(0, 20);
    if (!toScore.length) return;
    setScoringVisible(true);
    setScoreMsg(`Scoring ${toScore.length} jobs...`);
    const ids = toScore.map((j) => j.id);
    toScore.forEach((j) => setScoringIds((s) => new Set(s).add(j.id)));

    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds: ids }),
    });
    const json = await res.json();
    setScoringVisible(false);
    setScoringIds(new Set());
    if (!res.ok) { setScoreMsg(`Error: ${json.error}`); return; }
    setScoreMsg(`Done! ${json.results.length} jobs scored.`);
    load();
  }

  async function scoreOne(jobId: string) {
    setScoringIds((s) => new Set(s).add(jobId));
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds: [jobId] }),
    });
    const json = await res.json();
    setScoringIds((s) => { const n = new Set(s); n.delete(jobId); return n; });
    if (!res.ok) alert(`Error: ${json.error}`);
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

      {/* Search + filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or company..."
          className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="Location (e.g. Remote, USA)"
          className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        {(search || locationFilter) && (
          <button onClick={() => { setSearch(""); setLocationFilter(""); }}
            className="text-xs text-gray-400 hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold">
            Job Listings
            {visible.length !== jobs.length && (
              <span className="text-sm font-normal text-gray-400 ml-2">{visible.length} of {jobs.length}</span>
            )}
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSource("all")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${source === "all" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
              All
            </button>
            {availableSources.map((s) => (
              <button key={s} onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${source === s ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {SOURCE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {unscoredVisible.length > 0 && (
          <button onClick={scoreVisible} disabled={scoringVisible}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {scoringVisible ? "Scoring..." : `Score visible jobs (${Math.min(unscoredVisible.length, 20)})`}
          </button>
        )}
      </div>

      {scoreMsg && (
        <p className={`text-sm mb-4 ${scoreMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
          {scoreMsg}
        </p>
      )}

      {loading && <p className="text-gray-400">Loading jobs...</p>}

      <div className="space-y-3">
        {visible.map((job) => {
          const s = job.user_job_scores?.[0];
          const isScoring = scoringIds.has(job.id);
          return (
            <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {SOURCE_LABELS[job.source] ?? job.source}
                    </span>
                    {job.location && (
                      <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{job.location}</span>
                    )}
                    {job.posted_at && (
                      <span className="text-xs text-gray-500">{new Date(job.posted_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-lg leading-snug">{job.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{job.company}</p>
                </div>
                <ScoreBadge score={s?.score ?? null} />
              </div>

              {s && (
                <div className="mt-4 space-y-2">
                  {s.why_apply && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">Why Apply</p>
                      <p className="text-sm text-gray-300">{s.why_apply}</p>
                    </div>
                  )}
                  {s.gaps && s.gaps !== "No significant gaps identified" && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1">Gaps to Address</p>
                      <p className="text-sm text-gray-300">{s.gaps}</p>
                    </div>
                  )}
                  {(s.experience_fit || s.title_match) && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-1">
                      {s.experience_fit && (
                        <p className="text-sm text-gray-300"><span className="text-xs font-semibold text-blue-400 uppercase tracking-wide mr-2">Experience</span>{s.experience_fit}</p>
                      )}
                      {s.title_match && (
                        <p className="text-sm text-gray-300"><span className="text-xs font-semibold text-blue-400 uppercase tracking-wide mr-2">Title Fit</span>{s.title_match}</p>
                      )}
                    </div>
                  )}
                  {s.keyword_matches && (
                    <KeywordPills label="Matching keywords" keywords={s.keyword_matches} color="green" />
                  )}
                  {s.keyword_gaps && (
                    <KeywordPills label="Missing keywords" keywords={s.keyword_gaps} color="red" />
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-4 pt-3 border-t border-gray-800 flex-wrap">
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  View listing →
                </a>
                {!s && (
                  <button onClick={() => scoreOne(job.id)} disabled={isScoring}
                    className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors">
                    {isScoring ? "Scoring..." : "Score this job"}
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

      {!loading && visible.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">
            {jobs.length === 0 ? "No jobs found. The cron job will scrape new listings daily." : "No jobs match your filters."}
          </p>
          {jobs.length > 0 && (search || locationFilter) && (
            <button onClick={() => { setSearch(""); setLocationFilter(""); }}
              className="mt-3 text-sm text-indigo-400 hover:text-indigo-300">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
