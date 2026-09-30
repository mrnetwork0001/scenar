import { NextResponse } from "next/server";
import { verifyPro } from "@/lib/entitlementServer";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET -> what the server believes about the caller's scenar_pro entitlement (inspector's
// "Server verification" row). ?fresh=1 skips the 60s cache.
export async function GET(req: Request) {
  const limited = rateLimit(req, "entitlement");
  if (limited) return limited;
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  const result = await verifyPro(req, { bust: fresh });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
