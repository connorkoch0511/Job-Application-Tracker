"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => {
        setKeywords(d.keywords ?? "");
        setLocation(d.location ?? "");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location }),
    });
    setSaving(false);
    setMessage(res.ok ? "Preferences saved." : "Failed to save.");
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-2">Job Search Preferences</h2>
      <p className="text-gray-400 text-sm mb-8">
        These preferences personalise your experience. The daily cron job uses your keywords
        to score only relevant jobs, and they become the default filters on the Jobs page.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Job title keywords
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. software engineer, python, backend"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated. The cron scorer will only score jobs whose title contains one of these terms.
              Leave blank to score all jobs.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Preferred location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Remote, New York, USA"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated — matches any location. e.g. "Remote, Austin, Texas" shows remote jobs and Austin jobs.
              Used as the default location filter on the Jobs page.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>

          {message && (
            <p className={`text-sm ${message.startsWith("Failed") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
