"use client";

import {
  IconAnonymous,
  IconCode,
  IconDevice,
  IconEncrypted,
  IconGauge,
  IconServer,
  type ScenarIcon,
} from "@/components/icons";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Reveal } from "@/components/Reveal";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./TrustSection.module.css";

const ITEMS: { icon: ScenarIcon; title: string; body: string }[] = [
  {
    icon: IconServer,
    title: "Secrets stay server-side",
    body: "Personas, hidden agendas and win conditions never reach your browser. The page only receives public fields.",
  },
  {
    icon: IconEncrypted,
    title: "Sealed custom scenarios",
    body: "Scenarios you build travel as AES-256-GCM encrypted tokens, so not even your own browser can peek at the secret.",
  },
  {
    icon: IconAnonymous,
    title: "No sign-up",
    body: "RevenueCat anonymous app user IDs let you start rehearsing straight away, with no account to create.",
  },
  {
    icon: IconDevice,
    title: "History stays on your device",
    body: "Your practice history and progress live in your browser's local storage, not in our database.",
  },
  {
    icon: IconGauge,
    title: "Rate-limited AI",
    body: "The conversation and report endpoints are rate-limited per IP in production to keep the service responsive.",
  },
  {
    icon: IconCode,
    title: "Open source, MIT",
    body: "Every line is public on GitHub under the MIT license. Read it, fork it, audit it.",
  },
];

const STACK = ["Next.js 16", "React 19", "TypeScript", "RevenueCat Web Billing", "0G router", "GPT-4.1", "Claude Sonnet 5"];

/* --- Cipher field --- */
const COLS = 56;
const ROWS = 7;
const WORD = "scenar";
const WORD_ROW = 3;
const WORD_START = Math.floor((COLS - (WORD.length * 2 - 1)) / 2);
const WORD_END = WORD_START + WORD.length * 2 - 1;
const GLYPHS = "0123456789abcdef";

/** Column index → letter of WORD, spaced one column apart around the centre. */
function wordCharAt(col: number): string | null {
  const off = col - WORD_START;
  if (off < 0 || off % 2 !== 0) return null;
  return WORD[off / 2] ?? null;
}

/** Deterministic PRNG so the server and first client render agree. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInitialGrid(): string[][] {
  const rnd = mulberry32(20260930);
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => GLYPHS[Math.floor(rnd() * GLYPHS.length)]),
  );
}
const INITIAL = buildInitialGrid();

function splitWordRow(row: string[]) {
  return {
    left: row.slice(0, WORD_START).join(""),
    word: row.slice(WORD_START, WORD_END).join(""),
    right: row.slice(WORD_END).join(""),
  };
}

/** The resolved (settled) state: the ciphertext field with "s c e n a r" in the middle row. */
function resolvedWordRow(): string[] {
  return INITIAL[WORD_ROW].map((c, col) => (col >= WORD_START && col < WORD_END ? (wordCharAt(col) ?? " ") : c));
}
const RESOLVED_ROW = resolvedWordRow();

const TICK_MS = 70;
const SCRAMBLE_MS = 1400;
const RESOLVE_MS = 1600;
const HOLD_MS = 5200;
const CYCLE_MS = SCRAMBLE_MS + RESOLVE_MS + HOLD_MS;

/**
 * Faint grid of hex ciphertext that scrambles, then resolves left-to-right into "scenar"
 * and holds - a quiet nod to the sealed scenarios. Written straight to the DOM (no re-renders)
 * and only animated while in view.
 */
function CipherField() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const leftRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rootRef, { amount: 0.15 });

  useEffect(() => {
    if (reduce || !inView) return;
    const grid = INITIAL.map((r) => r.slice());
    const rand = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    const start = performance.now();
    let last = 0;
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < TICK_MS) return;
      last = now;
      const t = (now - start) % CYCLE_MS;

      // How much of the field churns this tick.
      const churn = t < SCRAMBLE_MS ? 0.35 : t < SCRAMBLE_MS + RESOLVE_MS ? 0.12 : 0.012;
      for (let r = 0; r < ROWS; r++) {
        if (r === WORD_ROW) continue;
        for (let c = 0; c < COLS; c++) if (Math.random() < churn) grid[r][c] = rand();
        const el = rowRefs.current[r];
        if (el) el.textContent = grid[r].join("");
      }

      // Word row: scramble fully, then lock cells in from left to right.
      const lockedUpTo =
        t < SCRAMBLE_MS ? -1 : t < SCRAMBLE_MS + RESOLVE_MS ? ((t - SCRAMBLE_MS) / RESOLVE_MS) * COLS : COLS;
      const row = grid[WORD_ROW];
      for (let c = 0; c < COLS; c++) {
        if (c <= lockedUpTo) row[c] = RESOLVED_ROW[c];
        else row[c] = Math.random() < 0.5 ? rand() : row[c];
      }
      const parts = splitWordRow(row);
      if (leftRef.current) leftRef.current.textContent = parts.left;
      if (wordRef.current) wordRef.current.textContent = parts.word;
      if (rightRef.current) rightRef.current.textContent = parts.right;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView]);

  const settled = splitWordRow(RESOLVED_ROW);

  return (
    <div ref={rootRef} className={styles.cipher} aria-hidden="true">
      <div className={styles.cipherGrid}>
        {INITIAL.map((row, r) =>
          r === WORD_ROW ? (
            <span key={r} className={styles.cipherRow}>
              <span ref={leftRef}>{settled.left}</span>
              <span ref={wordRef} className={styles.cipherWord}>
                {settled.word}
              </span>
              <span ref={rightRef}>{settled.right}</span>
            </span>
          ) : (
            <span
              key={r}
              ref={(el) => {
                rowRefs.current[r] = el;
              }}
              className={styles.cipherRow}
            >
              {row.join("")}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <section id="trust" className={`${sectionStyles.section} ${styles.section}`} aria-labelledby="trust-title">
      <div className={sectionStyles.inner}>
        <SectionHeader
          id="trust"
          eyebrow="Privacy & tech"
          title="Private by design. Built to ship."
          sub="The parts that matter stay where they belong: secrets on the server, your history on your device."
        />
      </div>

      <CipherField />

      <div className={sectionStyles.inner}>

        <ul className={styles.grid}>
          {ITEMS.map((item, i) => (
            <Reveal as="li" key={item.title} className={styles.item} delay={0.06 * i}>
              <span className={styles.icon}>
                <item.icon size={16} strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.itemBody}>{item.body}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal className={styles.stack}>
          <span className={styles.stackLabel}>Built with</span>
          <ul className={styles.stackList} aria-label="Built with">
            {STACK.map((s) => (
              <li key={s} className="tag">
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
