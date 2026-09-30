import { getStaticFiles, staticFile } from "remotion";

/**
 * Defensive asset access. Other agents drop files into public/ later; anything that
 * is missing renders an on-brand placeholder instead of crashing the render.
 */
let cache: Set<string> | null = null;
function files(): Set<string> {
  if (!cache) {
    try {
      cache = new Set(getStaticFiles().map((f) => f.name.replace(/^\/+/, "")));
    } catch {
      cache = new Set();
    }
  }
  return cache;
}

export const has = (path: string) => files().has(path.replace(/^\/+/, ""));
export const src = (path: string) => staticFile(path.replace(/^\/+/, ""));

// ---- footage.json (footage agent) ----
export type Rect = { x: number; y: number; w: number; h: number };
export type Clip = {
  file: string;
  width: number;
  height: number;
  durationFrames: number;
  marks: Record<string, number>;
  rects: Record<string, Rect>;
  notes?: Record<string, unknown>;
};

function optionalJson(re: RegExp): unknown | null {
  try {
    const ctx = require.context("./", false, /\.json$/);
    const key = ctx.keys().find((k) => re.test(k));
    return key ? ctx(key) : null;
  } catch {
    return null;
  }
}

const RAW = (optionalJson(/footage\.json$/) ?? {}) as Record<string, Partial<Clip>>;

/**
 * Default geometry used by the placeholder mocks (src/mocks). The rect names match
 * the footage contract, so the virtual camera code is identical with real footage.
 */
export const DEFAULT_CLIPS: Record<string, Clip> = {
  take2: {
    file: "footage/take2.mp4", width: 3200, height: 1800, durationFrames: 600, marks: { send: 150, reply: 300, drop: 330 },
    rects: {
      meter: { x: 160, y: 200, w: 900, h: 620 },
      progress: { x: 160, y: 860, w: 900, h: 300 },
      coach: { x: 160, y: 1200, w: 900, h: 440 },
      chat: { x: 1140, y: 200, w: 1900, h: 1180 },
      composer: { x: 1140, y: 1420, w: 1900, h: 220 },
    },
  },
  reveal: {
    file: "footage/reveal.mp4", width: 3200, height: 1800, durationFrames: 300, marks: { click: 190 },
    rects: {
      score: { x: 240, y: 220, w: 1100, h: 700 },
      radar: { x: 1460, y: 220, w: 1500, h: 700 },
      truth: { x: 240, y: 1000, w: 2720, h: 640 },
    },
  },
  paywall: {
    file: "footage/paywall.mp4", width: 3200, height: 1800, durationFrames: 600, marks: { purchase: 480 },
    rects: {
      plans: { x: 900, y: 760, w: 1400, h: 330 },
      timeline: { x: 900, y: 1110, w: 1400, h: 230 },
      cta: { x: 900, y: 1380, w: 1400, h: 200 },
      coaching: { x: 400, y: 300, w: 2400, h: 1200 },
    },
  },
  live: {
    file: "footage/live.mp4", width: 3200, height: 1800, durationFrames: 450, marks: {},
    rects: {
      switch: { x: 2500, y: 60, w: 560, h: 160 },
      strip: { x: 0, y: 220, w: 3200, h: 120 },
      checkout: { x: 1000, y: 460, w: 1200, h: 900 },
    },
  },
  inspector: {
    file: "footage/inspector.mp4", width: 3200, height: 1800, durationFrames: 240, marks: {},
    rects: { verdict: { x: 1900, y: 1180, w: 1100, h: 260 }, panel: { x: 1800, y: 300, w: 1300, h: 1200 } },
  },
  builder: {
    file: "footage/builder.mp4", width: 3200, height: 1800, durationFrames: 360, marks: {},
    rects: { input: { x: 700, y: 500, w: 1800, h: 500 }, briefing: { x: 700, y: 300, w: 1800, h: 1200 } },
  },
  phone: { file: "footage/phone.mp4", width: 1180, height: 2556, durationFrames: 360, marks: {}, rects: {} },
  voice: { file: "footage/voice.mp4", width: 1920, height: 1080, durationFrames: 180, marks: {}, rects: {} },
};

export function clip(name: string): Clip & { real: boolean } {
  const d = DEFAULT_CLIPS[name];
  const r = RAW[name];
  const file = r?.file ?? d?.file ?? `footage/${name}.mp4`;
  // real only once the footage agent has both written the file and described it
  const real = has(file) && !!r;
  if (!r || !real) return { ...(d as Clip), real };
  return {
    file,
    width: r.width ?? d.width,
    height: r.height ?? d.height,
    durationFrames: r.durationFrames ?? d.durationFrames,
    marks: r.marks ?? {},
    notes: r.notes,
    // real rects win; defaults only fill names the footage agent did not provide
    rects: { ...(real ? {} : d.rects), ...(r.rects ?? {}) },
    real,
  };
}

/** First mark found among candidate names (footage agent may name events differently). */
export function markOf(c: Clip, names: string[]): number | undefined {
  for (const n of names) if (c.marks[n] !== undefined) return c.marks[n];
  return undefined;
}

export const rectOf = (c: Clip, name: string): Rect | undefined => c.rects[name] ?? DEFAULT_CLIPS_RECT(c, name);
function DEFAULT_CLIPS_RECT(c: Clip, name: string): Rect | undefined {
  // scale a default rect to the real clip size if the footage agent omitted it
  for (const d of Object.values(DEFAULT_CLIPS)) {
    if (d.file === c.file && d.rects[name]) {
      const r = d.rects[name];
      const sx = c.width / d.width;
      const sy = c.height / d.height;
      return { x: r.x * sx, y: r.y * sy, w: r.w * sx, h: r.h * sy };
    }
  }
  return undefined;
}

export const STOCK = ["maya_laptop_night", "maya_phone_anxious", "maya_confident_call", "maya_smile"] as const;
export type StockName = (typeof STOCK)[number];
export const stockFile = (n: string) => `stock/${n}.mp4`;

export type Pt = { at: number; src: number | string[] };

/**
 * Time-remap a clip: `pts` pin scene frames to source frames (numbers or mark names).
 * Linear between pins, 1x before the first and after the last, clamped to the clip.
 * Unknown marks are skipped, so the mapping degrades to plain playback.
 */
export function clipTime(c: Clip, pts: Pt[]) {
  const pins = pts
    .map((p) => ({ at: p.at, src: typeof p.src === "number" ? p.src : markOf(c, p.src) }))
    .filter((p): p is { at: number; src: number } => p.src !== undefined)
    .sort((a, b) => a.at - b.at)
    .filter((p, i, arr) => i === 0 || (p.src > arr[i - 1].src && p.at > arr[i - 1].at));
  const last = c.durationFrames - 2;
  const map = (f: number) => {
    let v: number;
    if (!pins.length) v = f;
    else if (f <= pins[0].at) v = pins[0].src + (f - pins[0].at);
    else if (f >= pins[pins.length - 1].at) v = pins[pins.length - 1].src + (f - pins[pins.length - 1].at);
    else {
      let i = 0;
      while (f > pins[i + 1].at) i++;
      const a = pins[i];
      const b = pins[i + 1];
      v = a.src + ((f - a.at) * (b.src - a.src)) / (b.at - a.at);
    }
    return Math.max(0, Math.min(last, v));
  };
  /** scene frame at which a source frame is shown */
  const inv = (src: number) => {
    if (!pins.length) return src;
    if (src <= pins[0].src) return pins[0].at + (src - pins[0].src);
    for (let i = 0; i < pins.length - 1; i++) {
      const a = pins[i];
      const b = pins[i + 1];
      if (src <= b.src) return a.at + ((src - a.src) * (b.at - a.at)) / (b.src - a.src);
    }
    const z = pins[pins.length - 1];
    return z.at + (src - z.src);
  };
  return { map, inv, pins };
}
