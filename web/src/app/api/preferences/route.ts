import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_preferences")
    .select("keywords, location")
    .eq("user_id", user.id)
    .limit(1);

  return NextResponse.json(data?.[0] ?? { keywords: "", location: "" });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { keywords, location } = await req.json();

  const { error } = await supabase.from("user_preferences").upsert(
    { user_id: user.id, keywords: keywords ?? "", location: location ?? "", updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
