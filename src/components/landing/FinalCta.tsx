"use client";

import { IconArrowUpRight } from "@/components/icons";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ScrollLink } from "@/components/ScrollLink";
import { sectionStyles } from "./SectionHeader";
import styles from "./FinalCta.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Gauge geometry (viewBox units). The pivot sits on the section's bottom edge. */
const W = 1360;
const H = 640;
const CX = 680;
const CY = 640;
const R = 540;

const HEATED = 0.84;
const CALM = 0.12;

function polar(r: number, t: number) {
  const a = Math.PI * (1 - t);
  return [Math.round((CX + r * Math.cos(a)) * 100) / 100, Math.round((CY - r * Math.sin(a)) * 100) / 100] as const;
}

function fillArc(t: number) {
  const [x, y] = polar(R, Math.max(0.001, Math.min(1, t)));
  return `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${x} ${y}`;
}

const TICKS = Array.from({ length: 49 }, (_, i) => {
  const t = i / 48;
  const major = i % 12 === 0;
  const [x1, y1] = polar(R + 12, t);
  const [x2, y2] = polar(R + (major ? 36 : i % 4 === 0 ? 26 : 18), t);
  return { i, x1, y1, x2, y2, major };
});

const [CALM_X, CALM_Y] = polar(R + 70, 0.05);
const [HOT_X, HOT_Y] = polar(R + 70, 0.95);

/** Concentric thin arcs sweeping slowly, with a needle that springs from "heated" down to "calm". */
function CtaGauge() {
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const inView = useInView(rootRef, { amount: 0.25 });
  const seenOnce = useInView(rootRef, { amount: 0.35, once: true });

  const target = useMotionValue(reduce ? CALM : HEATED);
  const value = useSpring(target, { stiffness: 34, damping: 7, mass: 1 });
  const calmOpacity = useTransform(value, [CALM + 0.06, 0.45], [1, 0.35]);
  const hotOpacity = useTransform(value, [0.45, HEATED], [0.35, 1]);

  useEffect(() => {
    const paint = (v: number) => {
      const t = Math.max(0, Math.min(1, v));
      needleRef.current?.setAttribute("transform", `translate(${CX} ${CY}) rotate(${t * 180 - 90})`);
      fillRef.current?.setAttribute("d", fillArc(t));
    };
    paint(value.get());
    return value.on("change", paint);
  }, [value]);

  // Settle into calm the first time it's seen…
  useEffect(() => {
    if (reduce) {
      target.jump(CALM);
      value.jump(CALM);
      return;
    }
    if (!seenOnce) return;
    const id = window.setTimeout(() => target.set(CALM), 500);
    return () => window.clearTimeout(id);
  }, [reduce, seenOnce, target, value]);

  // …then breathe gently around it while visible.
  useEffect(() => {
    if (reduce || !seenOnce || !inView) return;
    let controls: ReturnType<typeof animate> | undefined;
    const id = window.setTimeout(() => {
      controls = animate(target, [CALM, 0.17, 0.1, 0.15, CALM], {
        duration: 12,
        ease: "easeInOut",
        repeat: Infinity,
      });
    }, 3200);
    return () => {
      window.clearTimeout(id);
      controls?.stop();
    };
  }, [reduce, seenOnce, inView, target]);

  const initialT = reduce ? CALM : HEATED;

  return (
    <div ref={rootRef} className={styles.gauge} data-anim={(inView && !reduce) || undefined} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} fill="none" className={styles.svg}>
        <defs>
          <linearGradient id="cta-tension" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="cta-needle" x1="0" y1="0" x2="0" y2={-(R - 20)} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Sweeping concentric rings */}
        <g className={`${styles.ring} ${styles.spinA}`}>
          <circle cx={CX} cy={CY} r={460} className={styles.dashLong} />
        </g>
        <g className={`${styles.ring} ${styles.spinB}`}>
          <circle cx={CX} cy={CY} r={380} className={styles.dashDot} />
        </g>
        <g className={`${styles.ring} ${styles.spinC}`}>
          <circle cx={CX} cy={CY} r={290} className={styles.dashMid} />
        </g>
        <circle cx={CX} cy={CY} r={200} className={styles.guide} />
        <circle cx={CX} cy={CY} r={110} className={styles.guide} />

        {/* Sweeping highlight wedge on the outer ring */}
        <g className={`${styles.ring} ${styles.sweep}`}>
          <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${polar(R, 0.14)[0]} ${polar(R, 0.14)[1]}`} className={styles.sweepArc} />
        </g>

        {/* Ticks + track */}
        {TICKS.map((t) => (
          <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.major ? styles.tickMajor : styles.tick} />
        ))}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} className={styles.track} />
        <path ref={fillRef} d={fillArc(initialT)} stroke="url(#cta-tension)" className={styles.fill} />

        <motion.text x={CALM_X} y={CALM_Y} className={styles.label} textAnchor="middle" style={{ opacity: calmOpacity }}>
          Calm
        </motion.text>
        <motion.text x={HOT_X} y={HOT_Y} className={styles.label} textAnchor="middle" style={{ opacity: hotOpacity }}>
          Heated
        </motion.text>

        {/* Needle */}
        <g ref={needleRef} transform={`translate(${CX} ${CY}) rotate(${initialT * 180 - 90})`}>
          <line x1="0" y1="0" x2="0" y2={-(R - 20)} stroke="url(#cta-needle)" className={styles.needle} />
          <circle cx="0" cy={-(R - 20)} r="4" className={styles.tip} />
        </g>
        <circle cx={CX} cy={CY} r="20" className={styles.hubRing} />
        <circle cx={CX} cy={CY} r="7" className={styles.hub} />
      </svg>
    </div>
  );
}

export function FinalCta() {
  const reduce = useSafeReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 20 } as const),
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "0px 0px -10% 0px" },
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <section
      id="start"
      className={`${sectionStyles.section} ${sectionStyles.inverse} ${styles.section}`}
      aria-labelledby="start-title"
    >
      <CtaGauge />
      <div className={styles.scrim} aria-hidden="true" />

      <div className={`${sectionStyles.inner} ${styles.content}`}>
        <motion.p className="eyebrow" {...rise(0)}>
          Get started
        </motion.p>
        <motion.h2 id="start-title" className={styles.title} {...rise(0.1)}>
          <span>Your next hard conversation is coming.</span>{" "}
          <span className={styles.titleDim}>Rehearse it first.</span>
        </motion.h2>
        <motion.div className={styles.actions} {...rise(0.2)}>
          <Link href="/app" className={`btn ${styles.btnWhite}`}>
            Launch app
            <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
          <ScrollLink href="#pricing" className={`btn ${styles.btnGhostWhite}`}>
            See pricing
          </ScrollLink>
        </motion.div>
        <motion.p className={styles.note} {...rise(0.3)}>
          Free to start · No sign-up · No card
        </motion.p>
      </div>
    </section>
  );
}
