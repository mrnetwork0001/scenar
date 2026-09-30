import React, { useId } from "react";
import { C, MONO } from "../theme";

/* Geometry borrowed from the product's HeroVisual: pivot on the baseline, 180° arc. */
export const GW = 1000;
export const GH = 520;
export const GCX = 500;
export const GCY = 500;
export const GR = 440;

export function polar(r: number, t: number): [number, number] {
  const a = Math.PI * (1 - Math.max(0, Math.min(1, t)));
  return [GCX + r * Math.cos(a), GCY - r * Math.sin(a)];
}
const arcPath = (r: number, t0: number, t1: number) => {
  const [x0, y0] = polar(r, t0);
  const [x1, y1] = polar(r, Math.max(t0 + 0.0001, t1));
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};
/** x position (in %) where the arc reaches a tension value - keeps gradient stops honest. */
const arcX = (t: number) => ((1 - Math.cos((t / 100) * Math.PI)) / 2) * 100;

const TICKS = Array.from({ length: 61 }, (_, i) => {
  const t = i / 60;
  const major = i % 15 === 0;
  const mid = i % 5 === 0;
  const [x1, y1] = polar(GR + 14, t);
  const [x2, y2] = polar(GR + (major ? 44 : mid ? 30 : 22), t);
  return { i, x1, y1, x2, y2, major, mid, t };
});

export type GaugeProps = {
  /** 0-100 */
  value: number;
  width: number;
  tone?: "ink" | "light";
  /** heartbeat envelope 0..1 on the rim */
  pulse?: number;
  labels?: boolean;
  /** 0..1: how much of the instrument is drawn (for draw-on entrances) */
  draw?: number;
  /** multiply stroke widths (thin HUD vs bold card) */
  weight?: number;
  needle?: boolean;
  /** show a small value readout under the pivot */
  readout?: boolean;
  style?: React.CSSProperties;
};

export const Gauge: React.FC<GaugeProps> = ({
  value,
  width,
  tone = "ink",
  pulse = 0,
  labels = true,
  draw = 1,
  weight = 1,
  needle = true,
  readout = false,
  style,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = Math.max(0, Math.min(1, value / 100));
  const line = tone === "light" ? "255,255,255" : "10,10,10";
  const ink = tone === "light" ? "#fff" : C.ink;
  const [nx, ny] = polar(GR - 22, t);
  const hot = value >= 75;
  const height = (width * GH) / GW;
  const tickCount = Math.round(draw * TICKS.length);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${GW} ${GH}`} fill="none" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id={`g${id}`} x1={GCX - GR} y1="0" x2={GCX + GR} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.calm} />
          <stop offset={`${arcX(55)}%`} stopColor={C.tense} />
          <stop offset="100%" stopColor={C.heated} />
        </linearGradient>
      </defs>

      {/* guide arcs */}
      <path d={arcPath(330, 0, draw)} stroke={`rgba(${line},.14)`} strokeWidth={1.4 * weight} />
      <path d={arcPath(220, 0, draw)} stroke={`rgba(${line},.12)`} strokeWidth={1.2 * weight} strokeDasharray="4 10" />
      <path d={arcPath(110, 0, draw)} stroke={`rgba(${line},.14)`} strokeWidth={1.4 * weight} />

      {/* heartbeat rim */}
      {pulse > 0.001 && (
        <path
          d={arcPath(GR + 62 + pulse * 10, 0, 1)}
          stroke={hot ? C.heated : `url(#g${id})`}
          strokeOpacity={0.15 + pulse * 0.75}
          strokeWidth={(2 + pulse * 7) * weight}
          strokeLinecap="round"
        />
      )}

      {TICKS.slice(0, tickCount).map((k) => {
        const lit = k.t <= t + 0.0001;
        return (
          <line
            key={k.i}
            x1={k.x1}
            y1={k.y1}
            x2={k.x2}
            y2={k.y2}
            stroke={lit && k.mid ? ink : `rgba(${line},${k.major ? 0.7 : k.mid ? 0.42 : 0.22})`}
            strokeWidth={(k.major ? 2.6 : k.mid ? 2 : 1.4) * weight}
            strokeLinecap="round"
          />
        );
      })}

      {labels &&
        [0, 25, 50, 75, 100].map((v) => {
          const [x, y] = polar(GR - 34, v / 100);
          if (v / 100 > draw + 0.001) return null;
          return (
            <text key={v} x={x} y={y} fill={`rgba(${line},.45)`} fontFamily={MONO} fontSize={15} textAnchor="middle" dominantBaseline="middle">
              {v}
            </text>
          );
        })}

      {/* track + tension fill up to the needle */}
      <path d={arcPath(GR, 0, draw)} stroke={`rgba(${line},.12)`} strokeWidth={4 * weight} strokeLinecap="round" />
      {t > 0.002 && draw > 0.99 && (
        <path d={arcPath(GR, 0, t)} stroke={`url(#g${id})`} strokeWidth={7 * weight} strokeLinecap="round" />
      )}

      {needle && draw > 0.99 && (
        <g>
          <line x1={GCX} y1={GCY} x2={nx} y2={ny} stroke={ink} strokeWidth={2.4 * weight} strokeLinecap="round" />
          <circle cx={nx} cy={ny} r={4.5 * weight} fill={ink} />
          <circle cx={GCX} cy={GCY} r={16} stroke={ink} strokeWidth={2 * weight} fill={tone === "light" ? "rgba(0,0,0,.2)" : "#fff"} />
          <circle cx={GCX} cy={GCY} r={6} fill={ink} />
        </g>
      )}

      {readout && (
        <text x={GCX} y={GCY - 70} fill={ink} fontFamily="inherit" fontSize={64} fontWeight={300} textAnchor="middle" letterSpacing="-2">
          {Math.round(value)}
        </text>
      )}
    </svg>
  );
};

/** Pixel position of the gauge pivot / needle tip for a gauge drawn at (left, top, width). */
export function gaugePoint(left: number, top: number, width: number, r: number, t: number) {
  const k = width / GW;
  const [x, y] = polar(r, t);
  return { x: left + x * k, y: top + y * k };
}
