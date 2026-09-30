import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

/**
 * Scenar mark: two rounded bars leaning at -35°. `at` = frame the bars start drawing;
 * each bar grows along its own axis from the baseline (spring, no overshoot).
 */
export const Mark: React.FC<{ size: number; at?: number; color?: string; style?: React.CSSProperties }> = ({
  size,
  at = -999,
  color = C.ink,
  style,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - at, fps, config: { damping: 200, stiffness: 120 }, durationInFrames: 16 });
  const b = spring({ frame: f - at - 5, fps, config: { damping: 200, stiffness: 120 }, durationInFrames: 16 });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible", ...style }}>
      <g transform="rotate(-35 16 16)" fill={color}>
        {a > 0.001 && <rect x="7.5" y={4 + 24 * (1 - a)} width="7.5" height={Math.max(7.5, 24 * a)} rx="3.75" opacity={Math.min(1, a * 3)} />}
        {b > 0.001 && <rect x="17" y={9 + 15 * (1 - b)} width="7.5" height={Math.max(7.5, 15 * b)} rx="3.75" opacity={Math.min(1, b * 3)} />}
      </g>
    </svg>
  );
};
