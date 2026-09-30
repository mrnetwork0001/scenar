"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Hydration-safe reduced-motion flag: always `false` on the server and during
 * hydration, then the real preference. Use it for anything that changes the
 * rendered markup (initial styles, text); motion's useReducedMotion can differ
 * between server and client and cause hydration mismatches.
 */
export function useSafeReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
