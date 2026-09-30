"use client";

import { IconArrowUpRight, IconLock, IconSend, IconSpark } from "@/components/icons";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TensionMeter, tensionColor } from "@/components/TensionMeter";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./DemoSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";


const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    title: "Pick a scenario",
    body: "A first salary offer, saying no to your manager, an extension from a strict professor - or build your own with Pro." },
  {
    title: "Talk it through",
    body: "The counterpart answers in character. Tension, progress and four skill scores update every turn, with a one-line coach tip." },
  {
    title: "Get the report - and the truth",
    body: "An overall score, a radar of your skills and the secret they were hiding all along. Pro adds a line-by-line rewrite." },
];

type Line = { stage: number; kind: "them" | "you" | "coach"; text: string };

const SCRIPT: Line[] = [
  {
    stage: 1,
    kind: "them",
    text: "The whole team loved you - we’re excited to extend the offer at $72,000 base. Can I tell them you’re on board?" },
  { stage: 2, kind: "you", text: "Oh, thank you! Sorry - I was maybe hoping for a little more, if that’s okay?" },
  { stage: 3, kind: "coach", text: "Drop the apology. Anchor with a number - say $85k and cite the market data." },
  { stage: 4, kind: "them", text: "Honestly, $72k is already competitive for a junior role." },
  { stage: 5, kind: "you", text: "Market data for this role is $80–86k. I’m ready to sign today at $85,000." },
  { stage: 6, kind: "them", text: "You’ve clearly done your homework. Let me see what I can do." },
];

const LAST = 7; // report
/**
 * Scroll progress (through the steps list, measured at 78% of the viewport) at which each
 * stage begins. Steps are equal-height blocks whose numbers sit 20vh below their top, so
 * step i's number crosses the line at (i * 64 + 20) / 192 → 0.104, 0.438, 0.771.
 */
const STAGE_AT = [0, 0.24, 0.438, 0.5, 0.56, 0.625, 0.69, 0.771];
const RAIL: [number, number] = [0.104, 0.771];
const TENSION = [50, 50, 72, 72, 68, 41, 24, 24];
const GOAL = [0, 0, 4, 4, 8, 52, 71, 100];

const SKILLS = [
  { name: "Assertiveness", v: 84 },
  { name: "Emotional regulation", v: 78 },
  { name: "Clarity", v: 88 },
  { name: "Boundary setting", v: 72 },
];
const SCORE = 81;

const stepOf = (stage: number) => (stage <= 1 ? 0 : stage < LAST ? 1 : 2);

/* --- Viewport hook (no hydration mismatch: server assumes desktop) --- */
const MQ = "(max-width: 767px)";
function subscribe(cb: () => void) {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MQ).matches,
    () => false,
  );
}

export function DemoSection() {
  const reduce = useSafeReducedMotion();
  const isMobile = useIsMobile();
  const trackRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [scrollStage, setScrollStage] = useState(0);
  const [autoStage, setAutoStage] = useState(0);

  /* Desktop: scroll drives the script. */
  const stepsRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: stepsRef, offset: ["start 0.78", "end 0.78"] });
  const rail = useTransform(scrollYProgress, RAIL, [0, 1], { clamp: true });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    let s = 0;
    for (let i = 0; i < STAGE_AT.length; i++) if (p >= STAGE_AT[i]) s = i;
    setScrollStage(s);
  });

  /* Mobile: auto-play while the window is on screen, hold on the report, then loop. */
  const windowInView = useInView(windowRef, { amount: 0.45 });
  useEffect(() => {
    if (!isMobile || reduce || !windowInView) return;
    const id = window.setTimeout(
      () => setAutoStage((s) => (s >= LAST ? 0 : s + 1)),
      autoStage === 0 ? 1100 : autoStage >= LAST ? 6000 : 1700,
    );
    return () => window.clearTimeout(id);
  }, [isMobile, reduce, windowInView, autoStage]);

  /* Desktop pinning. `position: sticky` can't be relied on here (the body is a scroll container
     because of `overflow-x: hidden`), so the window is pinned with a transform instead. */
  const colRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const pinY = useMotionValue(0);
  const { scrollY } = useScroll();
  const geo = useRef({ top: 0, h: 0, pin: 0 });
  useEffect(() => {
    const place = () => {
      if (isMobile) return pinY.set(0);
      const { top, h, pin } = geo.current;
      const offset = Math.max(96, (window.innerHeight - pin) / 2);
      pinY.set(Math.max(0, Math.min(h - pin, scrollY.get() + offset - top)));
    };
    const measure = () => {
      const col = colRef.current;
      const pin = pinRef.current;
      if (!col || !pin) return;
      geo.current = {
        top: col.getBoundingClientRect().top + window.scrollY,
        h: col.offsetHeight,
        pin: pin.offsetHeight };
      place();
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (colRef.current) ro.observe(colRef.current);
    if (pinRef.current) ro.observe(pinRef.current);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    const off = scrollY.on("change", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      off();
    };
  }, [isMobile, pinY, scrollY]);

  const stage = reduce ? LAST : isMobile ? autoStage : scrollStage;
  const step = stepOf(stage);
  const live = useInView(trackRef, { amount: 0.05 });

  return (
    <section
      id="how"
      className={`${sectionStyles.section} ${sectionStyles.muted} ${styles.root}`}
      aria-labelledby="how-title"
    >
      <div className={styles.dots} aria-hidden="true" />

      <div className={sectionStyles.inner}>
        <SectionHeader
          id="how"
          eyebrow="How it works"
          title="Rehearse it before it counts."
          sub="Three steps, a few minutes. Keep scrolling to watch a salary negotiation play out, turn by turn."
        />

        <div ref={trackRef} className={styles.layout}>
          <div className={styles.stepsCol}>
            <ol ref={stepsRef} className={`${styles.steps} ${reduce ? styles.stepsStatic : ""}`}>
              <li className={styles.rail} aria-hidden="true">
                <motion.span className={styles.railFill} style={{ scaleY: reduce ? 1 : rail }} />
              </li>
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className={`${styles.step} ${i === step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className={styles.stepNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className={styles.stepTitle}>{s.title}</h3>
                    <p className={styles.stepBody}>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className={`${styles.cta} ${styles.ctaDesktop}`}>
              <Link href="/app" className="btn btn-primary">
                Launch app
                <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
              <span className={styles.ctaNote}>Start with a free scenario.</span>
            </div>
          </div>

          <div ref={colRef} className={styles.stageCol}>
            <motion.div ref={pinRef} className={styles.sticky} style={{ y: pinY }}>
              <div
                className={`${styles.rings} ${live && !reduce ? styles.ringsLive : ""}`}
                style={{ ["--tc" as string]: tensionColor(TENSION[stage]) }}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>
              <div className={styles.mobileStep} aria-hidden="true">
                <span className={styles.mobileBars}>
                  {STEPS.map((s, i) => (
                    <i key={s.title} className={i <= step ? styles.barOn : ""} />
                  ))}
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={step}
                    className={styles.mobileStepText}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    Step {step + 1} · {STEPS[step].title}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div ref={windowRef}>
                <ProductWindow stage={stage} reduce={reduce} />
              </div>
            </motion.div>
          </div>
        </div>

        <div className={`${styles.cta} ${styles.ctaMobile}`}>
          <Link href="/app" className="btn btn-primary">
            Launch app
            <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
          <span className={styles.ctaNote}>Start with a free scenario.</span>
        </div>
      </div>
    </section>
  );
}

/* --- Mock product window --- */

const enter = (reduce: boolean) =>
  reduce
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 14, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } },
        transition: { duration: 0.6, ease: EASE } };

function ProductWindow({ stage, reduce }: { stage: number; reduce: boolean }) {
  const lines = SCRIPT.filter((l) => l.stage <= stage);
  const goal = GOAL[stage];

  return (
    <div className={styles.window} role="img"
      aria-label="Product demo: a salary negotiation with recruiter Dana. The tension meter rises when you hedge, a coach tip suggests anchoring with market data, tension falls, and the report reveals her $84,000 ceiling.">
      <div className={styles.titlebar} aria-hidden="true">
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.titleText}>Scenar · Negotiate Your First Offer</span>
        <span className={styles.lights} style={{ visibility: "hidden" }}>
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className={styles.body} aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          {stage === 0 ? (
            <motion.div
              key="picker"
              className={styles.picker}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.22, ease: EASE } }}
            >
              <p className={styles.pickerLabel}>Choose your conversation</p>
              <PickerRow title="Negotiate Your First Offer" meta="Career · 6 min" initials="DW" selected />
              <PickerRow title="Say No to Your Manager" meta="Workplace · 5 min" initials="MH" />
              <PickerRow title="Appeal to a Strict Professor" meta="Academic · 6 min" initials="ER" pro />
              <PickerRow title="Build your own" meta="Any conversation" initials="+" pro />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              className={styles.chat}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className={styles.chatHead}>
                <span className={styles.avatar}>DW</span>
                <div className={styles.who}>
                  <span className={styles.whoName}>Dana Whitfield</span>
                  <span className={styles.whoRole}>Senior Recruiter</span>
                </div>
                <div className={styles.meter}>
                  <TensionMeter value={TENSION[stage]} size="sm" />
                </div>
              </div>

              <div className={styles.goal}>
                <span className={styles.goalLabel}>Goal · base above $80k</span>
                <span className={styles.goalTrack}>
                  <motion.span
                    className={styles.goalFill}
                    initial={false}
                    animate={{ scaleX: goal / 100 }}
                    transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
                  />
                </span>
                <span className={styles.goalPct}>{goal}%</span>
              </div>

              <div className={styles.messages}>
                <AnimatePresence initial={false}>
                  {lines.map((l) =>
                    l.kind === "coach" ? (
                      <motion.div key={l.stage} layout="position" className={styles.coach} {...enter(reduce)}>
                        <span className={styles.coachIcon}>
                          <IconSpark size={11} strokeWidth={2.5} />
                        </span>
                        <span>
                          <b>Coach</b> {l.text}
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={l.stage}
                        layout="position"
                        className={`${styles.bubble} ${l.kind === "you" ? styles.you : styles.them}`}
                        {...enter(reduce)}
                      >
                        {l.text}
                      </motion.div>
                    ),
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.composer}>
                <span>Type your reply…</span>
                <span className={styles.send}>
                  <IconSend size={13} strokeWidth={2} />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage >= LAST && <ReportSheet key="report" reduce={reduce} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PickerRow({
  title,
  meta,
  initials,
  selected,
  pro }: {
  title: string;
  meta: string;
  initials: string;
  selected?: boolean;
  pro?: boolean;
}) {
  return (
    <div className={`${styles.pickRow} ${selected ? styles.pickSelected : ""}`}>
      <span className={styles.pickAvatar}>{initials}</span>
      <span className={styles.pickText}>
        <span className={styles.pickTitle}>{title}</span>
        <span className={styles.pickMeta}>{meta}</span>
      </span>
      {pro ? (
        <span className={styles.pickPro}>
          <IconLock size={9} strokeWidth={2.5} /> Pro
        </span>
      ) : (
        <span className={styles.pickFree}>Free</span>
      )}
    </div>
  );
}

function ReportSheet({ reduce }: { reduce: boolean }) {
  const C = 2 * Math.PI * 26;
  return (
    <motion.div
      className={styles.report}
      initial={reduce ? false : { y: "104%" }}
      animate={{ y: 0 }}
      exit={{ y: "104%", transition: { duration: 0.4, ease: EASE } }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div className={styles.reportTop}>
        <svg viewBox="0 0 64 64" className={styles.ring}>
          <circle cx="32" cy="32" r="26" className={styles.ringTrack} />
          <motion.circle
            cx="32"
            cy="32"
            r="26"
            className={styles.ringFill}
            strokeDasharray={C}
            initial={reduce ? false : { strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - SCORE / 100) }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
          />
          <text x="32" y="33" className={styles.ringNum} textAnchor="middle" dominantBaseline="middle">
            {SCORE}
          </text>
        </svg>
        <div>
          <span className={styles.won}>Won</span>
          <p className={styles.verdict}>Calm, specific, anchored.</p>
        </div>
      </div>

      <ul className={styles.skills}>
        {SKILLS.map((s, i) => (
          <li key={s.name}>
            <span className={styles.skillName}>{s.name}</span>
            <span className={styles.skillTrack}>
              <motion.span
                className={styles.skillFill}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: s.v / 100 }}
                transition={{ duration: 1, ease: EASE, delay: 0.4 + i * 0.08 }}
              />
            </span>
            <span className={styles.skillV}>{s.v}</span>
          </li>
        ))}
      </ul>

      <motion.div
        className={styles.truth}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
      >
        <span className={styles.truthLabel}>The hidden truth</span>
        <p>
          Dana’s ceiling was <b>$84,000</b> - you landed $83,000 + the $5,000 bonus.
        </p>
      </motion.div>
    </motion.div>
  );
}
