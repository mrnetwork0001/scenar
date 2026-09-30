"use client";

import { animate, motion, useInView, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { RadarChart } from "@/components/RadarChart";
import { Reveal } from "@/components/Reveal";
import { tensionColor, tensionLabel } from "@/components/TensionMeter";
import { METRIC_LABELS, type MetricKey, type Metrics } from "@/lib/types";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./SkillsSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";


const EASE = [0.16, 1, 0.3, 1] as const;
const KEYS = Object.keys(METRIC_LABELS) as MetricKey[];

const DEFINITIONS: Record<MetricKey, string> = {
  assertiveness: "Clear asks, specific numbers, no hedging.",
  regulation: "Composure under pressure. No over-apologising, no heat.",
  clarity: "Specific, concise and structured. One point at a time.",
  boundaries: "Holding a line and proposing trade-offs instead of caving." };

/** Two illustrative profiles for the same moment, one reply apart. */
const PROFILES = [
  {
    id: "hedging",
    label: "Hedging",
    line: "Sorry, I was maybe hoping for a bit more? If that’s okay…",
    tip: "Name a number. “A bit more” gives them nothing to say yes to.",
    metrics: { assertiveness: 24, regulation: 52, clarity: 34, boundaries: 20 } },
  {
    id: "composed",
    label: "Composed",
    line: "Based on the market for this role, I’m asking for $84,000.",
    tip: "Strong anchor. Now stop talking and let them respond first.",
    metrics: { assertiveness: 86, regulation: 80, clarity: 88, boundaries: 72 } },
] as const satisfies readonly { id: string; label: string; line: string; tip: string; metrics: Metrics }[];

const ZONES = ["Calm", "Guarded", "Tense", "Heated"] as const;
const TENSION_LOOP = [18, 38, 62, 84, 57, 30];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixMetrics(t: number): Metrics {
  const a = PROFILES[0].metrics;
  const b = PROFILES[1].metrics;
  return {
    assertiveness: lerp(a.assertiveness, b.assertiveness, t),
    regulation: lerp(a.regulation, b.regulation, t),
    clarity: lerp(a.clarity, b.clarity, t),
    boundaries: lerp(a.boundaries, b.boundaries, t) };
}

export function SkillsSection() {
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { amount: 0.2 });
  const seen = useInView(rootRef, { amount: 0.2, once: true });

  // 0 = hedging, 1 = composed. One motion value drives radar, bars and numerals together;
  // `grow` fills the bars the first time the section is seen.
  const mix = useMotionValue(0);
  const grow = useMotionValue(0);
  const [mixV, setMixV] = useState(0);
  const [growV, setGrowV] = useState(0);
  const [profileState, setProfile] = useState(0);
  const [active, setActive] = useState(0);
  const [tensionI, setTensionI] = useState(0);

  useMotionValueEvent(mix, "change", setMixV);
  useMotionValueEvent(grow, "change", setGrowV);

  // Reduced motion: static composed end state.
  const profile = reduce ? 1 : profileState;
  const metricsRaw = mixMetrics(reduce ? 1 : mixV);
  const g = reduce ? 1 : growV;
  const tension = reduce ? 62 : TENSION_LOOP[tensionI];

  useEffect(() => {
    if (reduce || !seen) return;
    const controls = animate(grow, 1, { duration: 1.6, ease: EASE, delay: 0.3 });
    return () => controls.stop();
  }, [seen, reduce, grow]);

  // Profile flips every 5s while in view.
  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setInterval(() => setProfile((p) => (p === 0 ? 1 : 0)), 5000);
    return () => window.clearInterval(id);
  }, [reduce, inView, profileState]);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(mix, profileState, { duration: 1.4, ease: EASE });
    return () => controls.stop();
  }, [profileState, reduce, mix]);

  // Highlight cycles through the skills; the tension marker walks its own loop.
  useEffect(() => {
    if (reduce || !inView) return;
    const a = window.setInterval(() => setActive((n) => (n + 1) % KEYS.length), 2500);
    const b = window.setInterval(() => setTensionI((n) => (n + 1) % TENSION_LOOP.length), 2200);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [reduce, inView]);

  const metrics = metricsRaw;
  const current = PROFILES[profile];
  const other = PROFILES[profile === 0 ? 1 : 0];

  return (
    <section
      ref={rootRef}
      id="skills"
      className={`${sectionStyles.section} ${sectionStyles.muted} ${styles.section}`}
      aria-labelledby="skills-title"
      data-live={inView && !reduce ? "true" : "false"}
    >
      <PolarGrid />

      <div className={sectionStyles.inner}>
        <SectionHeader
          id="skills"
          eyebrow="What gets measured"
          title="Four skills, scored on every message."
          sub="Not just whether you won. Every reply you send is scored live, so you can see exactly which sentence moved the room."
        />

        <div className={styles.grid}>
          <div className={styles.left}>
            <ol className={styles.skills}>
              {KEYS.map((k, i) => {
                const value = metrics[k];
                const isActive = i === active;
                return (
                  <Reveal as="li" key={k} delay={0.08 * i} className={`${styles.skill} ${isActive ? styles.active : ""}`}>
                    <div className={styles.skillHead}>
                      <span className={styles.skillIndex}>{String(i + 1).padStart(2, "0")}</span>
                      <h3 className={styles.skillName}>{METRIC_LABELS[k]}</h3>
                      <span className={styles.skillValue} aria-hidden="true">
                        {Math.round(value * g)}
                      </span>
                    </div>
                    <p className={styles.skillDef}>{DEFINITIONS[k]}</p>
                    <div className={styles.bar} aria-hidden="true">
                      <span className={styles.barFill} style={{ transform: `scaleX(${(value / 100) * g})` }} />
                      <motion.span
                        className={styles.barSheen}
                        initial={false}
                        animate={{ opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                      />
                    </div>
                  </Reveal>
                );
              })}
            </ol>

            <Reveal delay={0.35} className={styles.coach}>
              <span className={styles.coachHead}>
                <span className={styles.coachDot} aria-hidden="true" />
                Coach · after every message
              </span>
              <motion.p
                key={current.id}
                className={styles.coachTip}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
              >
                {current.tip}
              </motion.p>
            </Reveal>
          </div>

          <Reveal delay={0.15} className={styles.panel}>
            <div className={styles.panelTop}>
              <span className={styles.panelLabel}>Same moment, two replies</span>
              <div className={styles.segment} role="group" aria-label="Example reply">
                {PROFILES.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.segBtn} ${profile === i ? styles.segOn : ""}`}
                    aria-pressed={profile === i}
                    onClick={() => setProfile(i)}
                  >
                    {profile === i && (
                      <motion.span
                        layoutId="skills-seg"
                        className={styles.segPill}
                        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
                      />
                    )}
                    <span className={styles.segText}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.quoteWrap} aria-live="polite">
              <motion.p
                key={current.id}
                className={styles.quote}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                “{current.line}”
              </motion.p>
            </div>

            <div className={styles.radar}>
              {seen || reduce ? (
                <RadarChart metrics={metrics} compare={other.metrics} />
              ) : (
                <div className={styles.radarPlaceholder} />
              )}
            </div>

            <div className={styles.legend} aria-hidden="true">
              <span><i className={styles.legendNow} /> {current.label}</span>
              <span><i className={styles.legendPrev} /> {other.label}</span>
            </div>

            <TensionStrip value={tension} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function TensionStrip({ value }: { value: number }) {
  const reduce = useSafeReducedMotion();
  const label = tensionLabel(value);
  return (
    <div className={styles.tension}>
      <div className={styles.tensionHead}>
        <div>
          <h3 className={styles.tensionTitle}>Tension meter</h3>
          <p className={styles.tensionSub}>How your counterpart feels, 0–100, updated every turn.</p>
        </div>
        <div className={styles.tensionRead} aria-live="off">
          <span className={styles.tensionNum}>{value}</span>
          <span className={styles.tensionLabel}>
            <i style={{ background: tensionColor(value) }} aria-hidden="true" />
            {label}
          </span>
        </div>
      </div>

      <div className={styles.gauge} aria-hidden="true">
        <div className={styles.gaugeTrack} />
        <motion.div
          className={styles.gaugeMask}
          initial={false}
          animate={{ scaleX: 1 - value / 100 }}
          transition={{ duration: reduce ? 0 : 1.1, ease: EASE }}
        />
        <motion.div
          className={styles.markerRail}
          initial={false}
          animate={{ x: `${value}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 13 }}
        >
          <span className={styles.marker} />
        </motion.div>
        {[25, 50, 75].map((t) => (
          <span key={t} className={styles.gaugeTick} style={{ left: `${t}%` }} />
        ))}
      </div>
      <ul className={styles.zones} aria-hidden="true">
        {ZONES.map((z) => (
          <li key={z} className={z === label ? styles.zoneOn : ""}>
            {z}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Faint concentric rings + spokes that rotate very slowly behind the radar. */
function PolarGrid() {
  const rings = [80, 160, 240, 320, 400, 480];
  const spokes = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
  const ticks = Array.from({ length: 120 }, (_, i) => (i / 120) * Math.PI * 2);
  const C = 500;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className={styles.polar} aria-hidden="true">
      <svg viewBox="0 0 1000 1000" className={styles.polarSvg} fill="none">
        {rings.map((r, i) => (
          <circle key={r} cx={C} cy={C} r={r} className={i % 2 ? styles.ringDashed : styles.ring} />
        ))}
        {spokes.map((a, i) => (
          <line
            key={i}
            x1={r2(C + 80 * Math.cos(a))}
            y1={r2(C + 80 * Math.sin(a))}
            x2={r2(C + 480 * Math.cos(a))}
            y2={r2(C + 480 * Math.sin(a))}
            className={i % 6 === 0 ? styles.spokeMajor : styles.spoke}
          />
        ))}
        {ticks.map((a, i) => (
          <line
            key={`t${i}`}
            x1={r2(C + 480 * Math.cos(a))}
            y1={r2(C + 480 * Math.sin(a))}
            x2={r2(C + (i % 5 === 0 ? 496 : 488) * Math.cos(a))}
            y2={r2(C + (i % 5 === 0 ? 496 : 488) * Math.sin(a))}
            className={styles.tick}
          />
        ))}
        <circle cx={C} cy={C} r="3" className={styles.core} />
      </svg>
    </div>
  );
}
