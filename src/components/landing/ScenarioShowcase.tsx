"use client";

import { IconArrowUpRight, IconLock, IconPlus } from "@/components/icons";
import { useInView } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { Reveal } from "@/components/Reveal";
import type { PublicScenario } from "@/lib/scenarios";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./ScenarioShowcase.module.css";

type Item = { kind: "scenario"; s: PublicScenario } | { kind: "custom" };

export function ScenarioShowcase({ scenarios }: { scenarios: PublicScenario[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { amount: 0.1 });

  const base: Item[] = scenarios.map((s) => ({ kind: "scenario", s }));
  const rowA: Item[] = [...base, { kind: "custom" }];
  // Second row: reversed order, custom card offset so the two rows never line up.
  const rev = [...base].reverse();
  const rowB: Item[] = [...rev.slice(0, 2), { kind: "custom" }, ...rev.slice(2)];

  return (
    <section
      ref={rootRef}
      id="showcase"
      className={`${sectionStyles.section} ${styles.section}`}
      aria-labelledby="showcase-title"
      data-live={inView ? "true" : "false"}
    >
      <div className={styles.lanes} aria-hidden="true" />

      <div className={sectionStyles.inner}>
        <SectionHeader
          id="showcase"
          eyebrow="Scenarios"
          title="Five tough counterparts. Or build your own."
          sub="Each counterpart has a personality, a goal of their own and something they’re not telling you. Two scenarios are free to start."
        />
      </div>

      <Reveal delay={0.1} className={styles.marquee}>
        <Row items={rowA} direction="left" label="Scenarios" />
        <Row items={rowB} direction="right" label="More scenarios" secondary />
      </Reveal>

      <div className={sectionStyles.inner}>
        <Reveal delay={0.2} className={styles.ctaRow}>
          <Link href="/app" className="btn btn-primary">
            Browse scenarios
            <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
          <Link href="/custom" className="btn btn-ghost">
            <IconPlus size={14} strokeWidth={2} aria-hidden="true" />
            Build your own
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Row({
  items,
  direction,
  label,
  secondary,
}: {
  items: Item[];
  direction: "left" | "right";
  label: string;
  secondary?: boolean;
}) {
  return (
    <div
      className={`${styles.row} ${secondary ? styles.rowSecondary : ""}`}
      data-dir={direction}
      aria-hidden={secondary ? "true" : undefined}
    >
      <div className={styles.track}>
        {/* Two identical copies make the loop seamless; the copy is hidden from AT and focus. */}
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            className={styles.group}
            aria-label={copy === 0 && !secondary ? label : undefined}
            aria-hidden={copy === 1 ? "true" : undefined}
            data-dup={copy === 1 ? "true" : undefined}
          >
            {items.map((it) => (
              <li key={it.kind === "custom" ? "custom" : it.s.id} className={styles.item}>
                {it.kind === "custom" ? (
                  <CustomCard focusable={copy === 0 && !secondary} />
                ) : (
                  <ScenarioCard s={it.s} focusable={copy === 0 && !secondary} />
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({ s, focusable }: { s: PublicScenario; focusable: boolean }) {
  const pro = s.tier === "pro";
  return (
    <Link href={`/play/${s.id}`} className={styles.card} tabIndex={focusable ? undefined : -1}>
      <div className={styles.cardTop}>
        <span className="tag">
          <i className={styles.accent} style={{ background: s.accent }} aria-hidden="true" />
          {s.category}
        </span>
        <span className={`${styles.pill} ${pro ? styles.pillPro : ""}`}>
          {pro && <IconLock size={10} strokeWidth={2.5} aria-hidden="true" />}
          {pro ? "PRO" : "FREE"}
        </span>
      </div>

      <h3 className={styles.cardTitle}>{s.title}</h3>

      <div className={styles.cardFoot}>
        <span className={styles.avatar} aria-hidden="true">
          {s.counterpart.initials}
        </span>
        <span className={styles.who}>
          <span className={styles.name}>{s.counterpart.name}</span>
          <span className={styles.role}>{s.counterpart.role}</span>
        </span>
        <span className={styles.meta}>
          <span className={styles.dots} aria-label={`Difficulty ${s.difficulty} of 3`}>
            {[1, 2, 3].map((d) => (
              <i key={d} className={d <= s.difficulty ? styles.dotOn : ""} />
            ))}
          </span>
          <span className={styles.min}>{s.minutes} min</span>
        </span>
      </div>
    </Link>
  );
}

function CustomCard({ focusable }: { focusable: boolean }) {
  return (
    <Link href="/custom" className={`${styles.card} ${styles.custom}`} tabIndex={focusable ? undefined : -1}>
      <div className={styles.cardTop}>
        <span className={`tag ${styles.customTag}`}>Your scenario</span>
        <span className={`${styles.pill} ${styles.pillPro}`}>
          <IconLock size={10} strokeWidth={2.5} aria-hidden="true" />
          PRO
        </span>
      </div>

      <h3 className={styles.cardTitle}>Build your own</h3>

      <div className={styles.cardFoot}>
        <span className={`${styles.avatar} ${styles.avatarGhost}`} aria-hidden="true">
          <IconPlus size={14} strokeWidth={2} />
        </span>
        <span className={styles.who}>
          <span className={styles.name}>Anyone you’re dreading</span>
          <span className={styles.role}>Described by you, played by AI</span>
        </span>
      </div>
    </Link>
  );
}
