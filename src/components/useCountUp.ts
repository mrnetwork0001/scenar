"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly counts a displayed integer towards `target` (ease-out cubic, rAF driven). */
export function useCountUp(target: number, duration = 900, initial = target): number {
  const [display, setDisplay] = useState(initial);
  const current = useRef(initial);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = current.current;
    const span = reduce ? 1 : duration;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / span);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      current.current = v;
      setDisplay(Math.round(v));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
