"use client";

import {
  ArrowRight,
  AudioLines,
  Lock,
  LockOpen,
  Mic,
  PenLine,
  Sparkles,
  TrendingUp,
  Trophy,
  Volume2,
  Wand2,
} from "lucide-react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { ScrollLink } from "@/components/ScrollLink";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./FeaturesSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";


const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Steps through `durations` (ms per step) in a loop while `live`; returns the current step.
 * When not live it holds its position; under reduced motion callers pass live=false and read `end`.
 */
function useStepLoop(durations: number[], live: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % durations.length), durations[step]);
    return () => window.clearTimeout(id);
  }, [live, step, durations]);
  return step;
}

/** Visibility + reduced-motion gate shared by every tile. */
function useTileLive() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();
  const inView = useInView(ref, { amount: 0.35 });
  return { ref, reduce, live: inView && !reduce };
}

export function FeaturesSection() {
  const rootRef = useRef<HTMLElement>(null);
  const reduce = useSafeReducedMotion();
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start end", "end start"] });
  const dotsY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-90, 90]);
  const dotsYFine = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-30, 30]);

  return (
    <section ref={rootRef} id="features" className={`${sectionStyles.section} ${styles.section}`} aria-labelledby="features-title">
      <div className={styles.bg} aria-hidden="true">
        <motion.div className={styles.dotsFar} style={{ y: dotsYFine }} />
        <motion.div className={styles.dotsNear} style={{ y: dotsY }} />
      </div>

      <div className={sectionStyles.inner}>
        <SectionHeader
          id="features"
          eyebrow="Features"
          title="Coaching that tells you what to say instead."
          sub="Scoring and progress tracking are free for everyone. Pro adds the coaching, the voice and the scenario you actually have to face."
        />

        <div className={styles.bento}>
          <Reveal className={`${styles.cell} ${styles.cRewrite}`}>
            <RewriteTile />
          </Reveal>
          <Reveal delay={0.08} className={`${styles.cell} ${styles.cVoice}`}>
            <VoiceTile />
          </Reveal>
          <Reveal delay={0.12} className={`${styles.cell} ${styles.cBuilder}`}>
            <BuilderTile />
          </Reveal>
          <Reveal delay={0.16} className={`${styles.cell} ${styles.cProgress}`}>
            <ProgressTile />
          </Reveal>
          <Reveal delay={0.2} className={`${styles.cell} ${styles.cReveal}`}>
            <RevealTile />
          </Reveal>
        </div>

        <Reveal delay={0.1} className={styles.cta}>
          <p className={styles.ctaNote}>Two scenarios, live scoring and progress tracking are free. No card needed.</p>
          <ScrollLink href="#pricing" className="btn btn-primary">
            See Pro plans
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </ScrollLink>
        </Reveal>
      </div>
    </section>
  );
}

/* --- Tile chrome --- */

function Tile({
  inverse,
  icon,
  kicker,
  badge,
  title,
  body,
  visual,
  tileRef,
  className }: {
  inverse?: boolean;
  icon: ReactNode;
  kicker: string;
  badge: "Pro" | "Free";
  title: string;
  body: string;
  visual: ReactNode;
  tileRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  return (
    <article ref={tileRef} className={`${styles.tile} ${inverse ? styles.inverse : ""} ${className ?? ""}`}>
      <div className={styles.visual} aria-hidden="true">
        {visual}
      </div>
      <div className={styles.copy}>
        <div className={styles.kickerRow}>
          <span className={styles.kicker}>
            <span className={styles.kickerIcon}>{icon}</span>
            {kicker}
          </span>
          <span className={`${styles.badge} ${badge === "Pro" ? styles.badgePro : ""}`}>{badge}</span>
        </div>
        <div>
          <h3 className={styles.tileTitle}>{title}</h3>
          <p className={styles.tileBody}>{body}</p>
        </div>
      </div>
    </article>
  );
}

/* --- 1. Tactical rewrite --- */

const WEAK = "Yes, $80,000 works. Thank you!";
const BETTER =
  "$80,000 works for me. To make it an easy yes today: can you add a $5,000 signing bonus and push my start date out two weeks?";
const BETTER_WORDS = BETTER.split(" ");
const REWRITE_STEPS = [900, 1100, 3400, 3600]; // idle → strike → write → hold

function RewriteTile() {
  const { ref, reduce, live } = useTileLive();
  const raw = useStepLoop(REWRITE_STEPS, live);
  const step = reduce ? 3 : raw;
  const struck = step >= 1;
  const writing = step >= 2;

  return (
    <Tile
      tileRef={ref}
      className={styles.tileWide}
      icon={<PenLine size={12} strokeWidth={2} />}
      kicker="Tactical coaching"
      badge="Pro"
      title="Your weakest line, rewritten."
      body="The report shows what worked, what to improve, and a line-by-line rewrite of the moment that cost you the most."
      visual={
        <div className={styles.rewrite}>
          <div className={styles.rwRow}>
            <span className={styles.rwLabel}>You said</span>
            <p className={`${styles.rwWeak} ${struck ? styles.rwWeakDim : ""}`}>
              <span className={styles.rwWeakText}>
                “{WEAK}”
                <motion.span
                  className={styles.strike}
                  initial={false}
                  animate={{ scaleX: struck ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : struck ? 0.7 : 0.3, ease: EASE }}
                />
              </span>
            </p>
          </div>
          <div className={styles.rwArrow}>
            <Wand2 size={12} strokeWidth={2} />
          </div>
          <div className={`${styles.rwRow} ${styles.rwBetterRow}`}>
            <span className={styles.rwLabel}>Try instead</span>
            <p className={styles.rwBetter}>
              {BETTER_WORDS.map((w, i) => (
                <motion.span
                  key={i}
                  className={styles.word}
                  initial={false}
                  animate={writing ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : writing
                        ? { duration: 0.5, ease: EASE, delay: i * 0.075 }
                        : { duration: 0.3, ease: EASE }
                  }
                >
                  {w}{" "}
                </motion.span>
              ))}
              <motion.span
                className={styles.caret}
                initial={false}
                animate={{ opacity: writing && step === 2 ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </p>
          </div>
        </div>
      }
    />
  );
}

/* --- 2. Voice mode --- */

const BARS = 32;
const BAR_SEED = Array.from({ length: BARS }, (_, i) => {
  const env = Math.sin((i / (BARS - 1)) * Math.PI); // taller in the middle
  const jitter = ((i * 37) % 11) / 11;
  return {
    peak: Math.round((0.25 + env * 0.65 + jitter * 0.1) * 100) / 100,
    dur: Math.round((0.7 + ((i * 53) % 7) / 10) * 100) / 100,
    delay: Math.round((((i * 29) % 13) / 13) * -1.2 * 100) / 100 };
});
const VOICE_LINES = [
  { who: "You", line: "I’d like to talk about the base before I sign." },
  { who: "Dana", line: "Of course. What number did you have in mind?" },
];

function VoiceTile() {
  const { ref, reduce, live } = useTileLive();
  const turn = useStepLoop([3200, 3200], live);
  const speaker = VOICE_LINES[turn];
  const you = turn === 0;

  return (
    <Tile
      tileRef={ref}
      inverse
      icon={<AudioLines size={12} strokeWidth={2} />}
      kicker="Voice mode"
      badge="Pro"
      title="Say it out loud."
      body="Speak your replies and hear the counterpart answer in a consistent voice. Closer to the real thing."
      visual={
        <div className={styles.voice} data-live={live ? "true" : "false"} data-you={you ? "true" : "false"}>
          <div className={styles.voiceHead}>
            <span className={styles.voiceWho}>
              <span className={styles.voiceIcon}>
                {you ? <Mic size={12} strokeWidth={2} /> : <Volume2 size={12} strokeWidth={2} />}
              </span>
              <motion.span
                key={speaker.who}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {you ? "Listening…" : `${speaker.who} is speaking`}
              </motion.span>
            </span>
            <span className={styles.rec}>
              <i />
              Live
            </span>
          </div>

          <div className={styles.wave}>
            {BAR_SEED.map((b, i) => (
              <span
                key={i}
                className={styles.waveBar}
                style={
                  {
                    "--peak": b.peak,
                    "--dur": `${b.dur}s`,
                    "--delay": `${b.delay}s` } as React.CSSProperties
                }
              />
            ))}
          </div>

          <motion.p
            key={turn}
            className={styles.voiceLine}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          >
            {speaker.line}
          </motion.p>
        </div>
      }
    />
  );
}

/* --- 3. Custom scenario builder --- */

const SITUATION = "My landlord is keeping my $2,400 deposit for “wear and tear”. I need to ask for it back.";
const BUILD_STEPS = [SITUATION.length * 38 + 500, 1300, 3800, 500]; // type → build → card → reset

function BuilderTile() {
  const { ref, reduce, live } = useTileLive();
  const raw = useStepLoop(BUILD_STEPS, live);
  const step = reduce ? 2 : raw;
  const [chars, setChars] = useState(0);

  // Typewriter while in step 0.
  useEffect(() => {
    if (!live || step !== 0) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const n = Math.min(SITUATION.length, Math.floor((now - start) / 38));
      setChars(n);
      if (n < SITUATION.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [live, step]);

  const shown = reduce || step >= 1 ? SITUATION : step === 3 ? "" : SITUATION.slice(0, chars);
  const building = step === 1;
  const built = step === 2;

  return (
    <Tile
      tileRef={ref}
      icon={<Sparkles size={12} strokeWidth={2} />}
      kicker="Custom builder"
      badge="Pro"
      title="The conversation you’re dreading."
      body="Describe it in a sentence. AI builds a counterpart with its own hidden agenda, sealed server-side so you can’t peek."
      visual={
        <div className={styles.builder}>
          <div className={styles.input}>
            <span className={styles.inputText}>
              {shown}
              {!reduce && step === 0 && <span className={styles.typeCaret} />}
            </span>
          </div>

          <div className={styles.buildStage}>
            <motion.div
              className={styles.buildBar}
              initial={false}
              animate={{ opacity: building ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className={styles.buildLabel}>Building counterpart…</span>
              <span className={styles.buildTrack}>
                <motion.span
                  className={styles.buildFill}
                  initial={false}
                  animate={{ scaleX: building ? 1 : 0 }}
                  transition={{ duration: building ? 1.2 : 0, ease: EASE }}
                />
              </span>
            </motion.div>

            <motion.div
              className={styles.persona}
              initial={false}
              animate={built ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: reduce ? 0 : built ? 0.8 : 0.35, ease: EASE }}
            >
              <div className={styles.personaHead}>
                <span className={styles.personaAvatar}>RK</span>
                <span className={styles.personaWho}>
                  <span className={styles.personaName}>Rob Keller</span>
                  <span className={styles.personaRole}>Your landlord</span>
                </span>
                <span className={styles.sealed}>
                  <Lock size={9} strokeWidth={2.5} />
                  Sealed
                </span>
              </div>
              <div className={styles.agenda}>
                <span className={styles.agendaLabel}>Hidden agenda</span>
                <span className={styles.redact}>
                  <i style={{ width: "82%" }} />
                  <i style={{ width: "58%" }} />
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      }
    />
  );
}

/* --- 4. Progress (free) --- */

const SCORES = [41, 48, 45, 57, 54, 66, 72, 79];
const SPARK_W = 300;
const SPARK_H = 96;
const PTS = SCORES.map((s, i) => {
  const x = 6 + (i / (SCORES.length - 1)) * (SPARK_W - 12);
  const y = SPARK_H - 8 - ((s - 30) / 60) * (SPARK_H - 20);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
});
const LINE = PTS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const AREA = `${LINE} L${PTS[PTS.length - 1][0]} ${SPARK_H} L${PTS[0][0]} ${SPARK_H} Z`;
const LAST = PTS[PTS.length - 1];

function ProgressTile() {
  const { ref, reduce, live } = useTileLive();
  const raw = useStepLoop([400, 1800, 3600, 600], live); // reset → draw → chip → fade
  const step = reduce ? 2 : raw;
  const drawn = step === 1 || step === 2;
  const chip = step === 2;

  return (
    <Tile
      tileRef={ref}
      icon={<TrendingUp size={12} strokeWidth={2} />}
      kicker="Progress"
      badge="Free"
      title="Watch yourself get better."
      body="History, a radar against your last attempt, personal bests, streaks, and the one skill to focus on next."
      visual={
        <div className={styles.progress}>
          <div className={styles.progHead}>
            <span className={styles.progScore}>
              <motion.span
                initial={false}
                animate={{ opacity: drawn ? 1 : 0.25 }}
                transition={{ duration: 0.6, ease: EASE, delay: drawn && !reduce ? 1.2 : 0 }}
              >
                {SCORES[SCORES.length - 1]}
              </motion.span>
              <span className={styles.progOf}>overall</span>
            </span>
            <motion.span
              className={styles.pb}
              initial={false}
              animate={chip ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
            >
              <Trophy size={11} strokeWidth={2.5} />
              Personal best
            </motion.span>
          </div>

          <div className={styles.sparkWrap}>
            <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className={styles.spark} preserveAspectRatio="none">
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1="0" x2={SPARK_W} y1={SPARK_H * f} y2={SPARK_H * f} className={styles.sparkGrid} />
              ))}
            </svg>
            {/* The line is revealed with a clip sweep so the stroke can stay non-scaling. */}
            <motion.div
              className={styles.sparkDraw}
              initial={false}
              animate={{ clipPath: drawn ? "inset(-8px 0% -8px 0)" : "inset(-8px 100% -8px 0)" }}
              transition={{ duration: reduce ? 0 : drawn ? 1.5 : 0.4, ease: EASE }}
            >
              <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className={styles.spark} preserveAspectRatio="none">
                <path d={AREA} className={styles.sparkArea} />
                <path d={LINE} className={styles.sparkLine} />
              </svg>
            </motion.div>
            <motion.span
              className={styles.sparkDot}
              style={{ left: `${(LAST[0] / SPARK_W) * 100}%`, top: `${(LAST[1] / SPARK_H) * 100}%` }}
              initial={false}
              animate={{ opacity: drawn ? 1 : 0, scale: drawn ? 1 : 0.4 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: drawn && !reduce ? 1.2 : 0 }}
            />
          </div>

          <div className={styles.progFoot}>
            <span>
              <span className={styles.progKey}>Focus next</span> Boundary Setting
            </span>
            <span className={styles.streak}>
              {[0, 1, 2, 3, 4].map((d) => (
                <i key={d} className={d < 3 ? styles.streakOn : ""} />
              ))}
              <span>3-day streak</span>
            </span>
          </div>
        </div>
      }
    />
  );
}

/* --- 5. Hidden truth reveal (every report) --- */

const SECRET = "Dana’s approved ceiling was $84,000 base, plus a $5,000 signing bonus she could add at any time.";

function RevealTile() {
  const { ref, reduce, live } = useTileLive();
  const raw = useStepLoop([1800, 3800, 700], live); // sealed → revealed → reseal
  const open = reduce || raw === 1;

  return (
    <Tile
      tileRef={ref}
      inverse
      icon={open ? <LockOpen size={12} strokeWidth={2} /> : <Lock size={12} strokeWidth={2} />}
      kicker="The hidden truth"
      badge="Free"
      title="See what they were hiding."
      body="Every report ends by revealing the counterpart’s secret, so you learn how close you really got."
      visual={
        <div className={styles.truth}>
          <div className={styles.truthCard}>
            <motion.p
              className={`${styles.truthText} ${styles.truthBlur}`}
              initial={false}
              animate={{ opacity: open ? 0 : 0.7 }}
              transition={{ duration: reduce ? 0 : open ? 1.2 : 0.4, ease: EASE, delay: open && !reduce ? 0.3 : 0 }}
            >
              {SECRET}
            </motion.p>
            <motion.p
              className={`${styles.truthText} ${styles.truthClear}`}
              initial={false}
              animate={{ clipPath: open ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
              transition={{ duration: reduce ? 0 : open ? 1.4 : 0.5, ease: EASE }}
            >
              {SECRET}
            </motion.p>
            <motion.span
              className={styles.truthScan}
              initial={false}
              animate={{ x: open ? "100%" : "0%", opacity: open ? [0, 1, 1, 0] : 0 }}
              transition={{ duration: reduce ? 0 : 1.4, ease: EASE }}
            />
          </div>
        </div>
      }
    />
  );
}
