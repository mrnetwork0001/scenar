"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef } from "react";
import styles from "./HeroVisual.module.css";

/* Geometry, in viewBox units. The pivot sits on the baseline; the arc spans 180°. */
const W = 1000;
const H = 520;
const CX = 500;
const CY = 500;
const R = 440;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const STATIC_VALUE = 0.64;

/** Slow calm ↔ heated loop (0 = calm, 1 = heated). */
const LOOP = [0.14, 0.3, 0.24, 0.52, 0.44, 0.78, 0.9, 0.62, 0.36, 0.14];

function polar(r: number, t: number) {
  const a = Math.PI * (1 - t); // t: 0 → left end, 1 → right end
  // Rounded so server and client render identical attribute strings.
  return [Math.round((CX + r * Math.cos(a)) * 100) / 100, Math.round((CY - r * Math.sin(a)) * 100) / 100] as const;
}

/** Arc from the calm end to the needle (≤ 180°, so the small-arc flag always applies). */
function fillArc(t: number) {
  const [x, y] = polar(R, Math.max(0.001, t));
  return `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${x} ${y}`;
}

const TICKS = Array.from({ length: 61 }, (_, i) => {
  const t = i / 60;
  const major = i % 15 === 0;
  const mid = i % 5 === 0;
  const [x1, y1] = polar(R + 14, t);
  const [x2, y2] = polar(R + (major ? 42 : mid ? 30 : 22), t);
  return { i, x1, y1, x2, y2, major, mid };
});

const LABELS = [0, 25, 50, 75, 100].map((v) => {
  const [x, y] = polar(R - 30, v / 100);
  return { v, x, y };
});

const FRAGMENTS: { text: string; you?: boolean; mobile?: boolean }[] = [
  { text: "I was expecting $86,000.", you: true, mobile: true },
  { text: "That’s above our range…", mobile: true },
  { text: "Can we talk about scope first?", you: true },
  { text: "I hear you. But no.", mobile: true },
  { text: "What would make this work?", you: true },
  { text: "Let me be direct with you." },
];

/**
 * Landing hero background: a huge thin-line tension gauge whose needle drifts between
 * calm and heated, with faint conversation fragments surfacing around it.
 * Purely decorative — no pointer events, hidden from assistive tech.
 */
export function HeroVisual() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const inView = useInView(rootRef, { amount: 0.05 });

  const target = useMotionValue(LOOP[0]);
  const value = useSpring(target, { stiffness: 38, damping: 11, mass: 1 });

  // Paint the needle + tinted arc straight from the spring (no React re-renders per frame).
  useEffect(() => {
    const paint = (v: number) => {
      const t = Math.max(0, Math.min(1, v));
      needleRef.current?.setAttribute("transform", `translate(${CX} ${CY}) rotate(${t * 180 - 90})`);
      fillRef.current?.setAttribute("d", fillArc(t));
    };
    paint(value.get());
    return value.on("change", paint);
  }, [value]);

  useEffect(() => {
    if (reduce) {
      target.jump(STATIC_VALUE);
      value.jump(STATIC_VALUE);
      return;
    }
    if (!inView) return;
    const controls = animate(target, LOOP, {
      duration: 26,
      ease: "easeInOut",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [reduce, inView, target, value]);

  const initialT = reduce ? STATIC_VALUE : LOOP[0];

  return (
    <motion.div
      ref={rootRef}
      className={styles.root}
      aria-hidden="true"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.stage}>
        <svg className={styles.gauge} viewBox={`0 0 ${W} ${H}`} fill="none">
          <defs>
            <linearGradient id="hero-tension" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            {/* In the needle's own (rotated) frame: fades out towards the hub. */}
            <linearGradient id="hero-needle" x1="0" y1="0" x2="0" y2={-(R - 18)} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.08" />
              <stop offset="45%" stopColor="#0a0a0a" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Inner guide arcs */}
          <path d={`M ${CX - 330} ${CY} A 330 330 0 0 1 ${CX + 330} ${CY}`} className={styles.guide} />
          <path d={`M ${CX - 220} ${CY} A 220 220 0 0 1 ${CX + 220} ${CY}`} className={styles.guideDashed} />
          <path d={`M ${CX - 110} ${CY} A 110 110 0 0 1 ${CX + 110} ${CY}`} className={styles.guide} />

          {/* Ticks */}
          {TICKS.map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              className={t.major ? styles.tickMajor : t.mid ? styles.tickMid : styles.tick}
            />
          ))}
          {LABELS.map((l) => (
            <text key={l.v} x={l.x} y={l.y} className={styles.num} textAnchor="middle" dominantBaseline="middle">
              {l.v}
            </text>
          ))}

          {/* Track + tension fill up to the needle */}
          <path d={ARC} className={styles.track} />
          <path
            ref={fillRef}
            d={fillArc(initialT)}
            stroke="url(#hero-tension)"
            className={styles.fill}
          />

          {/* Needle */}
          <g ref={needleRef} transform={`translate(${CX} ${CY}) rotate(${initialT * 180 - 90})`}>
            <line x1="0" y1="0" x2="0" y2={-(R - 18)} stroke="url(#hero-needle)" className={styles.needle} />
            <circle cx="0" cy={-(R - 18)} r="3.5" className={styles.tip} />
          </g>
          <circle cx={CX} cy={CY} r="16" className={styles.hubRing} />
          <circle cx={CX} cy={CY} r="6" className={styles.hub} />
        </svg>
      </div>

      <div className={styles.fragments}>
        {FRAGMENTS.map((f, i) => (
          <span
            key={f.text}
            className={`${styles.frag} ${f.you ? styles.you : ""} ${f.mobile ? "" : styles.desktopOnly}`}
            style={{ ["--i" as string]: i }}
          >
            {f.text}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
