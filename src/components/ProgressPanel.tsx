"use client";

import { Flame, Target, TrendingUp } from "lucide-react";
import { useId } from "react";
import { stats, useHistory } from "@/lib/history";
import { METRIC_LABELS, type MetricKey } from "@/lib/types";
import styles from "./ProgressPanel.module.css";

const TIPS: Record<MetricKey, string> = {
  assertiveness: "State what you want in the first sentence - then stop talking.",
  regulation: "Pause before replying; name the pressure instead of reacting to it.",
  clarity: "One ask per message. Swap hedges like “maybe” for specifics.",
  boundaries: "Say no to the request, not the person - and offer what you can do.",
};

const W = 280;
const H = 84;
const PAD = 8;

/** Landing-page progress summary. Renders nothing on the server / first paint and when history is empty. */
export function ProgressPanel() {
  const history = useHistory();
  const rawId = useId();
  const gid = `pp-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (history.length === 0) return null;

  const s = stats(history);
  const recent = history.slice(0, 10).reverse(); // oldest → newest
  const pts = recent.map((r, i) => {
    const x = recent.length === 1 ? W / 2 : PAD + (i / (recent.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - Math.max(0, Math.min(100, r.overall)) / 100) * (H - PAD * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z` : "";
  const last = recent[recent.length - 1];
  const trendLabel = recent.map((r) => Math.round(r.overall)).join(", ");

  return (
    <section id="progress" className={styles.panel} aria-labelledby={`${gid}-title`}>
      <div className={styles.head}>
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id={`${gid}-title`} className={styles.title}>
            {s.sessions === 1 ? "One conversation in." : `${s.sessions} conversations in.`}
          </h2>
        </div>
        {s.streakDays > 0 && (
          <span className={styles.streak} title={`${s.streakDays}-day practice streak`}>
            <Flame size={12} strokeWidth={2.5} aria-hidden="true" />
            <strong>{s.streakDays}</strong> day{s.streakDays === 1 ? "" : "s"} streak
          </span>
        )}
      </div>

      <div className={styles.body}>
        <dl className={styles.stats}>
          <div className={styles.stat} style={{ ["--i" as string]: 0 }}>
            <dt>Sessions</dt>
            <dd>{s.sessions}</dd>
          </div>
          <div className={styles.stat} style={{ ["--i" as string]: 1 }}>
            <dt>Average</dt>
            <dd>{s.avgOverall}</dd>
          </div>
          <div className={styles.stat} style={{ ["--i" as string]: 2 }}>
            <dt>Best</dt>
            <dd>{Math.round(s.bestOverall)}</dd>
          </div>
        </dl>

        <figure className={styles.spark}>
          <figcaption className={styles.sparkCap}>
            Last {recent.length} session{recent.length === 1 ? "" : "s"}
            <span className={styles.sparkLast}>{Math.round(last.overall)}</span>
          </figcaption>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={styles.sparkSvg}
            role="img"
            aria-label={`Overall scores of your last ${recent.length} sessions: ${trendLabel}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className={styles.grid} />
            ))}
            {area && <path d={area} fill={`url(#${gid}-fill)`} className={styles.area} />}
            {pts.length > 1 && (
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                className={styles.line}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {/* Dots are HTML so they stay round even though the SVG stretches to the container width. */}
          <div className={styles.dots} aria-hidden="true">
            {pts.map(([x, y], i) => (
              <span
                key={recent[i].id}
                className={`${styles.dot} ${i === pts.length - 1 ? styles.dotLast : ""}`}
                style={{
                  left: `${(x / W) * 100}%`,
                  top: `${(y / H) * 100}%`,
                  ["--i" as string]: i,
                }}
                title={`${recent[i].title}: ${Math.round(recent[i].overall)}`}
              />
            ))}
          </div>
        </figure>

        <div className={styles.skills}>
          <div className={styles.skill}>
            <span className={styles.skillTag}>Strongest skill</span>
            <span className={styles.skillName}>
              <TrendingUp size={14} strokeWidth={2} aria-hidden="true" />
              {METRIC_LABELS[s.strongest]}
            </span>
          </div>
          <div className={`${styles.skill} ${styles.focus}`}>
            <span className={styles.skillTag}>Focus next</span>
            <span className={styles.skillName}>
              <Target size={14} strokeWidth={2} aria-hidden="true" />
              {METRIC_LABELS[s.weakest]}
            </span>
            <p className={styles.tip}>{TIPS[s.weakest]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
