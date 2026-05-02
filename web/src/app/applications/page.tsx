"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationRow = {
  id: string;
  status: string;
  notes: string | null;
  applied_at: string | null;
  updated_at: string;
  jobs: {
    title: string;
    company: string;
    location: string | null;
    url: string;
    score: number | null;
  };
};

const STATUS_COLORS: Record<string, string> = {
  interested: "bg-blue-900 text-blue-300",
  applied: "bg-indigo-900 text-indigo-300",
  interviewing: "bg-yellow-900 text-yellow-300",
  rejected: "bg-red-900 text-red-300",
  offer: "bg-green-900 text-green-300",
};

const STATUSES = ["interested", "applied", "interviewing", "rejected", "offer"];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("applications")
      .select("id, status, notes, applied_at, updated_at, jobs(title, company, location, url, score)")
      .order("updated_at", { ascending: false });
    setApplications((data as unknown as ApplicationRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Applications</h2>

      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{app.jobs.title}</h3>
                <p className="text-sm text-gray-400">
                  {app.jobs.company}
                  {app.jobs.location && ` · ${app.jobs.location}`}
                </p>
                {app.applied_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Applied {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded capitalize font-medium ${STATUS_COLORS[app.status]}`}>
                  {app.status}
                </span>
                <a href={app.jobs.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300">
                  View listing →
                </a>
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              {STATUSES.filter((s) => s !== app.status).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(app.id, s)}
                  className="text-xs bg-gray-800 text-gray-400 hover:text-white px-2 py-1 rounded capitalize transition-colors"
                >
                  Move to {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!loading && applications.length === 0 && (
        <p className="text-gray-500 mt-8 text-center">
          No applications yet. Mark jobs as applied from the Jobs page.
        </p>
      )}
    </div>
  );
}
