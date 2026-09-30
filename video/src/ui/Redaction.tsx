import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, CLAMP, EASE_IN_OUT } from "../theme";

/**
 * Text hidden under a solid bar that retracts (redaction wipe). The bar collapses
 * towards `side`, uncovering the text beneath.
 */
export const Redaction: React.FC<{
  openAt: number;
  frames?: number;
  children: React.ReactNode;
  bar?: string;
  side?: "left" | "right";
  style?: React.CSSProperties;
  pad?: string;
}> = ({ openAt, frames = 16, children, bar = C.ink, side = "right", style, pad = "0.06em 0.12em" }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [openAt, openAt + frames], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  // the text fades up slightly behind the moving edge
  const textO = interpolate(p, [0.05, 0.6], [0, 1], CLAMP);
  return (
    <span style={{ position: "relative", display: "inline-block", padding: pad, ...style }}>
      <span style={{ opacity: textO }}>{children}</span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: bar,
          borderRadius: 4,
          transform: `scaleX(${1 - p})`,
          transformOrigin: side === "right" ? "100% 50%" : "0% 50%",
        }}
      />
    </span>
  );
};
