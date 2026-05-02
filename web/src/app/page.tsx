"use client";

import { useEffect, useState } from "react";
import { supabase, type Job } from "@/lib/supabase";

const SOURCE_LABELS: Record<string, string> = { linkedin: "LinkedIn", indeed: "Indeed" };

const SCORE_COLOR = (score: number | null) => {
  if (score === null) return "text-gray-500";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [source, setSource] = useState<"all" | "linkedin" | "indeed">("all");

  useEffect(() => {
    async function load() {
      const query = supabase
        .from("jobs")
        .select("id, source, title, company, location, url, score, score_reasoning, posted_at, scraped_at")
        .order("score", { ascending: false, nullsFirst: false });

      if (source !== "all") query.eq("source", source);

      const { data } = await query;
      setJobs(data ?? []);
      setLoading(false);
    }
    load();
  }, [source]);

  async function markApplied(jobId: string) {
    await supabase.from("applications").upsert(
      { job_id: jobId, status: "applied", applied_at: new Date().toISOString() },
      { onConflict: "job_id" }
    );
    alert("Marked as applied!");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Job Listings</h2>
        <div className="flex gap-2">
          {(["all", "linkedin", "indeed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                source === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading jobs...</p>}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {SOURCE_LABELS[job.source]}
                  </span>
                  <h3 className="font-semibold text-white">{job.title}</h3>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {job.company}
                  {job.location && ` · ${job.location}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-bold ${SCORE_COLOR(job.score)}`}>
                  {job.score !== null ? Math.round(job.score) : "—"}
                </p>
                <p className="text-xs text-gray-500">match</p>
              </div>
            </div>

            {job.score_reasoning && (
              <button
                onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                {expanded === job.id ? "Hide reasoning" : "Show reasoning"}
              </button>
            )}
            {expanded === job.id && (
              <p className="mt-2 text-sm text-gray-300 bg-gray-800 rounded p-3">
                {job.score_reasoning}
              </p>
            )}

            <div className="flex gap-3 mt-3">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                View listing →
              </a>
              <button
                onClick={() => markApplied(job.id)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Mark applied
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && jobs.length === 0 && (
        <p className="text-gray-500 mt-8 text-center">
          No jobs found. Run the scraper to fetch new listings.
        </p>
      )}
    </div>
  );
}
