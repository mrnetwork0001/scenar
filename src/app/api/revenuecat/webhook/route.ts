import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { bustEntitlementCache, validAppUserId } from "@/lib/entitlementServer";
import { recordEvent } from "@/lib/webhookEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

// Constant-time comparison (hashing first makes it length-independent too).
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * RevenueCat webhook (Integrations -> Webhooks). RevenueCat sends the configured Authorization
 * header value verbatim; we compare it to REVENUECAT_WEBHOOK_AUTH. Every event busts the
 * server-side entitlement cache for the user(s) involved, so the next Pro check hits RevenueCat.
 */
export async function POST(req: Request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
  if (!expected) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const auth = (req.headers.get("authorization") ?? "").trim();
  // Accept the secret verbatim or as "Bearer <secret>" (RevenueCat's dashboard suggests the latter).
  const bare = auth.replace(/^Bearer\s+/i, "");
  const expectedBare = expected.replace(/^Bearer\s+/i, "");
  if (!auth || !safeEqual(bare, expectedBare)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ev = ((payload ?? {}) as { event?: Record<string, unknown> }).event;
  if (!ev || typeof ev !== "object") return NextResponse.json({ error: "Missing event" }, { status: 400 });

  const type = str(ev.type) ?? "UNKNOWN";
  const appUserId = validAppUserId(str(ev.app_user_id));
  const related = [
    appUserId,
    validAppUserId(str(ev.original_app_user_id)),
    ...(Array.isArray(ev.aliases) ? ev.aliases : []).map((a) => validAppUserId(str(a))),
    ...(Array.isArray(ev.transferred_from) ? ev.transferred_from : []).map((a) => validAppUserId(str(a))),
    ...(Array.isArray(ev.transferred_to) ? ev.transferred_to : []).map((a) => validAppUserId(str(a))),
  ];
  const userIds = [...new Set(related.filter((x): x is string => !!x))].slice(0, 20);

  for (const id of userIds) bustEntitlementCache(id);

  if (userIds.length) {
    const entIds = Array.isArray(ev.entitlement_ids)
      ? ev.entitlement_ids.filter((x): x is string => typeof x === "string").slice(0, 10)
      : str(ev.entitlement_id)
        ? [str(ev.entitlement_id) as string]
        : [];
    await recordEvent({
      id: str(ev.id),
      type,
      appUserId: appUserId ?? userIds[0],
      userIds,
      productId: str(ev.product_id),
      environment: str(ev.environment),
      entitlementIds: entIds,
      eventTimestampMs: num(ev.event_timestamp_ms),
      expirationAtMs: num(ev.expiration_at_ms),
      receivedAt: Date.now(),
    });
  }
  // Always 200 for authenticated deliveries so RevenueCat doesn't retry events we chose to ignore.
  return NextResponse.json({ ok: true, type, users: userIds.length });
}
