import { NextResponse } from "next/server";

// Public, unauthenticated liveness check (used by the Playwright webServer probe
// and handy for uptime monitoring). Kept out of Clerk protection in middleware.
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true });
}
