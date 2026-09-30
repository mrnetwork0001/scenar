"use client";

import {
  IconArrowDown,
  IconArrowRight,
  IconBest,
  IconEye,
  IconLock,
  IconMinus,
  IconRetry,
  IconTrendDown,
  IconTrendUp,
  IconUnlock,
} from "@/components/icons";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useEntitlements } from "@/components/EntitlementProvider";
import type { PublicScenario } from "@/lib/scenarios";
import { identityHeaders } from "@/lib/identity";
import { add as addHistory, previous as previousAttempt, useHistory } from "@/lib/history";
import type { ProReportSection, ReportResponse, TurnStatus } from "@/lib/types";
import { RadarChart } from "./RadarChart";
import { useCountUp } from "./useCountUp";
import styles from "./Report.module.css";

export type SessionOutcome = TurnStatus | "ended";

export interface ReportProps {
  report: ReportResponse;
  scenario: PublicScenario;
  outcome: SessionOutcome;
  onRetry: () => void;
}

const OUTCOME_COPY: Record<SessionOutcome, { label: string; tone: string }> = {
  won: { label: "Goal reached", tone: "good" },
  lost: { label: "Deal lost", tone: "bad" },
  ended: { label: "Ended early", tone: "neutral" },
  ongoing: { label: "Ended early", tone: "neutral" },
};

const EASE = [0.16, 1, 0.3, 1] as const;

// Stable per-report session id: the same report object always maps to the same id, so StrictMode's
// double-invoked effects (and re-renders) can never store the session twice.
const reportIds = new WeakMap<ReportResponse, string>();
function sessionIdFor(report: ReportResponse): string {
  let id = reportIds.get(report);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    reportIds.set(report, id);
  }
  return id;
}

/**
 * Trades a sealed Pro section for the real one. The server re-verifies scenar_pro with RevenueCat;
 * a brand-new purchase can take a moment to propagate, so 403s are retried briefly.
 */
async function fetchProSection(proSealed: string | undefined): Promise<ProReportSection | null> {
  if (!proSealed) return null;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
      const res = await fetch("/api/report/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...identityHeaders() },
        body: JSON.stringify({ proSealed }),
      });
      if (res.ok) return (await res.json()) as ProReportSection;
      if (res.status !== 403) return null;
    }
  } catch {
    /* network error -> failed */
  }
  return null;
}

type UnlockState = "idle" | "verifying" | "failed";

export function Report({ report: served, scenario, outcome, onRetry }: ReportProps) {
  const { isPro, openPaywall } = useEntitlements();
  // Server-gated Pro section: for non-verified callers /api/report returns it sealed (`locked`).
  // Once the client is Pro (already, or right after a purchase) we trade the sealed token for the
  // real section via /api/report/unlock, which re-checks scenar_pro with RevenueCat.
  const [proSection, setProSection] = useState<ProReportSection | null>(null);
  const [unlock, setUnlock] = useState<UnlockState>("idle");
  const report = proSection ? { ...served, ...proSection, locked: false } : served;
  const needsUnlock = isPro && !!served.locked && !proSection;
  const proOpen = isPro && !report.locked;

  const [attempt, setAttempt] = useState(0); // bumped by "Retry"

  useEffect(() => {
    if (!needsUnlock) return;
    let cancelled = false;
    fetchProSection(served.proSealed).then((section) => {
      if (cancelled) return;
      if (section) setProSection(section);
      else setUnlock("failed");
    });
    return () => {
      cancelled = true;
    };
  }, [needsUnlock, served.proSealed, attempt]);

  function retryUnlock() {
    setUnlock("verifying");
    setAttempt((n) => n + 1);
  }

  const [revealed, setRevealed] = useState(false);
  const overall = Math.max(0, Math.min(100, Math.round(report.overall)));
  const [sessionId] = useState(() => sessionIdFor(served));
  const saved = useRef(false);
  const history = useHistory();

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    addHistory({
      id: sessionId,
      scenarioId: scenario.id,
      title: scenario.title,
      accent: scenario.accent,
      overall,
      metrics: report.metrics,
      outcome,
      at: new Date().toISOString(),
    });
  }, [sessionId, scenario.id, scenario.title, scenario.accent, overall, report.metrics, outcome]);

  // Comparison against earlier attempts of this scenario (never against this session itself).
  const prev = previousAttempt(scenario.id, sessionId, history);
  const earlier = history.filter((r) => r.scenarioId === scenario.id && r.id !== sessionId);
  const delta = prev ? overall - Math.round(prev.overall) : 0;
  const personalBest = earlier.length > 0 && earlier.every((r) => overall > r.overall);
  const shown = useCountUp(overall, 1400, 0);
  const oc = OUTCOME_COPY[outcome];
  const C = 2 * Math.PI * 52;

  const reduce = useReducedMotion();
  const enter = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: EASE, delay: 0.08 + i * 0.12 },
        };

  return (
    <section className={styles.report} aria-labelledby="report-title">
      {/* --- Hero: score + verdict --- */}
      <motion.div className={styles.hero} {...enter(0)}>
        <div className={styles.ring} role="img" aria-label={`Overall score ${overall} out of 100`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className={styles.ringTrack} />
            <circle
              cx="60"
              cy="60"
              r="52"
              className={styles.ringArc}
              strokeDasharray={C}
              style={{ ["--ring-c" as string]: C, ["--ring-off" as string]: C * (1 - overall / 100) }}
            />
          </svg>
          <div className={styles.ringValue}>
            <span className={styles.ringNum}>{shown}</span>
            <small>out of 100</small>
          </div>
        </div>

        <div className={styles.heroText}>
          <p className="eyebrow">Session report</p>
          <div className={styles.chips}>
            <span className={`${styles.status} ${styles[oc.tone]}`}>{oc.label}</span>
            <span className="tag">{scenario.title}</span>
            {report.mock && <span className={`${styles.status} ${styles.warn}`}>Offline demo AI</span>}
            {prev && (
              <span
                className={`${styles.status} ${delta > 0 ? styles.good : delta < 0 ? styles.bad : styles.neutral} ${styles.pop}`}
              >
                {delta > 0 ? (
                  <IconTrendUp size={12} strokeWidth={2.5} aria-hidden="true" />
                ) : delta < 0 ? (
                  <IconTrendDown size={12} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <IconMinus size={12} strokeWidth={2.5} aria-hidden="true" />
                )}
                {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                {Math.abs(delta)} vs last time
              </span>
            )}
            {prev && personalBest && (
              <span className={`${styles.status} ${styles.good} ${styles.pop}`}>
                <IconBest size={12} strokeWidth={2.5} aria-hidden="true" /> Personal best
              </span>
            )}
          </div>
          <h2 id="report-title" className={styles.verdict}>
            {report.verdict}
          </h2>
          <p className={styles.sub}>
            Against {scenario.counterpart.name}, {scenario.counterpart.role}
          </p>
        </div>
      </motion.div>

      <div className={styles.grid}>
        {/* --- Radar --- */}
        <motion.div className={styles.card} {...enter(1)}>
          <div className={styles.cardHead}>
            <p className="eyebrow">Your skill profile</p>
            {prev && (
              <div className={styles.legend}>
                <span>
                  <i className={styles.swNow} aria-hidden="true" /> This attempt
                </span>
                <span>
                  <i className={styles.swPrev} aria-hidden="true" /> Last ({Math.round(prev.overall)})
                </span>
              </div>
            )}
          </div>
          <RadarChart metrics={report.metrics} compare={prev?.metrics} />
        </motion.div>

        {/* --- Hidden truth (inverse) --- */}
        <motion.div className={`${styles.truth} ${revealed ? styles.truthOpen : ""}`} {...enter(2)}>
          <div className={styles.truthHead}>
            <span className={styles.truthIcon} aria-hidden="true">
              {revealed ? <IconUnlock size={14} strokeWidth={2} /> : <IconLock size={14} strokeWidth={2} />}
            </span>
            <h3 className={styles.truthTitle}>The hidden truth</h3>
          </div>
          <p className={styles.truthLead}>
            {scenario.counterpart.name.split(" ")[0]} was holding something back the whole time.
          </p>
          <div className={styles.truthBody}>
            <p className={styles.truthText} aria-hidden={!revealed}>
              {report.reveal}
            </p>
            {!revealed && (
              <button type="button" className={`btn ${styles.revealBtn}`} onClick={() => setRevealed(true)}>
                <IconEye size={15} strokeWidth={2} aria-hidden="true" />
                Reveal what they were hiding
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* --- Pro coaching --- */}
      <motion.div className={`${styles.pro} ${proOpen ? styles.proOpen : ""}`} {...enter(3)}>
        <div className={styles.proHead}>
          <h3 className={styles.proTitle}>Tactical coaching</h3>
          <span className={styles.proChip}>Pro</span>
        </div>

        <div className={styles.proContent} inert={!proOpen} aria-hidden={!proOpen}>
          <div className={styles.proCols}>
            <div className={styles.card}>
              <h4 className={styles.listTitle}>
                <span className={`${styles.dot} ${styles.dotGood}`} /> What worked
              </h4>
              <ul className={styles.list}>
                {report.whatWorked.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
            <div className={styles.card}>
              <h4 className={styles.listTitle}>
                <span className={`${styles.dot} ${styles.dotWarn}`} /> To improve
              </h4>
              <ul className={styles.list}>
                {report.toImprove.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`${styles.card} ${styles.rewrite}`}>
            <h4 className={styles.listTitle}>The rewrite</h4>
            <div className={styles.before}>
              <span className={styles.label}>You said</span>
              <p>
                <del>{report.rewrite.original}</del>
              </p>
            </div>
            <div className={styles.arrow} aria-hidden="true">
              <IconArrowDown size={14} strokeWidth={2} />
            </div>
            <div className={styles.after}>
              <span className={styles.label}>Try instead</span>
              <p>{report.rewrite.better}</p>
            </div>
            <p className={styles.why}>
              <strong>Why it works.</strong> {report.rewrite.why}
            </p>
          </div>
        </div>

        {isPro && !proOpen && (
          <div className={styles.proOverlay}>
            <div className={styles.proCta} role="status" aria-live="polite">
              <span className={styles.proCtaIcon} aria-hidden="true">
                <IconLock size={16} strokeWidth={2} />
              </span>
              {unlock === "failed" ? (
                <>
                  <p className={styles.proCtaTitle}>Almost there</p>
                  <p className={styles.proCtaText}>Couldn&apos;t verify your purchase yet.</p>
                  <button type="button" className="btn btn-primary" onClick={retryUnlock}>
                    <IconRetry size={14} strokeWidth={2} aria-hidden="true" />
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.proCtaTitle}>Unlocking your coaching</p>
                  <p className={styles.proCtaText}>
                    <span className={styles.verifySpinner} aria-hidden="true" /> Verifying with RevenueCat…
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {!isPro && (
          <div className={styles.proOverlay}>
            <div className={styles.proCta}>
              <span className={styles.proCtaIcon} aria-hidden="true">
                <IconLock size={16} strokeWidth={2} />
              </span>
              <p className={styles.proCtaTitle}>Unlock tactical rewrites</p>
              <p className={styles.proCtaText}>
                See exactly what worked, what to fix, and the line that would have changed the outcome.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => openPaywall("pro-report")}>
                Unlock with Scenar Pro
                <IconArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <IconRetry size={14} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
        <Link href="/app" className="btn btn-ghost">
          Choose another scenario
        </Link>
      </div>
    </section>
  );
}
