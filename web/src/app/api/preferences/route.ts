import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = (await sql`
    select keywords, location from user_preferences
    where user_id = ${userId}
    limit 1
  `) as { keywords: string; location: string }[];

  return NextResponse.json(rows[0] ?? { keywords: "", location: "" });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { keywords, location } = await req.json();

  try {
    await sql`
      insert into user_preferences (user_id, keywords, location, updated_at)
      values (${userId}, ${keywords ?? ""}, ${location ?? ""}, now())
      on conflict (user_id) do update set
        keywords = excluded.keywords,
        location = excluded.location,
        updated_at = excluded.updated_at
    `;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
