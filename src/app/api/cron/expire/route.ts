import { NextRequest, NextResponse } from "next/server";
import { expireStaleBookings } from "@/lib/expiry";
import { config } from "@/lib/config";

// Optional endpoint for an external cron/uptime pinger to sweep expired
// holds even when nobody is browsing the site. Pages also do this lazily,
// so this is a hygiene backstop, not a requirement.
// Protect it with the same secret used for the admin session so it can't be
// hit by randoms: Authorization: Bearer <SESSION_SECRET>
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${config.sessionSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await expireStaleBookings();
  return NextResponse.json({ expired: count });
}
