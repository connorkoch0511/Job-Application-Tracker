import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

// List the current user's applications, each with its job details nested under
// `jobs` to match the Applications page shape.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = (await sql`
    select a.id, a.status, a.notes, a.applied_at, a.updated_at,
           j.title, j.company, j.location, j.url
    from applications a
    join jobs j on j.id = a.job_id
    where a.user_id = ${userId}
    order by a.updated_at desc
  `) as Record<string, unknown>[];

  const applications = rows.map((r) => ({
    id: r.id,
    status: r.status,
    notes: r.notes,
    applied_at: r.applied_at,
    updated_at: r.updated_at,
    jobs: { title: r.title, company: r.company, location: r.location, url: r.url },
  }));

  return NextResponse.json({ applications });
}

// Mark a job as applied (upsert one application per user+job).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  try {
    await sql`
      insert into applications (user_id, job_id, status, applied_at, updated_at)
      values (${userId}, ${jobId}, 'applied', now(), now())
      on conflict (user_id, job_id) do update set
        status = 'applied',
        applied_at = now(),
        updated_at = now()
    `;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Update an application's status and/or notes.
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    if (status !== undefined) {
      await sql`
        update applications set status = ${status}, updated_at = now()
        where id = ${id} and user_id = ${userId}
      `;
    }
    if (notes !== undefined) {
      await sql`
        update applications set notes = ${notes}, updated_at = now()
        where id = ${id} and user_id = ${userId}
      `;
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
