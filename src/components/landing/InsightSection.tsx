"use client";

import { IconKey, IconLock, IconUnlock } from "@/components/icons";
import { useInView } from "motion/react";
import { Fragment, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./InsightSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";


type Dossier = {
  file: string;
  scene: string;
  name: string;
  role: string;
  initials: string;
  /** Secret, word by word; words wrapped in *asterisks* are emphasised once revealed. */
  secret: string;
  unlock: string;
};

const DOSSIERS: Dossier[] = [
  {
    file: "File 01",
    scene: "Salary negotiation",
    name: "Dana Whitfield",
    role: "Senior Recruiter",
    initials: "DW",
    secret: "Her approved ceiling is *$84,000* base - plus a *$5,000 signing bonus* she hasn’t mentioned.",
    unlock: "Anchor with market data and stay calm." },
  {
    file: "File 02",
    scene: "Saying no",
    name: "Marcus Hale",
    role: "Engineering Manager",
    initials: "MH",
    secret: "The “urgent” Monday demo can slip to *Wednesday.* He just hasn’t asked.",
    unlock: "Name your priorities and offer a trade-off." },
  {
    file: "File 03",
    scene: "Asking for time",
    name: "Prof. Elena Ricci",
    role: "Course Lead",
    initials: "ER",
    secret: "University rules let her grant up to *5 days* for documented emergencies. The syllabus doesn’t say so.",
    unlock: "Be concise, bring a plan, offer documentation." },
];

/* Background field of drifting redaction bars - deterministic widths (% of a row half). */
const ROWS = Array.from({ length: 16 }, (_, r) =>
  Array.from({ length: 7 }, (_, i) => 5 + ((r * 7 + i * 13 + r * i * 3) % 11) * 1.4),
);

function Redacted({ text, open, reduce }: { text: string; open: boolean; reduce: boolean }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => {
        const em = w.startsWith("*");
        const join = em && words[i + 1]?.startsWith("*");
        const clean = w.replace(/\*/g, "");
        return (
          <Fragment key={i}>
            <span
              className={`${styles.word} ${em ? styles.em : ""} ${join ? styles.join : ""} ${open ? styles.open : ""}`}
              style={{ ["--d" as string]: reduce ? "0s" : `${0.25 + i * 0.045}s` }}
            >
              {clean}
              <span className={styles.bar} aria-hidden="true" />
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </>
  );
}

function DossierCard({ d, index, reduce }: { d: Dossier; index: number; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 1, margin: "0px 0px -42% 0px" });
  const [hover, setHover] = useState(false);
  const open = reduce || seen || hover;

  // Normalise *emphasis* that spans several words into per-word markers.
  const words = d.secret.replace(/\*([^*]+)\*/g, (_, g: string) =>
    g
      .split(" ")
      .map((w) => `*${w}*`)
      .join(" "),
  );

  return (
    <Reveal as="li" delay={index * 0.12} className={styles.cell}>
      <article
        className={`${styles.card} ${open ? styles.cardOpen : ""}`}
        onPointerEnter={() => setHover(true)}
        aria-labelledby={`dossier-${index}`}
      >
        <div className={styles.cardHead}>
          <span className={styles.file}>{d.file}</span>
          <span className={styles.scene}>{d.scene}</span>
        </div>

        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden="true">
            {d.initials}
          </span>
          <div>
            <h3 id={`dossier-${index}`} className={styles.name}>
              {d.name}
            </h3>
            <p className={styles.role}>{d.role}</p>
          </div>
        </div>

        <div className={styles.secretBlock} ref={ref}>
          <p className={styles.label}>
            <span className={styles.lockIcon} aria-hidden="true">
              {open ? <IconUnlock size={12} strokeWidth={2} /> : <IconLock size={12} strokeWidth={2} />}
            </span>
            {open ? "Hidden truth · revealed" : "Hidden truth · classified"}
          </p>
          <p className={styles.secret}>
            <Redacted text={words} open={open} reduce={reduce} />
          </p>
        </div>

        <div className={styles.unlock}>
          <IconKey size={14} strokeWidth={2} aria-hidden="true" className={styles.unlockIcon} />
          <p>
            <span className={styles.unlockLabel}>How to unlock it</span>
            {d.unlock}
          </p>
        </div>
      </article>
    </Reveal>
  );
}

export function InsightSection() {
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const live = useInView(rootRef, { amount: 0.05 });

  return (
    <section
      ref={rootRef}
      id="insight"
      className={`${sectionStyles.section} ${sectionStyles.inverse} ${styles.root} ${live && !reduce ? styles.live : ""}`}
      aria-labelledby="insight-title"
    >
      {/* Decorative: drifting redaction bars + slow scanline sweep */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.field}>
          {ROWS.map((row, r) => (
            <div key={r} className={styles.row} style={{ ["--r" as string]: r }}>
              {[0, 1].map((copy) => (
                <div key={copy} className={styles.rowHalf}>
                  {row.map((w, i) => (
                    <span key={i} className={styles.ghostBar} style={{ width: `${w}%` }} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.scanlines} />
        <div className={styles.sweep} />
      </div>

      <div className={sectionStyles.inner}>
        <SectionHeader
          id="insight"
          eyebrow="The insight"
          title="Every counterpart is hiding something."
          sub="Each AI character has a persona, a hidden secret and a win condition - just like real people. Play it well and the truth comes out in your report."
        />

        <ul className={styles.grid}>
          {DOSSIERS.map((d, i) => (
            <DossierCard key={d.name} d={d} index={i} reduce={reduce} />
          ))}
        </ul>

        <Reveal className={styles.foot}>
          <p>
            You can win or lose. Hedge, and the ceiling stays hidden. Stay specific and calm, and the report shows
            exactly what you left on the table.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
