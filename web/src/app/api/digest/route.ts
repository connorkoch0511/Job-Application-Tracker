import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import nodemailer from "nodemailer";

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

type ScoreRow = {
  user_id: string;
  score: number;
  score_reasoning: string | null;
  why_apply: string | null;
  title: string;
  company: string;
  location: string | null;
  url: string;
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 86_400 * 1000).toISOString();

  // Top scored jobs from the last 24 hours, score >= 60
  const scores = (await sql`
    select s.user_id, s.score::float as score, s.score_reasoning, s.why_apply,
           j.title, j.company, j.location, j.url
    from user_job_scores s
    join jobs j on j.id = s.job_id
    where s.scored_at >= ${since} and s.score >= 60
    order by s.score desc
  `) as ScoreRow[];

  if (!scores.length) {
    return NextResponse.json({ message: "No new high-scoring jobs to send" });
  }

  // Group top 10 per user
  const byUser: Record<string, ScoreRow[]> = {};
  for (const s of scores) {
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    if (byUser[s.user_id].length < 10) byUser[s.user_id].push(s);
  }

  const clerk = await clerkClient();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  let sent = 0;
  for (const [userId, userScores] of Object.entries(byUser)) {
    try {
      const user = await clerk.users.getUser(userId);
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) continue;

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `Job Digest — ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}`,
        html: buildEmail(userScores),
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send digest for user ${userId}:`, e);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

function buildEmail(scores: ScoreRow[]) {
  const rows = scores
    .map(
      (s) => `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb">
          <a href="${s.url}" style="font-weight:600;color:#4f46e5;text-decoration:none">${s.title}</a><br/>
          <span style="color:#6b7280;font-size:13px">${s.company}${s.location ? ` · ${s.location}` : ""}</span>
          ${s.why_apply ? `<br/><span style="color:#9ca3af;font-size:12px;margin-top:4px;display:block">${s.why_apply}</span>` : ""}
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:24px;font-weight:700;color:${s.score >= 80 ? "#22c55e" : "#eab308"}">
          ${Math.round(s.score)}
        </td>
      </tr>`
    )
    .join("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;font-weight:700;margin-bottom:4px">Your Daily Job Digest</h1>
      <p style="color:#6b7280;margin-bottom:24px">${new Date().toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })} — jobs scored 60+ in the last 24 hours</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Job</th>
            <th style="padding:8px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;width:60px">Score</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${appUrl ? `<p style="margin-top:24px;font-size:12px;color:#9ca3af"><a href="${appUrl}" style="color:#4f46e5">View all jobs →</a></p>` : ""}
    </div>`;
}
