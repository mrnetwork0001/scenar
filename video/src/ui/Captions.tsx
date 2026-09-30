import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CLAMP, SANS } from "../theme";
import type { Word } from "../timing";

/**
 * Minimal burned-in dialogue captions for silent autoplay: large, high contrast, the
 * current phrase only (words light up as they are spoken).
 */
export const Captions: React.FC<{ words: Word[]; speaker?: string; dark?: boolean; bottom?: number; maxWords?: number; left?: number; width?: number }> = ({
  words,
  speaker,
  dark = true,
  bottom = 96,
  maxWords = 9,
  left,
  width = 1500,
}) => {
  const f = useCurrentFrame();
  if (!words.length) return null;
  const first = words[0].start;
  const last = words[words.length - 1].end;
  if (f < first - 4 || f > last + 20) return null;
  // chunk into phrases, show the chunk containing the current word
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w) => {
    cur.push(w);
    if (cur.length >= maxWords || /[.?!,]$/.test(w.word) && cur.length >= 3) {
      chunks.push(cur);
      cur = [];
    }
  });
  if (cur.length) chunks.push(cur);
  let chunk = chunks[0];
  for (const c of chunks) if (f >= c[0].start - 2) chunk = c;
  const o = interpolate(f, [first - 4, first, last + 10, last + 20], [0, 1, 1, 0], CLAMP);
  const fg = dark ? "#fff" : "#0a0a0a";
  return (
    <div style={{ position: "absolute", left: left ?? 0, right: left === undefined ? 0 : undefined, bottom, display: "flex", justifyContent: left === undefined ? "center" : "flex-start", opacity: o }}>
      <div style={{ fontFamily: SANS, fontSize: 50, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.2, color: fg, textAlign: left === undefined ? "center" : "left", maxWidth: width, textShadow: dark ? "0 2px 18px rgba(0,0,0,.55)" : undefined }}>
        {speaker && <span style={{ fontWeight: 600, marginRight: 18 }}>{speaker}</span>}
        {chunk.map((w, i) => (
          <span key={i} style={{ opacity: f >= w.start ? 1 : 0.35 }}>
            {w.word}{" "}
          </span>
        ))}
      </div>
    </div>
  );
};
