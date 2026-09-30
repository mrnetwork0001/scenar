"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import styles from "./TensionMeter.module.css";

export interface TensionMeterProps {
  /** 0-100: how heated / resistant the counterpart is. */
  value: number;
  size?: "sm" | "lg";
  /** Visible caption above the label. Defaults to "Tension". */
  caption?: string;
}

/** The tension gradient - the only colour in the product (matches --tension-grad). */
const STOPS: [number, [number, number, number]][] = [
  [0, [16, 185, 129]], // #10b981
  [55, [245, 158, 11]], // #f59e0b
  [100, [239, 68, 68]], // #ef4444
];

export function tensionColor(v: number): string {
  const x = Math.max(0, Math.min(100, v));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      const c = ca.map((n, k) => Math.round(n + (cb[k] - n) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(239, 68, 68)";
}

export function tensionLabel(v: number): string {
  if (v < 25) return "Calm";
  if (v < 50) return "Guarded";
  if (v < 75) return "Tense";
  return "Heated";
}

/* Geometry: semicircle centred at (100,100), radius 80. */
const CX = 100;
const CY = 100;
const R = 80;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const NEEDLE = 62;

/** Point on a circle of radius r at tension t (0 = left, 100 = right). */
function polar(t: number, r: number) {
  const a = Math.PI - (Math.max(0, Math.min(100, t)) / 100) * Math.PI;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

/* A linear gradient in x doesn't advance evenly along an arc - place each stop at
   the x where the arc reaches that tension, so the fill colour matches tensionColor(). */
const arcX = (t: number) => ((1 - Math.cos((t / 100) * Math.PI)) / 2) * 100;

const TICKS = Array.from({ length: 21 }, (_, i) => {
  const t = i * 5;
  const major = t % 25 === 0;
  const a = polar(t, 69);
  const b = polar(t, major ? 62 : 65);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, major };
});

const SPRING = { stiffness: 70, damping: 13, mass: 1 };

export function TensionMeter({ value, size = "lg", caption = "Tension" }: TensionMeterProps) {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  const reduce = useReducedMotion();
  const rawId = useId();
  const gid = `tm-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const color = tensionColor(v);
  const label = tensionLabel(v);

  // One spring drives the needle, the arc fill and the numeral, so they can never drift apart.
  const spring = useSpring(0, SPRING);
  useEffect(() => {
    if (reduce) spring.jump(v);
    else spring.set(v);
  }, [v, reduce, spring]);

  const clamped = useTransform(spring, (n) => Math.max(0, Math.min(100, n)));
  const tipX = useTransform(clamped, (n) => polar(n, NEEDLE).x);
  const tipY = useTransform(clamped, (n) => polar(n, NEEDLE).y);
  const dash = useTransform(clamped, (n) => `${Math.max(n, 0.001)} 100`);
  const arcOpacity = useTransform(clamped, [0, 1.5], [0, 1]);
  const shown = useTransform(clamped, (n) => String(Math.round(n)));

  return (
    <div
      className={`${styles.meter} ${size === "sm" ? styles.sm : styles.lg} ${v >= 75 ? styles.hot : ""}`}
      style={{ ["--tc" as string]: color }}
      role="meter"
      aria-label="Counterpart tension"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-valuetext={`${label}, ${v} out of 100`}
    >
      <svg viewBox="0 0 200 112" className={styles.svg} aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-g`} x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset={`${arcX(55)}%`} stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <path d={ARC} className={styles.track} pathLength={100} />
        {/* Heated: a soft red bloom under the fill - the loudest thing on screen */}
        <motion.path
          d={ARC}
          className={styles.bloom}
          pathLength={100}
          stroke={`url(#${gid}-g)`}
          filter={`url(#${gid}-glow)`}
          style={{ strokeDasharray: dash }}
        />
        <motion.path
          d={ARC}
          className={styles.arc}
          pathLength={100}
          stroke={`url(#${gid}-g)`}
          style={{ strokeDasharray: dash, opacity: arcOpacity }}
        />

        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.major ? styles.tickMajor : styles.tick} />
        ))}

        <Needle x={tipX} y={tipY} />
        <circle cx={CX} cy={CY} r="5.5" className={styles.hub} />
        <circle cx={CX} cy={CY} r="1.8" className={styles.hubDot} />
      </svg>

      <div className={styles.readout}>
        <motion.span className={styles.value}>{shown}</motion.span>
        <span className={styles.caption}>{caption}</span>
        <span key={label} className={styles.label}>
          <span className={styles.labelDot} aria-hidden="true" />
          {label}
        </span>
      </div>
    </div>
  );
}

function Needle({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  return (
    <g className={styles.needle}>
      <motion.line x1={CX} y1={CY} x2={x} y2={y} className={styles.needleBody} />
      <motion.circle cx={x} cy={y} r="2.4" className={styles.needleTip} />
    </g>
  );
}

const DEMO: { value: number; who: string; line: string }[] = [
  { value: 34, who: "You", line: "Thanks, Dana. Before I say yes, can we talk about the base?" },
  { value: 61, who: "Dana", line: "Honestly, $72k is already competitive for a junior role." },
  { value: 84, who: "You", line: "Then I'll need a day to think about other offers." },
  { value: 48, who: "You", line: "Market data puts this role at $80–86k. Can we get to $82k?" },
  { value: 22, who: "Dana", line: "You've done your homework. Let me see what I can do." },
];

/** Self-playing preview of the meter reacting to a conversation. */
export function TensionMeterDemo() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % DEMO.length), 2800);
    return () => window.clearInterval(id);
  }, []);

  const step = DEMO[i];
  return (
    <div className={styles.demo}>
      <TensionMeter value={step.value} size="lg" />
      <p key={i} className={styles.demoLine} aria-live="polite">
        <span className={styles.demoWho}>{step.who}</span>
        {step.line}
      </p>
    </div>
  );
}
