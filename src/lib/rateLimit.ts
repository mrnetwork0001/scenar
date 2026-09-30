// Server-only, in-memory sliding-window rate limiter for the LLM-backed routes.
// Protects the LLM key from abuse on a public deploy. Per-instance only (fine for a
// single Vercel/Node instance); swap for Redis/Upstash if you scale out.

type Bucket = number[];

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateLimitRule {
  limit: number; // max requests…
  windowMs: number; // …per window
}

export const RATE_LIMITS = {
  turn: { limit: 40, windowMs: 10 * 60_000 },
  report: { limit: 10, windowMs: 10 * 60_000 },
  custom: { limit: 6, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>;

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Returns null when allowed, or a 429 Response when the caller is over the limit. */
export function rateLimit(req: Request, name: keyof typeof RATE_LIMITS): Response | null {
  // Local dev and automated tests share one IP; only enforce on real deployments.
  if (process.env.NODE_ENV !== "production" && !process.env.RATE_LIMIT_DEV) return null;
  const rule = RATE_LIMITS[name];
  const now = Date.now();

  // Drop idle buckets now and then so memory stays bounded.
  if (now - lastSweep > 60_000) {
    for (const [k, hits] of buckets) {
      if (!hits.length || now - hits[hits.length - 1] > 10 * 60_000) buckets.delete(k);
    }
    lastSweep = now;
  }

  const key = `${name}:${clientKey(req)}`;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (hits.length >= rule.limit) {
    const retryAfter = Math.ceil((rule.windowMs - (now - hits[0])) / 1000);
    return Response.json(
      { error: "You're going a bit fast - take a breath and try again in a minute." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  hits.push(now);
  buckets.set(key, hits);
  return null;
}
