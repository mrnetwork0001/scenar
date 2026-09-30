import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, CLAMP, EASE_IN, SANS } from "../theme";

/** Rubber-stamp slam: drops from above the lens, hits at `at`, tiny settle. */
export const Stamp: React.FC<{ at: number; text: string; size?: number; rotate?: number; color?: string }> = ({
  at,
  text,
  size = 230,
  rotate = -7,
  color = C.ink,
}) => {
  const f = useCurrentFrame();
  if (f < at - 6) return null;
  const drop = interpolate(f, [at - 6, at], [0, 1], { ...CLAMP, easing: EASE_IN });
  const settle = f >= at ? Math.exp(-(f - at) / 3) * Math.cos((f - at) * 1.4) : 0;
  const scale = f < at ? 2.6 - 1.6 * drop : 1 + settle * 0.035;
  const o = f < at ? drop : 1;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.12,
        padding: `${size * 0.1}px ${size * 0.22}px`,
        border: `${size * 0.07}px solid ${color}`,
        borderRadius: size * 0.16,
        color,
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        opacity: o,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};
