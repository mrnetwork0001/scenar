import { interpolate, random, spring } from "remotion";
import { CLAMP, EASE_OUT } from "../theme";

export type Key = { at: number; v: number };

/**
 * A value that springs from key to key (like the product's needle). Each key adds
 * its delta through its own spring, so fast consecutive changes overlap naturally.
 */
export function springKeys(frame: number, fps: number, keys: Key[], config = { stiffness: 70, damping: 13, mass: 1 }): number {
  if (!keys.length) return 0;
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  let v = sorted[0].v;
  for (let i = 1; i < sorted.length; i++) {
    const k = sorted[i];
    const p = spring({ frame: frame - k.at, fps, config });
    v += (k.v - sorted[i - 1].v) * p;
  }
  return v;
}

/** Eased 0→1 over [a, b]. */
export const ramp = (f: number, a: number, b: number, ease = EASE_OUT) =>
  interpolate(f, [a, b], [0, 1], { ...CLAMP, easing: ease });

/** Lub-dub heartbeat envelope, 0..1. */
export function heartbeat(frame: number, fps: number, bpm: number): number {
  const period = (fps * 60) / bpm;
  const t = ((frame % period) + period) % period;
  const bump = (c: number, w: number) => Math.exp(-((t - c) ** 2) / (2 * w * w));
  return Math.min(1, bump(1.5, 1.4) + 0.65 * bump(7, 1.6));
}

/** Deterministic shake offset. */
export function shake(frame: number, amp: number, seed = "s"): { x: number; y: number; r: number } {
  if (amp <= 0) return { x: 0, y: 0, r: 0 };
  return {
    x: (random(`${seed}x${frame}`) - 0.5) * 2 * amp,
    y: (random(`${seed}y${frame}`) - 0.5) * 2 * amp,
    r: (random(`${seed}r${frame}`) - 0.5) * 0.12 * amp,
  };
}

/** Decaying impulse starting at `at` (e.g. stamp impact). */
export function impulse(frame: number, at: number, len = 10): number {
  if (frame < at || frame > at + len) return 0;
  return Math.pow(1 - (frame - at) / len, 2);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
