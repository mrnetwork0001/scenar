"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { identityHeaders } from "@/lib/identity";
import { toDate } from "@/lib/billingFormat";

/** GET /api/entitlement: what the server concludes after asking RevenueCat itself. */
export interface ServerEntitlement {
  pro: boolean;
  verified: boolean;
  env: string | null;
  appUserId: string | null;
  mode: string | null;
  productId: string | null;
  expiresAt: Date | null;
  reason: string | null;
}

export type ServerCheck =
  | { state: "idle" | "loading" }
  | { state: "ok"; data: ServerEntitlement; at: Date }
  | { state: "error"; message: string; at: Date };

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/**
 * Asks the server whether this app user is Pro. Re-runs whenever `key` changes
 * (identity, env or a fresh CustomerInfo), and on demand via `recheck()`.
 */
export function useServerEntitlement(enabled: boolean, key: string) {
  const [check, setCheck] = useState<ServerCheck>({ state: "idle" });
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const recheck = useCallback(async (fresh = false) => {
    const id = ++seq.current;
    setLoading(true);
    setCheck((c) => (c.state === "ok" || c.state === "error" ? c : { state: "loading" }));
    try {
      const res = await fetch(fresh ? "/api/entitlement?fresh=1" : "/api/entitlement", { headers: identityHeaders(), cache: "no-store" });
      const json: unknown = await res.json().catch(() => null);
      if (id !== seq.current) return;
      if (!json || typeof json !== "object") {
        setCheck({ state: "error", message: `HTTP ${res.status}`, at: new Date() });
        return;
      }
      const o = json as Record<string, unknown>;
      if (!res.ok && typeof o.pro !== "boolean") {
        setCheck({ state: "error", message: str(o.error) ?? `HTTP ${res.status}`, at: new Date() });
        return;
      }
      setCheck({
        state: "ok",
        at: new Date(),
        data: {
          pro: o.pro === true,
          verified: o.verified === true,
          env: str(o.env),
          appUserId: str(o.appUserId),
          mode: str(o.mode),
          productId: str(o.productId),
          expiresAt: toDate(o.expiresAt),
          reason: str(o.reason),
        },
      });
    } catch (err) {
      if (id !== seq.current) return;
      setCheck({
        state: "error",
        message: err instanceof Error ? err.message : "Network error",
        at: new Date(),
      });
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // A new CustomerInfo (purchase, refresh, user switch) means the server's 60s cache may be stale.
    const t = setTimeout(() => void recheck(true), 0);
    return () => clearTimeout(t);
  }, [enabled, key, recheck]);

  return { check, loading, recheck };
}

/** A RevenueCat webhook event as stored by /api/revenuecat/events. */
export interface WebhookEvent {
  id: string;
  type: string;
  productId: string | null;
  environment: string | null;
  at: Date | null;
}

export type EventsCheck =
  | { state: "idle" | "loading" }
  | { state: "ok"; events: WebhookEvent[]; at: Date }
  | { state: "error"; message: string; status?: number; at: Date };

function normaliseEvents(json: unknown): WebhookEvent[] {
  const list: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { events?: unknown }).events)
      ? ((json as { events: unknown[] }).events)
      : [];
  return list
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((raw, i) => {
      // Stored events may be the bare RC event or the whole webhook body ({ event: {...} }).
      const e =
        raw.event && typeof raw.event === "object" ? (raw.event as Record<string, unknown>) : raw;
      return {
        id: str(e.id) ?? `${str(e.type) ?? "event"}-${i}`,
        type: str(e.type) ?? "UNKNOWN",
        productId: str(e.product_id) ?? str(e.productId),
        environment: str(e.environment),
        at: toDate(e.event_timestamp_ms ?? e.eventTimestampMs ?? e.receivedAt ?? e.received_at),
      };
    })
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
}

/** Recent RevenueCat webhook events the server received for this app user. */
export function useWebhookEvents(enabled: boolean, user: string | null, key: string) {
  const [events, setEvents] = useState<EventsCheck>({ state: "idle" });
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!user) return;
    const id = ++seq.current;
    setLoading(true);
    setEvents((c) => (c.state === "ok" || c.state === "error" ? c : { state: "loading" }));
    try {
      const res = await fetch(`/api/revenuecat/events?user=${encodeURIComponent(user)}`, {
        headers: identityHeaders(),
        cache: "no-store",
      });
      if (id !== seq.current) return;
      if (!res.ok) {
        setEvents({ state: "error", message: `HTTP ${res.status}`, status: res.status, at: new Date() });
        return;
      }
      const json: unknown = await res.json().catch(() => null);
      if (id !== seq.current) return;
      setEvents({ state: "ok", events: normaliseEvents(json), at: new Date() });
    } catch (err) {
      if (id !== seq.current) return;
      setEvents({
        state: "error",
        message: err instanceof Error ? err.message : "Network error",
        at: new Date(),
      });
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!enabled || !user) return;
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [enabled, user, key, reload]);

  return { events, loading, reload };
}
