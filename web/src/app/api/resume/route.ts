import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

// Returns the user's current (most recent) resume metadata.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = (await sql`
    select filename, uploaded_at from resumes
    where user_id = ${userId}
    order by uploaded_at desc
    limit 1
  `) as { filename: string; uploaded_at: string }[];

  return NextResponse.json(rows[0] ?? null);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
  const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");

  if (!isPdf && !isTxt) {
    return NextResponse.json({ error: "Only .txt and .pdf files are supported" }, { status: 400 });
  }

  let content: string;

  if (isTxt) {
    content = await file.text();
  } else {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const buffer = await file.arrayBuffer();
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      content = text;
    } catch (err) {
      console.error("PDF parse error:", err);
      return NextResponse.json({ error: "Failed to parse PDF" }, { status: 422 });
    }
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "Resume appears to be empty" }, { status: 422 });
  }

  try {
    await sql`
      insert into resumes (user_id, filename, content)
      values (${userId}, ${file.name}, ${content.trim()})
    `;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
