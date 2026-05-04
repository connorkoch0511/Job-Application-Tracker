"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

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
  };
};

const STATUS_COLORS: Record<string, string> = {
  interested: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  applied: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  interviewing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  offer: "bg-green-500/20 text-green-400 border-green-500/30",
};

const STATUS_ORDER = ["interested", "applied", "interviewing", "offer", "rejected"] as const;

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const supabase = createClient();

  async function load() {
    const { data } = await supabase
      .from("applications")
      .select("id, status, notes, applied_at, updated_at, jobs(title, company, location, url)")
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

  async function saveNotes(id: string) {
    setSavingNotes((s) => new Set(s).add(id));
    const notes = editingNotes[id] ?? "";
    await supabase
      .from("applications")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingNotes((s) => { const n = new Set(s); n.delete(id); return n; });
    setApplications((apps) =>
      apps.map((a) => (a.id === id ? { ...a, notes } : a))
    );
    setEditingNotes((e) => { const n = { ...e }; delete n[id]; return n; });
  }

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Applications</h2>

      {!loading && applications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_ORDER.map((s) => (
            <div
              key={s}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize ${STATUS_COLORS[s]}`}
            >
              {s}: {counts[s]}
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-3">
        {applications.map((app) => {
          const notesValue =
            editingNotes[app.id] !== undefined ? editingNotes[app.id] : (app.notes ?? "");
          const isDirty = editingNotes[app.id] !== undefined;

          return (
            <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg leading-snug">{app.jobs.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {app.jobs.company}
                    {app.jobs.location && ` · ${app.jobs.location}`}
                  </p>
                  {app.applied_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${STATUS_COLORS[app.status]}`}>
                    {app.status}
                  </span>
                  <a
                    href={app.jobs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View listing →
                  </a>
                </div>
              </div>

              <div className="mt-3">
                <textarea
                  value={notesValue}
                  onChange={(e) =>
                    setEditingNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                  }
                  placeholder="Notes — interview feedback, contacts, next steps..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                {isDirty && (
                  <button
                    onClick={() => saveNotes(app.id)}
                    disabled={savingNotes.has(app.id)}
                    className="mt-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                  >
                    {savingNotes.has(app.id) ? "Saving..." : "Save notes"}
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800 flex-wrap">
                <span className="text-xs text-gray-600 self-center mr-1">Move to:</span>
                {STATUS_ORDER.filter((s) => s !== app.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(app.id, s)}
                    className="text-xs bg-gray-800 text-gray-400 hover:text-white px-2.5 py-1 rounded capitalize transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && applications.length === 0 && (
        <p className="text-gray-500 mt-8 text-center">
          No applications yet. Mark jobs as applied from the Jobs page.
        </p>
      )}
    </div>
  );
}
