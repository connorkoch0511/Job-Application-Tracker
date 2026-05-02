import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Guard so only Vercel Cron (or an explicit secret) can trigger this
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch top 10 scored jobs from the last 24 hours
  const since = new Date(Date.now() - 86400 * 1000).toISOString();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("title, company, location, url, score, score_reasoning")
    .gte("scraped_at", since)
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(10);

  if (!jobs?.length) {
    return NextResponse.json({ message: "No new jobs to send" });
  }

  const html = buildEmail(jobs);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.DIGEST_TO,
    subject: `Job Digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
    html,
  });

  return NextResponse.json({ ok: true, sent: jobs.length });
}

function buildEmail(jobs: Array<{ title: string; company: string; location: string | null; url: string; score: number; score_reasoning: string }>) {
  const rows = jobs
    .map(
      (j) => `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb">
          <a href="${j.url}" style="font-weight:600;color:#4f46e5;text-decoration:none">${j.title}</a><br/>
          <span style="color:#6b7280;font-size:13px">${j.company}${j.location ? ` · ${j.location}` : ""}</span><br/>
          <span style="color:#9ca3af;font-size:12px;margin-top:4px;display:block">${j.score_reasoning}</span>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:24px;font-weight:700;color:${j.score >= 80 ? "#22c55e" : j.score >= 60 ? "#eab308" : "#ef4444"}">
          ${Math.round(j.score)}
        </td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;font-weight:700;margin-bottom:4px">Your Daily Job Digest</h1>
      <p style="color:#6b7280;margin-bottom:24px">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Job</th>
            <th style="padding:8px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;width:60px">Score</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#4f46e5">View all jobs →</a>
      </p>
    </div>`;
}
