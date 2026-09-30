// Client-side store for Pro custom scenarios. Only the public scenario and the opaque sealed
// token live here — the persona / secret / win condition stay encrypted until the report.
import { useSyncExternalStore } from "react";
import type { PublicScenario } from "./scenarios";

export interface CustomScenarioItem {
  scenario: PublicScenario;
  sealed: string;
  createdAt: number;
}

/** Shape returned by POST /api/custom. */
export interface CustomBuildResponse {
  scenario: PublicScenario;
  sealed: string;
  mock?: boolean;
}

const KEY = "scenar.custom.v1";
const EVENT = "scenar:custom-changed";
const MAX_ITEMS = 30;
const EMPTY: readonly CustomScenarioItem[] = Object.freeze([]);

// In-memory mirror so a just-built scenario still plays when storage is blocked (private mode, quota).
let memory: readonly CustomScenarioItem[] = EMPTY;
let memoryVersion = 0;

function isItem(v: unknown): v is CustomScenarioItem {
  if (!v || typeof v !== "object") return false;
  const i = v as Partial<CustomScenarioItem>;
  return (
    typeof i.sealed === "string" &&
    typeof i.createdAt === "number" &&
    !!i.scenario &&
    typeof i.scenario.id === "string" &&
    typeof i.scenario.title === "string" &&
    typeof i.scenario.opening === "string" &&
    !!i.scenario.counterpart
  );
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): CustomScenarioItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isItem) : [];
  } catch {
    return [];
  }
}

// Snapshot cache so useSyncExternalStore gets a referentially stable value between changes.
let cacheKey: string | undefined;
let cacheList: readonly CustomScenarioItem[] = EMPTY;

/** All saved custom scenarios, newest first. */
export function list(): readonly CustomScenarioItem[] {
  const raw = readRaw();
  const key = `${memoryVersion}|${raw ?? ""}`;
  if (key !== cacheKey) {
    cacheKey = key;
    const stored = parse(raw);
    const ids = new Set(stored.map((i) => i.scenario.id));
    const merged = [...stored, ...memory.filter((i) => !ids.has(i.scenario.id))];
    cacheList = merged.length ? Object.freeze(merged.sort((a, b) => b.createdAt - a.createdAt)) : EMPTY;
  }
  return cacheList;
}

export function get(id: string): CustomScenarioItem | undefined {
  return list().find((i) => i.scenario.id === id);
}

function write(items: CustomScenarioItem[]): boolean {
  const next = items.slice(0, MAX_ITEMS);
  memory = Object.freeze(next);
  memoryVersion += 1;
  let ok = false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    ok = true;
  } catch {
    /* storage blocked or full — the in-memory mirror still works for this tab */
  }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
  return ok;
}

/** Saves (or replaces) an item. Returns false when it could only be kept in memory. */
export function save(item: CustomScenarioItem): boolean {
  return write([item, ...list().filter((i) => i.scenario.id !== item.scenario.id)]);
}

export function remove(id: string): boolean {
  return write(list().filter((i) => i.scenario.id !== id));
}

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => EMPTY;
const noopSubscribe = () => () => {};
const trueSnapshot = () => true;
const falseSnapshot = () => false;

/** Hydration-safe: [] on the server / first paint, then the stored scenarios. */
export function useCustomScenarios(): readonly CustomScenarioItem[] {
  return useSyncExternalStore(subscribe, list, serverSnapshot);
}

/**
 * Hydration-safe lookup of one scenario. Returns `undefined` until mounted (so callers can show a
 * loading state), then the item or `null` when it doesn't exist.
 */
export function useCustomScenario(id: string | null): CustomScenarioItem | null | undefined {
  const mounted = useSyncExternalStore(noopSubscribe, trueSnapshot, falseSnapshot);
  const items = useSyncExternalStore(subscribe, list, serverSnapshot);
  if (!mounted) return undefined;
  if (!id) return null;
  return items.find((i) => i.scenario.id === id) ?? null;
}

export const customStore = { list, get, save, remove };
