import React from "react";
import { AbsoluteFill, Freeze, random, useCurrentFrame } from "remotion";
import { MONO } from "../theme";

/**
 * Tape rewind: renders `children` frozen at `srcFrame(f)` (so any scene can literally
 * play backwards), with horizontal scan-offset slices whose strength is `amount(f)`.
 */
export const Rewind: React.FC<{
  srcFrame: (f: number) => number;
  amount: (f: number) => number;
  children: React.ReactNode;
  osd?: boolean;
}> = ({ srcFrame, amount, children, osd = true }) => {
  const f = useCurrentFrame();
  const a = amount(f);
  const sf = Math.max(0, Math.round(srcFrame(f)));
  const bands = a > 0.02 ? 5 : 0;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: `grayscale(${0.3 + a * 0.6}) contrast(${1 + a * 0.25})` }}>
        <Freeze frame={sf}>{children}</Freeze>
      </AbsoluteFill>
      {Array.from({ length: bands }).map((_, i) => {
        const y = random(`by${i}-${Math.floor(f / 2)}`) * 1000;
        const hgt = 20 + random(`bh${i}-${Math.floor(f / 2)}`) * 120 * a;
        const dx = (random(`bx${i}-${f}`) - 0.3) * 220 * a;
        return (
          <AbsoluteFill
            key={i}
            style={{
              clipPath: `inset(${y}px 0 ${Math.max(0, 1080 - y - hgt)}px 0)`,
              transform: `translateX(${dx}px)`,
              filter: `grayscale(1) brightness(${1.1 + a * 0.4})`,
            }}
          >
            <Freeze frame={Math.max(0, sf - 3)}>{children}</Freeze>
          </AbsoluteFill>
        );
      })}
      {/* tracking line: a thin bright band rolling up the frame */}
      {a > 0.05 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1080 - ((f * 47) % 1300),
            height: 6 + a * 14,
            background: `rgba(255,255,255,${0.35 * a})`,
          }}
        />
      )}
      {osd && a > 0.02 && (
        <div style={{ position: "absolute", left: 72, top: 60, fontFamily: MONO, fontSize: 40, color: "#fff", letterSpacing: "0.04em", opacity: Math.floor(f / 6) % 2 ? 1 : 0.55 }}>
          ◀◀ REWIND
        </div>
      )}
    </AbsoluteFill>
  );
};
