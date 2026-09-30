import script from "../script.json";

/**
 * Timing source of truth.
 *  - Preferred: src/timing.json written by the audio agent (absolute frames).
 *  - Fallback: derived from script.json planned seconds, words spread evenly by length,
 *    so Studio always previews even before any audio exists.
 */

export type Word = { word: string; start: number; end: number };
export type Line = {
  voice: string;
  file: string;
  startFrame: number;
  durationFrames: number;
  words: Word[];
  text: string;
};
export type Scene = { id: string; from: number; durationInFrames: number; lines: Line[] };
export type Timing = {
  fps: number;
  totalFrames: number;
  bpm: number;
  beatOffset: number;
  beats?: number[];
  scenes: Scene[];
  fallback: boolean;
};

type ScriptScene = { id: string; seconds: number; lines: { voice: string; text: string }[] };
const SCRIPT = script as unknown as { fps: number; scenes: ScriptScene[] };
const FPS = 30;
const MAX_FRAMES = 3540;

// ---- optional JSON (webpack context → no crash when the file does not exist yet) ----
function optionalJson(re: RegExp): unknown | null {
  try {
    const ctx = require.context("./", false, /\.json$/);
    const key = ctx.keys().find((k) => re.test(k));
    return key ? ctx(key) : null;
  } catch {
    return null;
  }
}

const tokenize = (text: string) => text.split(/\s+/).filter(Boolean);

function fallbackTiming(): Timing {
  let from = 0;
  const scenes: Scene[] = SCRIPT.scenes.map((s) => {
    const dur = Math.round(s.seconds * FPS);
    const lead = 14;
    const tail = 22;
    const gap = 12;
    const counts = s.lines.map((l) => tokenize(l.text).length);
    const total = counts.reduce((a, b) => a + b, 0);
    const avail = dur - lead - tail - gap * (s.lines.length - 1);
    let t = from + lead;
    const lines: Line[] = s.lines.map((l, i) => {
      const len = Math.round((avail * counts[i]) / total);
      const toks = tokenize(l.text);
      const weights = toks.map((w) => w.replace(/[^\w]/g, "").length + 2);
      const wsum = weights.reduce((a, b) => a + b, 0);
      let wt = t;
      const words = toks.map((w, k) => {
        const d = (len * weights[k]) / wsum;
        const word = { word: w, start: Math.round(wt), end: Math.round(wt + d * 0.9) };
        wt += d;
        return word;
      });
      const line: Line = {
        voice: l.voice,
        file: `audio/vo/${s.id}_${i}.mp3`,
        startFrame: Math.round(t),
        durationFrames: len,
        words,
        text: l.text,
      };
      t += len + gap;
      return line;
    });
    const scene: Scene = { id: s.id, from, durationInFrames: dur, lines };
    from += dur;
    return scene;
  });
  return { fps: FPS, totalFrames: from, bpm: 100, beatOffset: 0, scenes, fallback: true };
}

type RawTiming = {
  fps?: number;
  totalFrames?: number;
  bpm?: number;
  beatOffset?: number;
  beats?: number[];
  scenes?: {
    id: string;
    from: number;
    durationInFrames: number;
    lines?: { voice: string; file: string; startFrame: number; durationFrames: number; words?: Word[]; text?: string }[];
  }[];
};

function loadTiming(): Timing {
  const raw = optionalJson(/timing\.json$/) as RawTiming | null;
  const fb = fallbackTiming();
  if (!raw || !Array.isArray(raw.scenes) || raw.scenes.length === 0) return fb;
  try {
    const scenes: Scene[] = SCRIPT.scenes.map((ss, si) => {
      // Match by id; if the audio agent used other ids (e.g. "take1"), match by position.
      const r = raw.scenes!.find((x) => x.id === ss.id) ?? raw.scenes![si];
      if (!r) return fb.scenes[si];
      const lines: Line[] = ss.lines.map((sl, li) => {
        const rl = r.lines?.[li];
        if (!rl) return fb.scenes[si].lines[li];
        const words =
          rl.words && rl.words.length
            ? rl.words
            : spreadWords(sl.text, rl.startFrame, rl.durationFrames);
        return {
          voice: rl.voice ?? sl.voice,
          file: rl.file ?? `audio/vo/${ss.id}_${li}.mp3`,
          startFrame: rl.startFrame,
          durationFrames: rl.durationFrames,
          words,
          text: rl.text ?? sl.text,
        };
      });
      return { id: ss.id, from: r.from, durationInFrames: r.durationInFrames, lines };
    });
    const last = scenes[scenes.length - 1];
    const totalFrames = Math.min(MAX_FRAMES, raw.totalFrames ?? last.from + last.durationInFrames);
    return {
      fps: raw.fps ?? FPS,
      totalFrames,
      bpm: raw.bpm ?? 100,
      beatOffset: raw.beatOffset ?? 0,
      beats: raw.beats,
      scenes,
      fallback: false,
    };
  } catch (e) {
    console.warn("timing.json unreadable, using fallback", e);
    return fb;
  }
}

function spreadWords(text: string, start: number, dur: number): Word[] {
  const toks = tokenize(text);
  const step = dur / Math.max(1, toks.length);
  return toks.map((w, i) => ({ word: w, start: Math.round(start + i * step), end: Math.round(start + (i + 0.9) * step) }));
}

export const TIMING = loadTiming();
export const TOTAL_FRAMES = TIMING.totalFrames;

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9$]/g, "");

export function sceneById(id: string): Scene {
  const s = TIMING.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`No scene ${id}`);
  return s;
}

/**
 * Absolute frame at which the nth occurrence of `word` (or a phrase, or any of
 * several alternatives) starts in a scene. Matching is prefix-based on normalised
 * tokens, so "seventy" matches "seventy-two". Falls back gracefully.
 */
export function cue(sceneId: string, word: string | string[], nth = 0, opts: { line?: number; end?: boolean } = {}): number {
  const s = sceneById(sceneId);
  const alts = Array.isArray(word) ? word : [word];
  const lines = opts.line === undefined ? s.lines : [s.lines[opts.line]].filter(Boolean);
  const all = lines.flatMap((l) => l.words);
  for (const alt of alts) {
    const parts = alt.split(/\s+/).map(norm).filter(Boolean);
    const hits: Word[][] = [];
    for (let i = 0; i + parts.length <= all.length; i++) {
      if (parts.every((p, k) => norm(all[i + k].word).startsWith(p))) hits.push(all.slice(i, i + parts.length));
    }
    const h = hits[nth] ?? (nth > 0 ? hits[hits.length - 1] : undefined);
    if (h) return opts.end ? h[h.length - 1].end : h[0].start;
  }
  console.warn(`cue: "${alts.join("|")}" not found in ${sceneId}`);
  const l = lines[0] ?? s.lines[0];
  return l ? l.startFrame : s.from;
}

/** Scene-relative helpers: everything a scene component needs, frames relative to its start. */
export function sceneTiming(id: string) {
  const s = sceneById(id);
  const rel = (f: number) => f - s.from;
  return {
    id,
    from: s.from,
    dur: s.durationInFrames,
    lines: s.lines,
    /** relative start frame of a word cue */
    cue: (w: string | string[], nth = 0, opts: { line?: number; end?: boolean } = {}) => rel(cue(id, w, nth, opts)),
    lineStart: (i: number) => rel(s.lines[i]?.startFrame ?? s.from),
    lineEnd: (i: number) => rel((s.lines[i]?.startFrame ?? s.from) + (s.lines[i]?.durationFrames ?? 0)),
    /** words of a line with relative frames */
    words: (i: number) => (s.lines[i]?.words ?? []).map((w) => ({ ...w, start: rel(w.start), end: rel(w.end) })),
    rel,
  };
}
export type SceneT = ReturnType<typeof sceneTiming>;

// ---- beats ----
export const BEAT = (TIMING.fps * 60) / (TIMING.bpm || 100);

/** All beat frames (absolute). Uses explicit `beats` if the audio agent provided them. */
export function beatFrames(): number[] {
  if (TIMING.beats && TIMING.beats.length) return TIMING.beats;
  const out: number[] = [];
  for (let f = TIMING.beatOffset; f < TIMING.totalFrames; f += BEAT) out.push(Math.round(f));
  return out;
}

/** Snap an absolute frame to the nearest beat within ±tolerance frames. */
export function snapToBeat(f: number, tol = Math.round(BEAT / 2)): number {
  let best = f;
  let d = Infinity;
  for (const b of beatFrames()) {
    const dd = Math.abs(b - f);
    if (dd < d && dd <= tol) {
      d = dd;
      best = b;
    }
  }
  return best;
}

/**
 * Map display text onto a line's timed words. Display text can differ from the spoken
 * tokens (e.g. "$72,000" vs "seventy-two thousand"): matching tokens take their exact
 * cue, the rest take the next spoken word after the previous match.
 */
export function alignWords(display: string, words: Word[]): Word[] {
  const toks = tokenize(display);
  if (!words.length) return toks.map((w) => ({ word: w, start: 0, end: 0 }));
  const idx: number[] = [];
  let p = 0;
  toks.forEach((t) => {
    const n = norm(t);
    let found = -1;
    for (let j = p; j < Math.min(words.length, p + 4) && n; j++) {
      const m = norm(words[j].word);
      if (m && (m.startsWith(n) || n.startsWith(m))) {
        found = j;
        break;
      }
    }
    if (found >= 0) {
      idx.push(found);
      p = found + 1;
    } else {
      idx.push(Math.min(words.length - 1, p));
      p = Math.min(words.length, p + 1);
    }
  });
  return toks.map((w, i) => ({ word: w, start: words[idx[i]].start, end: words[idx[i]].end }));
}
