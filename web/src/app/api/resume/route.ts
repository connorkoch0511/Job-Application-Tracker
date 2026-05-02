import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

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

  const { error } = await supabase.from("resumes").insert({
    filename: file.name,
    content: content.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
