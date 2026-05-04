"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function ResumePage() {
  const [current, setCurrent] = useState<{ filename: string; uploaded_at: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadCurrent() {
    const { data } = await supabase
      .from("resumes")
      .select("filename, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(1);
    setCurrent(data?.[0] ?? null);
  }

  useEffect(() => { loadCurrent(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/resume", { method: "POST", body: formData });
    const json = await res.json();

    if (res.ok) {
      setMessage("Resume uploaded! Your existing job scores may be outdated — use \"Rescore all\" on the Jobs page to refresh them.");
      loadCurrent();
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setMessage(`Error: ${json.error}`);
    }
    setUploading(false);
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-6">Resume</h2>

      {current && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">Current resume</p>
          <p className="font-medium mt-1">{current.filename}</p>
          <p className="text-xs text-gray-500 mt-1">
            Uploaded {new Date(current.uploaded_at).toLocaleString()}
          </p>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Upload resume (.txt or .pdf — text will be extracted)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf"
            required
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          {uploading ? "Uploading..." : "Upload Resume"}
        </button>
        {message && (
          <p className={`text-sm ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
