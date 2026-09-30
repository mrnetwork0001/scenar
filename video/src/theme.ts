import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { Easing } from "remotion";

const inter = loadInter("normal", { weights: ["300", "400", "500", "600"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const SANS = inter.fontFamily;
export const MONO = mono.fontFamily;

export const W = 1920;
export const H = 1080;
export const FPS = 30;

/** Scenar palette: flat white + ink. The tension gradient is the only colour. */
export const C = {
  white: "#ffffff",
  ink: "#0a0a0a",
  g55: "rgba(10,10,10,.55)",
  g38: "rgba(10,10,10,.38)",
  g12: "rgba(10,10,10,.12)",
  g08: "rgba(10,10,10,.08)",
  surface: "#f4f4f6",
  calm: "#10b981",
  tense: "#f59e0b",
  heated: "#ef4444",
  live: "#15803d",
  liveSoft: "rgba(21,128,61,.10)",
};

/** Signature easing from the product: [0.16, 1, 0.3, 1]. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.55, 0, 0.9, 0.3);

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Display type: weight 300, tight tracking (DESIGN.md / BRIEF.md). */
export const display = (size: number, weight = 300): React.CSSProperties => ({
  fontFamily: SANS,
  fontWeight: weight,
  fontSize: size,
  letterSpacing: "-0.04em",
  lineHeight: 1,
  fontFeatureSettings: '"tnum" 1, "ss01" 1',
});

export const monoLabel = (size = 22): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  fontWeight: 400,
  letterSpacing: "0.02em",
});

const STOPS: [number, [number, number, number]][] = [
  [0, [16, 185, 129]],
  [55, [245, 158, 11]],
  [100, [239, 68, 68]],
];

/** Same mapping as the product's TensionMeter. */
export function tensionColor(v: number): string {
  const x = Math.max(0, Math.min(100, v));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      const c = ca.map((n, k) => Math.round(n + (cb[k] - n) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(239, 68, 68)";
}

export function tensionLabel(v: number): string {
  if (v < 25) return "Calm";
  if (v < 50) return "Guarded";
  if (v < 75) return "Tense";
  return "Heated";
}
