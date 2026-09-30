import React from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { C, H, W } from "../theme";

/**
 * Needle wipe: the gauge needle pivots on the bottom edge and sweeps 180°, uncovering
 * the incoming scene in the wedge behind it.
 */
type NeedleProps = { ink: string; pivotX: number; pivotY: number };

export function wedgePolygon(p: number, px = W / 2, py = H, r = 2600): string {
  const pts = [`${px}px ${py}px`];
  const end = Math.PI - p * Math.PI;
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (end - Math.PI) * (i / steps);
    pts.push(`${px + Math.cos(a) * r}px ${py - Math.sin(a) * r}px`);
  }
  return `polygon(${pts.join(",")})`;
}

export const NeedleOverlay: React.FC<{ p: number; ink?: string; px?: number; py?: number }> = ({ p, ink = C.ink, px = W / 2, py = H }) => {
  if (p <= 0 || p >= 1) return null;
  const a = Math.PI - p * Math.PI;
  const len = 2200;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <line x1={px} y1={py} x2={px + Math.cos(a) * len} y2={py - Math.sin(a) * len} stroke={ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={px} cy={py} r={34} fill="#fff" stroke={ink} strokeWidth={5} />
      <circle cx={px} cy={py} r={12} fill={ink} />
    </svg>
  );
};

const NeedleWipe: React.FC<TransitionPresentationComponentProps<NeedleProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = presentationProgress;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: p >= 1 ? undefined : wedgePolygon(p, passedProps.pivotX, passedProps.pivotY) }}>{children}</AbsoluteFill>
      <NeedleOverlay p={p} ink={passedProps.ink} px={passedProps.pivotX} py={passedProps.pivotY} />
    </AbsoluteFill>
  );
};

export const needleWipe = (props: Partial<NeedleProps> = {}): TransitionPresentation<NeedleProps> => ({
  component: NeedleWipe,
  props: { ink: C.ink, pivotX: W / 2, pivotY: H, ...props },
});

/** Redaction wipe: a black bar slides across, then retracts off the far side. */
type BarProps = { bar: string };
const BarWipe: React.FC<TransitionPresentationComponentProps<BarProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const cover = p < 0.5;
  const k = cover ? p / 0.5 : 1 - (p - 0.5) / 0.5;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: cover ? 0 : 1 }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          background: passedProps.bar,
          transform: `scaleX(${k})`,
          transformOrigin: cover ? "0% 50%" : "100% 50%",
        }}
      />
    </AbsoluteFill>
  );
};
export const barWipe = (bar: string = C.ink): TransitionPresentation<BarProps> => ({ component: BarWipe, props: { bar } });
