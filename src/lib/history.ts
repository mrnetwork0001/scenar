// Client-safe, SSR-safe local session history (localStorage).
// Every storage access is wrapped in try/catch: private mode, quota and disabled storage must never break the app.

import { useSyncExternalStore } from "react";
import { METRIC_LABELS, type MetricKey, type Metrics } from "./types";

export type SessionRecordOutcome = "won" | "lost" | "ended" | "ongoing";

export interface SessionRecord {
  id: string;
  scenarioId: string;
  title: string;
  accent: string;
  overall: number; // 0-100
  metrics: Metrics;
  outcome: SessionRecordOutcome;
  at: string; // ISO timestamp
}

export interface HistoryStats {
  sessions: number;
  avgOverall: number;
  bestOverall: number;
  streakDays: number;
  strongest: MetricKey;
  weakest: MetricKey;
}

export const HISTORY_KEY = "scenar.history.v1";
export const HISTORY_EVENT = "scenar:history";
const CAP = 60;
const KEYS = Object.keys(METRIC_LABELS) as MetricKey[];
const EMPTY: readonly SessionRecord[] = Object.freeze([]);

function isRecord(x: unknown): x is SessionRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as Partial<SessionRecord>;
  return (
    typeof r.id === "string" &&
    typeof r.scenarioId === "string" &&
    typeof r.overall === "number" &&
    typeof r.at === "string" &&
    !!r.metrics &&
    typeof r.metrics === "object"
  );
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(HISTORY_KEY);
  } catch {
    return null;
  }
}

// Snapshot cache so useSyncExternalStore gets a referentially stable value between changes.
let cacheRaw: string | null | undefined;
let cacheList: readonly SessionRecord[] = EMPTY;

function parse(raw: string | null): readonly SessionRecord[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return Object.freeze(data.filter(isRecord));
  } catch {
    return EMPTY;
  }
}

/** All records, newest first. */
export function list(): readonly SessionRecord[] {
  const raw = readRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheList = parse(raw);
  }
  return cacheList;
}

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
  } catch {
    /* ignore */
  }
}

/** Adds a record (newest first, capped). Ignores duplicates by id. Returns true when stored. */
export function add(rec: SessionRecord): boolean {
  if (typeof window === "undefined") return false;
  const current = list();
  if (current.some((r) => r.id === rec.id)) return false;
  const next = [rec, ...current].slice(0, CAP);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  emit();
  return true;
}

export function forScenario(id: string, records: readonly SessionRecord[] = list()): SessionRecord[] {
  return records.filter((r) => r.scenarioId === id);
}

/** Best overall score for a scenario, or null if never played. */
export function best(id: string, records: readonly SessionRecord[] = list()): number | null {
  const rs = forScenario(id, records);
  return rs.length ? Math.max(...rs.map((r) => r.overall)) : null;
}

/** Most recent attempt of a scenario other than `excludeId`. */
export function previous(
  id: string,
  excludeId?: string,
  records: readonly SessionRecord[] = list(),
): SessionRecord | null {
  return records.find((r) => r.scenarioId === id && r.id !== excludeId) ?? null;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function stats(records: readonly SessionRecord[] = list(), now: Date = new Date()): HistoryStats {
  const sessions = records.length;
  const avgOverall = sessions ? Math.round(records.reduce((s, r) => s + r.overall, 0) / sessions) : 0;
  const bestOverall = sessions ? Math.max(...records.map((r) => r.overall)) : 0;

  // Streak: consecutive calendar days (local time) with ≥1 session, ending today or yesterday.
  const days = new Set(records.map((r) => dayKey(new Date(r.at))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  while (days.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const recent = records.slice(0, 10);
  const avg = (k: MetricKey) =>
    recent.length ? recent.reduce((s, r) => s + (Number(r.metrics[k]) || 0), 0) / recent.length : 0;
  let strongest: MetricKey = KEYS[0];
  let weakest: MetricKey = KEYS[0];
  for (const k of KEYS) {
    if (avg(k) > avg(strongest)) strongest = k;
    if (avg(k) < avg(weakest)) weakest = k;
  }

  return { sessions, avgOverall, bestOverall, streakDays, strongest, weakest };
}

/** Subscribe to history changes (this tab via CustomEvent, other tabs via "storage"). */
export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === HISTORY_KEY) cb();
  };
  window.addEventListener(HISTORY_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HISTORY_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => EMPTY;

/**
 * Hydration-safe hook: returns [] on the server and during hydration, then the stored history.
 * Components can therefore render nothing on first paint and fill in after mount.
 */
export function useHistory(): readonly SessionRecord[] {
  return useSyncExternalStore(subscribe, list, serverSnapshot);
}
