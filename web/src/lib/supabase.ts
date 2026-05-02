import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Job = {
  id: string;
  source: "linkedin" | "indeed";
  title: string;
  company: string;
  location: string | null;
  url: string;
  score: number | null;
  score_reasoning: string | null;
  why_apply: string | null;
  gaps: string | null;
  posted_at: string | null;
  scraped_at: string;
};

export type Application = {
  id: string;
  job_id: string;
  status: "interested" | "applied" | "interviewing" | "rejected" | "offer";
  notes: string | null;
  applied_at: string | null;
  updated_at: string;
};
