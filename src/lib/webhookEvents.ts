// Server-only: recent RevenueCat webhook events, kept in an in-memory ring buffer.
// NOTE: per-instance and reset on every redeploy/cold start - it exists so the demo inspector can
// show webhooks arriving live. In production, persist events to a DB/KV (and dedupe by event id).

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
const g = globalThis as typeof globalThis & { __scenarRcEvents?: StoredEvent[] };
const events = (g.__scenarRcEvents ??= []);

export function recordEvent(e: StoredEvent) {
  events.unshift(e);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

export function eventsFor(appUserId: string): PublicEvent[] {
  return events
    .filter((e) => e.userIds.includes(appUserId))
    .map(({ userIds: _ids, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
}
