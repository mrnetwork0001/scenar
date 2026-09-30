import React, { createContext, useContext } from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, useCurrentFrame } from "remotion";
import { clip, has, src, stockFile } from "./assets";
import { MOCKS } from "./mocks";
import { C, MONO } from "./theme";

/** Clip lengths (frames) measured in calculateMetadata, keyed by public path. */
export const MetaCtx = createContext<Record<string, number>>({});
export const useMeta = () => useContext(MetaCtx);

// stock arrives pre-graded; pull saturation further so the tension gradient stays the
// only colour on screen (Maya's phone is red in two clips)
const GRADE = "saturate(.5) contrast(1.05) brightness(.94)";

/**
 * Full-bleed stock shot, graded toward neutral. Too short a clip is slowed (down to
 * 0.55x) and then holds its last frame; `freezeAt` freezes it on purpose.
 */
export const Stock: React.FC<{
  name: string;
  window: number;
  freezeAt?: number;
  startFrom?: number;
  shade?: number;
  zoom?: [number, number];
  style?: React.CSSProperties;
}> = ({ name, window, freezeAt, startFrom = 0, shade = 0.28, zoom = [1.04, 1.1], style }) => {
  const f = useCurrentFrame();
  const meta = useMeta();
  const file = stockFile(name);
  const real = has(file);
  const clipFrames = meta[file] ?? 240;
  const rate = Math.max(0.55, Math.min(1, (clipFrames - startFrom - 2) / Math.max(1, window)));
  const lastPlayable = Math.floor((clipFrames - startFrom - 2) / rate);
  const freezeFrame = Math.min(freezeAt ?? Infinity, lastPlayable);
  const z = zoom[0] + (zoom[1] - zoom[0]) * Math.min(1, Math.min(f, freezeFrame) / Math.max(1, window));

  return (
    <AbsoluteFill style={{ background: "#1b1b1d", overflow: "hidden", ...style }}>
      <AbsoluteFill style={{ transform: `scale(${z})` }}>
        {real ? (
          <Freeze frame={Math.max(0, freezeFrame)} active={f >= freezeFrame}>
            <OffthreadVideo
              src={src(file)}
              muted
              playbackRate={rate}
              startFrom={startFrom}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: GRADE }}
            />
          </Freeze>
        ) : (
          <StockPlaceholder name={name} frame={Math.min(f, freezeFrame)} />
        )}
      </AbsoluteFill>
      {shade > 0 && <AbsoluteFill style={{ background: `rgba(10,10,10,${shade})` }} />}
    </AbsoluteFill>
  );
};

/** Neutral stand-in until the stock agent delivers: flat greys, a simple figure. */
const StockPlaceholder: React.FC<{ name: string; frame: number }> = ({ name, frame }) => {
  const sway = Math.sin(frame / 40) * 6;
  const night = name.includes("night") || name.includes("anxious");
  const bg = night ? "#2b2b2e" : "#6b6b70";
  const fig = night ? "#3b3b3f" : "#88888d";
  return (
    <AbsoluteFill style={{ background: bg }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <rect x="0" y="760" width="1920" height="320" fill={night ? "#232326" : "#5d5d62"} />
        <g transform={`translate(${1180 + sway} 0)`}>
          <circle cx="0" cy="360" r="120" fill={fig} />
          <path d="M -260 1080 C -250 640, 250 640, 260 1080 Z" fill={fig} />
        </g>
        {night && <rect x="420" y="560" width="520" height="330" rx="14" fill="#48484d" />}
      </svg>
      <div style={{ position: "absolute", left: 40, bottom: 34, fontFamily: MONO, fontSize: 18, color: "rgba(255,255,255,.35)" }}>
        stock · {name}
      </div>
    </AbsoluteFill>
  );
};

/**
 * A product clip at its native pixel size (for use inside <Camera>). Real footage when
 * present, otherwise a drawn mock with the same geometry and rect names. `map` turns
 * the scene frame into a source frame (speed ramps, holds); default is 1x from 0.
 */
export const ClipView: React.FC<{ name: string; map?: (f: number) => number }> = ({ name, map }) => {
  const f = useCurrentFrame();
  const c = clip(name);
  const srcFrame = Math.round(Math.max(0, Math.min(c.durationFrames - 2, map ? map(f) : f)));
  const Mock = MOCKS[name];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: c.width, height: c.height, background: C.white, overflow: "hidden" }}>
      {c.real ? (
        <Freeze frame={srcFrame}>
          <OffthreadVideo src={src(c.file)} muted style={{ width: c.width, height: c.height }} />
        </Freeze>
      ) : Mock ? (
        <Mock t={srcFrame} w={c.width} h={c.height} />
      ) : null}
    </div>
  );
};
