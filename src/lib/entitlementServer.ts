// Server-only: verifies the scenar_pro entitlement with RevenueCat's REST API so Pro content is
// enforced on the server, not just hidden in the browser. Never import this from client components.
//
// Identity: the client sends x-scenar-user (RevenueCat app user id) + x-scenar-env (sandbox|live).
// The app user id is not a secret credential, but it is a random anonymous id (or one the user
// chose to restore with) and the entitlement it maps to is looked up live in RevenueCat, so a
// caller can only ever get Pro for an id that RevenueCat says has an active scenar_pro.
import { IDENTITY_HEADERS, PRO_ENTITLEMENT, type BillingEnv } from "./types";

export type VerifyMode = "revenuecat" | "demo" | "unverifiable";

export interface ProVerification {
  pro: boolean;
  /** true when RevenueCat actually answered for this user (pro may still be false). */
  verified: boolean;
  env: BillingEnv;
  appUserId: string | null;
  mode: VerifyMode;
  productId?: string | null;
  expiresAt?: string | null;
  /** Machine-friendly explanation when pro is false or unverified. Never contains keys. */
  reason?: string;
  /** ISO time RevenueCat was asked (cached results keep the original time). */
  checkedAt?: string;
  cached?: boolean;
}

const RC_API = "https://api.revenuecat.com/v1/subscribers/";
const TIMEOUT_MS = 5_000;
const POSITIVE_TTL_MS = 60_000; // Pro results: 60s (webhooks + unlock bust earlier)
const NEGATIVE_TTL_MS = 10_000; // non-Pro results: short, so a fresh purchase is seen quickly
const MAX_CACHE = 5_000;

// Route handlers can be bundled separately (and HMR re-evaluates modules in dev), so the cache
// lives on globalThis to be shared by every route in this server instance - including the webhook
// that busts it. Per-instance only; use a shared KV if you scale out.
interface CacheEntry {
  at: number;
  result: ProVerification;
}
const g = globalThis as typeof globalThis & {
  __scenarProCache?: Map<string, CacheEntry>;
  __scenarProInflight?: Map<string, Promise<ProVerification>>;
};
const cache = (g.__scenarProCache ??= new Map());
const inflight = (g.__scenarProInflight ??= new Map());

const cacheKey = (env: BillingEnv, appUserId: string) => `${env}:${appUserId}`;

/** "Scenar Pro", "scenar-pro", "SCENAR_PRO" -> "scenar_pro" (same rule as the client). */
const normalizeId = (id: string) => id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

/** Validated identity from request headers. */
export function readIdentity(req: Request): { appUserId: string | null; env: BillingEnv } {
  const rawEnv = req.headers.get(IDENTITY_HEADERS.env)?.trim().toLowerCase();
  const env: BillingEnv = rawEnv === "live" ? "live" : "sandbox";
  return { appUserId: validAppUserId(req.headers.get(IDENTITY_HEADERS.user)), env };
}

export function validAppUserId(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > 100 || /\s/.test(id)) return null;
  return id;
}

function publicKeyFor(env: BillingEnv): string {
  const k = env === "live" ? process.env.NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY : process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
  return k?.trim() ?? "";
}

/** True when no RevenueCat key is configured at all -> the app runs in labelled demo billing. */
export function isDemoBillingServer(): boolean {
  return !process.env.REVENUECAT_SECRET_API_KEY?.trim() && !publicKeyFor("sandbox") && !publicKeyFor("live");
}

function keyFor(env: BillingEnv): string {
  // A secret key covers the whole project (both environments); otherwise use that env's public key,
  // which is allowed to read GET /v1/subscribers/{id} (it's what the web SDK itself calls).
  return process.env.REVENUECAT_SECRET_API_KEY?.trim() || publicKeyFor(env);
}

/** Drops cached results for a user (both environments), e.g. after a purchase or webhook. */
export function bustEntitlementCache(appUserId: string, env?: BillingEnv) {
  for (const e of env ? [env] : (["sandbox", "live"] as const)) cache.delete(cacheKey(e, appUserId));
}

interface RcEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
}

function isActive(ent: RcEntitlement, now: number): boolean {
  const future = (d: string | null | undefined) => typeof d === "string" && Date.parse(d) > now;
  return ent.expires_date == null || future(ent.expires_date) || future(ent.grace_period_expires_date);
}

async function fetchFromRevenueCat(env: BillingEnv, appUserId: string, key: string): Promise<ProVerification> {
  const base = { env, appUserId, checkedAt: new Date().toISOString() };
  let res: Response;
  try {
    res = await fetch(RC_API + encodeURIComponent(appUserId), {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { ...base, pro: false, verified: false, mode: "unverifiable", reason: timeout ? "revenuecat_timeout" : "revenuecat_unreachable" };
  }
  if (res.status === 404) return { ...base, pro: false, verified: true, mode: "revenuecat", reason: "unknown_subscriber" };
  if (!res.ok) {
    return { ...base, pro: false, verified: false, mode: "unverifiable", reason: `revenuecat_http_${res.status}` };
  }
  let body: { subscriber?: { entitlements?: Record<string, RcEntitlement> } };
  try {
    body = await res.json();
  } catch {
    return { ...base, pro: false, verified: false, mode: "unverifiable", reason: "revenuecat_bad_response" };
  }
  const now = Date.now();
  const entitlements = body.subscriber?.entitlements ?? {};
  const match = Object.entries(entitlements).find(
    ([id, ent]) => normalizeId(id) === PRO_ENTITLEMENT && ent && typeof ent === "object" && isActive(ent, now),
  )?.[1];
  if (!match) return { ...base, pro: false, verified: true, mode: "revenuecat", reason: "no_active_entitlement" };
  return {
    ...base,
    pro: true,
    verified: true,
    mode: "revenuecat",
    productId: match.product_identifier ?? null,
    expiresAt: match.expires_date ?? null,
  };
}

/**
 * Verifies scenar_pro for the caller identified by the x-scenar-user / x-scenar-env headers.
 * Never throws: RevenueCat errors resolve to { pro: false, mode: "unverifiable" } (fail closed).
 */
export async function verifyPro(req: Request, opts: { bust?: boolean } = {}): Promise<ProVerification> {
  const { appUserId, env } = readIdentity(req);

  if (isDemoBillingServer()) {
    // No RevenueCat project configured: the app's labelled demo billing grants Pro locally.
    return { pro: true, verified: false, env, appUserId, mode: "demo", reason: "demo_billing" };
  }
  const key = keyFor(env);
  if (!key) return { pro: false, verified: false, env, appUserId, mode: "unverifiable", reason: `no_key_for_${env}` };
  if (!appUserId) return { pro: false, verified: false, env, appUserId: null, mode: "revenuecat", reason: "missing_identity" };

  const ck = cacheKey(env, appUserId);
  if (opts.bust) cache.delete(ck);
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < (hit.result.pro ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS)) {
    return { ...hit.result, cached: true };
  }

  // Coalesce concurrent lookups for the same user (e.g. report + unlock racing).
  let p = opts.bust ? undefined : inflight.get(ck);
  if (!p) {
    p = fetchFromRevenueCat(env, appUserId, key).finally(() => inflight.delete(ck));
    inflight.set(ck, p);
  }
  const result = await p;
  if (result.verified) {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
    cache.set(ck, { at: Date.now(), result });
  }
  return result;
}

/** Standard 403 body for Pro-gated routes. */
export function proRequired(v?: ProVerification): Response {
  return Response.json(
    { error: "Scenar Pro required", code: "pro_required", ...(v?.reason ? { reason: v.reason } : {}) },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
