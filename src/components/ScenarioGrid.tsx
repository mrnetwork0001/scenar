"use client";

import { motion } from "motion/react";
import { IconArrowUpRight, IconLock, IconPro } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEntitlements } from "@/components/EntitlementProvider";
import { best, useHistory } from "@/lib/history";
import type { PublicScenario } from "@/lib/scenarios";
import styles from "./ScenarioGrid.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

export interface ScenarioGridProps {
  scenarios: PublicScenario[];
}

const DIFFICULTY = ["", "Warm-up", "Challenging", "Hard mode"];

export function ScenarioGrid({ scenarios }: ScenarioGridProps) {
  const router = useRouter();
  const reduce = useSafeReducedMotion();
  const { isPro, openPaywall } = useEntitlements();
  const [shaking, setShaking] = useState<string | null>(null);
  const history = useHistory(); // [] on server + hydration, so the chips only appear after mount

  function onPick(s: PublicScenario) {
    const locked = s.tier === "pro" && !isPro;
    if (!locked) {
      router.push(`/play/${s.id}`);
      return;
    }
    setShaking(s.id);
    openPaywall("locked-scenario");
  }

  return (
    <ul className={styles.grid}>
      {scenarios.map((s, i) => {
        const locked = s.tier === "pro" && !isPro;
        const top = best(s.id, history);
        return (
          <motion.li
            key={s.id}
            className={styles.item}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: (i % 3) * 0.1 }}
          >
            <button
              type="button"
              className={`${styles.card} ${locked ? styles.locked : ""} ${shaking === s.id ? styles.shake : ""}`}
              style={{ ["--accent" as string]: s.accent }}
              onClick={() => onPick(s)}
              onAnimationEnd={(e) => {
                if (e.animationName.includes("shake")) setShaking(null);
              }}
              aria-label={`${s.title}. ${s.category}, ${DIFFICULTY[s.difficulty]}, ${s.minutes} minutes. ${
                locked ? "Pro scenario, locked." : s.tier === "pro" ? "Pro scenario." : "Free."
              }`}
            >
              <span className={styles.top}>
                <span className={styles.tags}>
                  <span className="tag">
                    <span className={styles.accentDot} aria-hidden="true" />
                    {s.category}
                  </span>
                  {top !== null && (
                    <span className={styles.best} title="Your best score">
                      Best <strong>{Math.round(top)}</strong>
                    </span>
                  )}
                </span>
                <span className={styles.tier}>
                  {s.tier === "free" ? (
                    "Free"
                  ) : (
                    <>
                      {locked ? (
                        <IconLock size={10} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <IconPro size={10} strokeWidth={2.5} aria-hidden="true" />
                      )}
                      Pro
                    </>
                  )}
                </span>
              </span>

              <span className={styles.titleRow}>
                <span className={styles.title}>{s.title}</span>
                <span className={styles.go} aria-hidden="true">
                  {locked ? <IconLock size={13} strokeWidth={2} /> : <IconArrowUpRight size={14} strokeWidth={2} />}
                </span>
              </span>
              <span className={styles.brief}>{s.brief}</span>

              <span className={styles.foot}>
                <span className={styles.person}>
                  <span className={styles.avatar} aria-hidden="true">
                    {s.counterpart.initials}
                  </span>
                  <span className={styles.personText}>
                    <span className={styles.name}>{s.counterpart.name}</span>
                    <span className={styles.role}>{s.counterpart.role}</span>
                  </span>
                </span>
                <span className={styles.meta}>
                  <span className={styles.dots} title={DIFFICULTY[s.difficulty]}>
                    {[1, 2, 3].map((d) => (
                      <span key={d} className={d <= s.difficulty ? styles.dotOn : styles.dot} />
                    ))}
                  </span>
                  <span className={styles.mins}>{s.minutes} min</span>
                </span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
