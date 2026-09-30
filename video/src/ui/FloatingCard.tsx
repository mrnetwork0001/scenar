import React from "react";
import { C } from "../theme";

/** A card placed in 2.5D: perspective lives on the parent (<Stage>), depth here. */
export const FloatingCard: React.FC<{
  x: number;
  y: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  w: number;
  h?: number;
  opacity?: number;
  dark?: boolean;
  radius?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, z = 0, rx = 0, ry = 0, rz = 0, w, h, opacity = 1, dark = false, radius = 28, children, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      opacity,
      transform: `translate3d(-50%, -50%, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
      transformStyle: "preserve-3d",
      background: dark ? C.ink : C.white,
      color: dark ? "#fff" : C.ink,
      border: dark ? "none" : `1.5px solid ${C.g08}`,
      borderRadius: radius,
      boxShadow: "0 40px 80px -30px rgba(10,10,10,.28), 0 12px 24px -12px rgba(10,10,10,.12)",
      boxSizing: "border-box",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Stage: React.FC<{ perspective?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  perspective = 1800,
  children,
  style,
}) => (
  <div style={{ position: "absolute", inset: 0, perspective, perspectiveOrigin: "50% 45%", ...style }}>
    <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>{children}</div>
  </div>
);
