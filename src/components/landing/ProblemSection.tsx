"use client";

import { Activity, BookOpen, Crosshair, Users, type LucideIcon } from "lucide-react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef } from "react";
import { Reveal } from "@/components/Reveal";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./ProblemSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";


const PROBLEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Crosshair,
    title: "You get one shot",
    body: "The salary call, the review, the hard no. There is no second take - whatever you say first is what counts." },
  {
    icon: BookOpen,
    title: "Advice doesn’t talk back",
    body: "Articles hand you a script. Real people interrupt, deflect and push back, and the script falls apart." },
  {
    icon: Users,
    title: "Friends go easy on you",
    body: "A friend playing the recruiter breaks character, laughs, and never keeps a poker face." },
  {
    icon: Activity,
    title: "Nerves make you fold",
    body: "Under pressure we hedge, over-apologise, take the first offer, or say yes when we mean no." },
];

/* --- Pulse trace geometry --- */

/** Deterministic PRNG so server and client render identical paths. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * An ECG-style line: calm, evenly spaced beats on the left that grow faster, taller and
 * more erratic after `calmUntil` (0–1 of the width) - the anxiety of the real conversation.
 */
function pulsePath(w: number, h: number, calmUntil: number, seed: number, calmGap: number) {
  const rand = rng(seed);
  const mid = h / 2;
  const calmEnd = w * calmUntil;
  const pts: [number, number][] = [[0, mid]];
  let x = calmGap * 0.45;

  while (x < w - 24) {
    const k = Math.max(0, Math.min(1, (x - calmEnd) / (w - calmEnd)));
    const amp = h * (0.17 + 0.33 * k * (0.75 + 0.5 * rand()));
    const s = 1 - 0.35 * k; // beats get sharper as they speed up
    pts.push([x, mid]);
    pts.push([x + 7 * s, mid - 4 - 3 * k]);
    pts.push([x + 14 * s, mid]);
    pts.push([x + 21 * s, mid + 5 + 6 * k]);
    pts.push([x + 27 * s, mid - amp]);
    pts.push([x + 33 * s, mid + amp * (0.35 + 0.35 * k)]);
    pts.push([x + 39 * s, mid]);
    // Anxious region: extra jitter spikes between beats.
    if (k > 0.15 && rand() < 0.35 + 0.5 * k) {
      const j = x + 50 * s;
      const a2 = h * (0.12 + 0.28 * k * rand());
      pts.push([j, mid]);
      pts.push([j + 4, mid - a2]);
      pts.push([j + 8, mid + a2 * 0.6]);
      pts.push([j + 12, mid]);
    }
    pts.push([x + 54 * s + (k > 0 ? 8 : 0), mid - 5]);
    pts.push([x + 66 * s + (k > 0 ? 8 : 0), mid]);
    const gap = calmGap * (1 - 0.62 * k) * (k > 0 ? 0.8 + 0.4 * rand() : 1);
    x += Math.max(gap, 88 * s + 10);
  }
  pts.push([w, mid]);
  return pts.map(([px, py], i) => `${i ? "L" : "M"}${r1(px)} ${r1(py)}`).join(" ");
}

const DESKTOP = { w: 1440, h: 180, d: pulsePath(1440, 180, 0.46, 7, 168) };
const MOBILE = { w: 390, h: 150, d: pulsePath(390, 150, 0.34, 11, 132) };

function Trace({
  geo,
  progress,
  className,
  gid,
  reduce }: {
  geo: { w: number; h: number; d: string };
  progress: MotionValue<number>;
  className: string;
  gid: string;
  reduce: boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const lenRef = useRef(0);

  // Move the glowing head to the tip of the drawn trace - direct SVG writes, no re-renders.
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    lenRef.current = path.getTotalLength();
    const paint = (p: number) => {
      const pt = path.getPointAtLength(lenRef.current * Math.max(0, Math.min(1, p)));
      headRef.current?.setAttribute("transform", `translate(${r1(pt.x)} ${r1(pt.y)})`);
      headRef.current?.setAttribute("opacity", p > 0.002 && p < 0.998 ? "1" : "0");
    };
    paint(progress.get());
    return progress.on("change", paint);
  }, [progress]);

  return (
    <svg className={className} viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="xMidYMid slice" fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2={geo.w} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0a0a0a" />
          <stop offset="52%" stopColor="#0a0a0a" />
          <stop offset="80%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <line x1="0" y1={geo.h / 2} x2={geo.w} y2={geo.h / 2} className={styles.baseline} />
      <path d={geo.d} className={styles.ghost} />
      <motion.path
        ref={pathRef}
        d={geo.d}
        stroke={`url(#${gid})`}
        className={styles.trace}
        style={{ pathLength: reduce ? 1 : progress }}
      />
      <g ref={headRef} opacity="0">
        <circle r="9" className={styles.headHalo} />
        <circle r="3" className={styles.head} />
      </g>
    </svg>
  );
}

export function ProblemSection() {
  const reduce = useSafeReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const bpmRef = useRef<HTMLSpanElement>(null);
  const live = useInView(stripRef, { amount: 0.2 });

  const { scrollYProgress } = useScroll({ target: stripRef, offset: ["start 0.95", "end 0.3"] });
  const drawn = useTransform(scrollYProgress, [0, 1], [0, 1], { clamp: true });
  const bpm = useTransform(drawn, [0, 0.45, 1], [64, 72, 138]);

  useMotionValueEvent(bpm, "change", (v) => {
    if (bpmRef.current && !reduce) bpmRef.current.textContent = String(Math.round(v));
  });
  useEffect(() => {
    if (reduce && bpmRef.current) bpmRef.current.textContent = "138";
  }, [reduce]);

  return (
    <section id="problem" className={sectionStyles.section} aria-labelledby="problem-title">
      <div className={sectionStyles.inner}>
        <SectionHeader
          id="problem"
          eyebrow="The problem"
          title="The conversations that shape your career get zero rehearsal."
          sub="You prepare for the exam, the interview, the presentation. Then the moment that moves your salary or your boundaries arrives - and you improvise."
        />
      </div>

      {/* Decorative monitor strip: a pulse that ticks calmly, then spikes as you scroll. */}
      <div
        ref={stripRef}
        className={`${styles.strip} ${live && !reduce ? styles.live : ""}`}
        aria-hidden="true"
      >
        <div className={styles.stripMeta}>
          <span className={styles.metaLeft}>
            <span className={styles.rec} />
            Take 1 of 1
          </span>
          <span className={styles.metaRight}>
            <span ref={bpmRef} className={styles.bpm}>
              64
            </span>
            <span className={styles.bpmUnit}>bpm</span>
          </span>
        </div>
        <Trace geo={DESKTOP} progress={drawn} className={styles.svgDesktop} gid="pulse-d" reduce={reduce} />
        <Trace geo={MOBILE} progress={drawn} className={styles.svgMobile} gid="pulse-m" reduce={reduce} />
      </div>

      <div className={sectionStyles.inner}>
        <ul className={styles.grid}>
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal as="li" key={p.title} delay={i * 0.1} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.icon}>
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className={styles.index} aria-hidden="true">
                    0{i + 1}
                  </span>
                </div>
                <h3 className={styles.cardTitle}>{p.title}</h3>
                <p className={styles.cardBody}>{p.body}</p>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
