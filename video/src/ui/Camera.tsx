import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Rect } from "../assets";
import { CLAMP, EASE_IN_OUT, H, W } from "../theme";

export type CamKey = {
  at: number;
  /** region of the source to frame; null/undefined = full-bleed cover */
  rect?: Rect | null;
  /** padding fraction around the rect (0.1 = 10%) */
  pad?: number;
  /** extra zoom multiplier */
  zoom?: number;
  /** move duration into this key */
  move?: number;
  /** screen-space offset of the framed region (px), e.g. to leave room for an overlay */
  dx?: number;
  dy?: number;
  /** allow framing beyond the source edges (the page background is white anyway) */
  free?: boolean;
};

type Cam = { cx: number; cy: number; s: number };

export function camFor(k: CamKey, sw: number, sh: number, vw = W, vh = H): Cam {
  if (!k.rect) {
    const s = Math.max(vw / sw, vh / sh) * (k.zoom ?? 1);
    return clampCam({ cx: sw / 2, cy: sh / 2, s }, sw, sh, vw, vh);
  }
  const pad = k.pad ?? 0.08;
  const r = k.rect;
  const s = Math.min(vw / r.w, vh / r.h) * (1 - pad) * (k.zoom ?? 1);
  const c = { cx: r.x + r.w / 2 - (k.dx ?? 0) / s, cy: r.y + r.h / 2 - (k.dy ?? 0) / s, s };
  return k.free ? c : clampCam(c, sw, sh, vw, vh);
}

function clampCam(c: Cam, sw: number, sh: number, vw: number, vh: number): Cam {
  // never show outside the source when it is large enough to fill the frame
  const s = Math.max(c.s, Math.max(vw / sw, vh / sh));
  const hx = vw / (2 * s);
  const hy = vh / (2 * s);
  return {
    s,
    cx: sw >= 2 * hx ? Math.min(sw - hx, Math.max(hx, c.cx)) : sw / 2,
    cy: sh >= 2 * hy ? Math.min(sh - hy, Math.max(hy, c.cy)) : sh / 2,
  };
}

const mix = (a: Cam, b: Cam, p: number): Cam => ({
  cx: a.cx + (b.cx - a.cx) * p,
  cy: a.cy + (b.cy - a.cy) * p,
  s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p),
});

/** Camera state at frame f: eases key to key; a new key interrupts a move smoothly. */
export function cameraAt(f: number, keys: CamKey[], sw: number, sh: number, drift = 0, vw = W, vh = H): Cam {
  const ks = [...keys].sort((a, b) => a.at - b.at);
  if (!ks.length) return camFor({ at: 0 }, sw, sh, vw, vh);
  let from = camFor(ks[0], sw, sh, vw, vh);
  let to = from;
  let t0 = -1e9;
  let move = 1;
  const val = (fr: number) => mix(from, to, interpolate(fr, [t0, t0 + move], [0, 1], { ...CLAMP, easing: EASE_IN_OUT }));
  let last = ks[0].at;
  for (let i = 1; i < ks.length && ks[i].at <= f; i++) {
    const cur = val(ks[i].at);
    from = cur;
    to = camFor(ks[i], sw, sh, vw, vh);
    t0 = ks[i].at;
    move = ks[i].move ?? 24;
    last = ks[i].at;
  }
  const c = val(f);
  if (drift) {
    const k = 1 + drift * Math.max(0, f - last);
    return { ...c, s: c.s * k };
  }
  return c;
}

/** Renders `children` (laid out at the source's native size) through the virtual camera. */
export const Camera: React.FC<{
  sw: number;
  sh: number;
  keys: CamKey[];
  drift?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** viewport size (defaults to the full frame) */
  vw?: number;
  vh?: number;
}> = ({ sw, sh, keys, drift = 0, children, style, vw = W, vh = H }) => {
  const f = useCurrentFrame();
  const c = cameraAt(f, keys, sw, sh, drift, vw, vh);
  const tx = vw / 2 - c.cx * c.s;
  const ty = vh / 2 - c.cy * c.s;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: sw,
          height: sh,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${c.s})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Where a source-space rect lands on screen for the camera at frame f. */
export function projectRect(r: Rect, f: number, keys: CamKey[], sw: number, sh: number, drift = 0) {
  const c = cameraAt(f, keys, sw, sh, drift);
  return {
    x: W / 2 + (r.x - c.cx) * c.s,
    y: H / 2 + (r.y - c.cy) * c.s,
    w: r.w * c.s,
    h: r.h * c.s,
  };
}
