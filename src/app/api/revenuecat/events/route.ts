import { NextResponse } from "next/server";
import { readIdentity, validAppUserId } from "@/lib/entitlementServer";
import { rateLimit } from "@/lib/rateLimit";
import { eventsFor } from "@/lib/webhookEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?user=<appUserId> -> recent webhook events for that one user only (newest first).
// If the caller also sends x-scenar-user it must match, so the inspector can't be pointed at
// someone else's id. Events live in a per-instance ring buffer (see src/lib/webhookEvents.ts).
export async function GET(req: Request) {
  const limited = rateLimit(req, "events");
  if (limited) return limited;
  const noStore = { "Cache-Control": "no-store" };
  const header = readIdentity(req).appUserId;
  const user = validAppUserId(new URL(req.url).searchParams.get("user")) ?? header;
  if (!user) return NextResponse.json({ error: "user is required" }, { status: 400, headers: noStore });
  if (header && header !== user) {
    return NextResponse.json({ error: "user does not match identity" }, { status: 403, headers: noStore });
  }
  return NextResponse.json({ user, events: eventsFor(user) }, { headers: noStore });
}
