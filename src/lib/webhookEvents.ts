// Server-only: recent RevenueCat webhook events for the inspector.
// With Upstash Redis configured (UPSTASH_REDIS_REST_URL/TOKEN, or Vercel's KV_REST_API_URL/TOKEN)
// events persist across serverless instances and redeploys, deduplicated by event id (RevenueCat
// retries deliveries). Without it, they fall back to a per-instance in-memory ring buffer.

export interface StoredEvent {
  id: string | null;
  type: string;
  appUserId: string;
  /** Every app user id this event concerns (app_user_id, original_app_user_id, aliases, transfers). */
  userIds: string[];
  productId: string | null;
  environment: string | null;
  entitlementIds: string[];
  eventTimestampMs: number | null;
  expirationAtMs: number | null;
  receivedAt: number;
}

/** What GET /api/revenuecat/events exposes (no cross-user ids). */
export type PublicEvent = Omit<StoredEvent, "userIds">;

const MAX_EVENTS = 50;
const EVENT_TTL_S = 30 * 24 * 60 * 60; // keep a user's feed for 30 days
const DEDUPE_TTL_S = 24 * 60 * 60;

const g = globalThis as typeof globalThis & { __scenarRcEvents?: StoredEvent[] };
const memory = (g.__scenarRcEvents ??= []);

function redisConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export function eventStoreKind(): "redis" | "memory" {
  return redisConfig() ? "redis" : "memory";
}

/** Runs Redis commands through Upstash's REST pipeline endpoint (no SDK dependency). */
async function redis(commands: (string | number)[][]): Promise<{ result?: unknown; error?: string }[]> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis not configured");
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}

const userKey = (id: string) => `scenar:rc:events:${id}`;
const toPublic = ({ userIds: _ids, ...rest }: StoredEvent): PublicEvent => rest; // eslint-disable-line @typescript-eslint/no-unused-vars

function recordInMemory(e: StoredEvent) {
  if (e.id && memory.some((m) => m.id === e.id)) return;
  memory.unshift(e);
  if (memory.length > MAX_EVENTS) memory.length = MAX_EVENTS;
}

export async function recordEvent(e: StoredEvent): Promise<void> {
  recordInMemory(e);
  if (!redisConfig()) return;
  try {
    if (e.id) {
      const [seen] = await redis([["SET", `scenar:rc:seen:${e.id}`, "1", "NX", "EX", DEDUPE_TTL_S]]);
      if (seen?.result !== "OK") return; // RevenueCat retry of an event we already stored
    }
    const json = JSON.stringify(toPublic(e));
    const cmds: (string | number)[][] = [];
    for (const id of e.userIds) {
      cmds.push(["LPUSH", userKey(id), json], ["LTRIM", userKey(id), 0, MAX_EVENTS - 1], ["EXPIRE", userKey(id), EVENT_TTL_S]);
    }
    if (cmds.length) await redis(cmds);
  } catch (err) {
    console.error("[webhookEvents] Redis write failed, kept in memory only:", (err as Error).message);
  }
}

export async function eventsFor(appUserId: string): Promise<PublicEvent[]> {
  if (redisConfig()) {
    try {
      const [res] = await redis([["LRANGE", userKey(appUserId), 0, MAX_EVENTS - 1]]);
      const rows = Array.isArray(res?.result) ? (res.result as string[]) : [];
      return rows.flatMap((r) => {
        try {
          return [JSON.parse(r) as PublicEvent];
        } catch {
          return [];
        }
      });
    } catch (err) {
      console.error("[webhookEvents] Redis read failed, using memory:", (err as Error).message);
    }
  }
  return memory.filter((e) => e.userIds.includes(appUserId)).map(toPublic);
}
