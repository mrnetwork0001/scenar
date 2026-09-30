import { METRIC_LABELS, type MetricKey, type Metrics } from "@/lib/types";
import styles from "./RadarChart.module.css";

export interface RadarChartProps {
  metrics: Metrics;
  /** Optional faint overlay (e.g. a previous attempt or target profile). */
  compare?: Metrics;
}

const KEYS = Object.keys(METRIC_LABELS) as MetricKey[];
const CX = 180;
const CY = 150;
const R = 92;

function point(i: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (i / KEYS.length) * Math.PI * 2;
  const r = (Math.max(0, Math.min(100, value)) / 100) * R;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function polygon(m: Metrics): string {
  return KEYS.map((k, i) => point(i, m[k]).join(",")).join(" ");
}

export function RadarChart({ metrics, compare }: RadarChartProps) {
  const summary = KEYS.map((k) => `${METRIC_LABELS[k]} ${Math.round(metrics[k])}`).join(", ");

  return (
    <figure className={styles.wrap}>
      <svg viewBox="0 0 360 300" className={styles.svg} role="img" aria-label={`Skill radar: ${summary}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            className={f === 1 ? styles.ringOuter : styles.ring}
            points={KEYS.map((_, i) => point(i, f * 100).join(",")).join(" ")}
          />
        ))}
        {KEYS.map((_, i) => {
          const [x, y] = point(i, 100);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className={styles.axis} />;
        })}

        {compare && <polygon className={styles.compare} points={polygon(compare)} />}

        <g className={styles.draw}>
          <polygon points={polygon(metrics)} className={styles.shape} />
          <polygon points={polygon(metrics)} className={styles.outline} pathLength={1} />
          {KEYS.map((k, i) => {
            const [x, y] = point(i, metrics[k]);
            return <circle key={k} cx={x} cy={y} r={3.5} className={styles.dot} />;
          })}
        </g>

        {KEYS.map((k, i) => {
          const [ax, ay] = point(i, 100);
          const words = METRIC_LABELS[k].split(" ");
          const side = i === 1 ? "right" : i === 3 ? "left" : i === 0 ? "top" : "bottom";
          const anchor = side === "right" ? "start" : side === "left" ? "end" : "middle";
          const x = side === "right" ? ax + 14 : side === "left" ? ax - 14 : ax;
          const lines = side === "top" || side === "bottom" ? [words.join(" ")] : words;
          const blockH = (lines.length + 1) * 14;
          const y0 =
            side === "top" ? ay - 16 - blockH + 10 : side === "bottom" ? ay + 22 : ay - blockH / 2 + 10;
          return (
            <text key={k} x={x} y={y0} textAnchor={anchor} className={styles.label}>
              {lines.map((w, j) => (
                <tspan key={j} x={x} dy={j === 0 ? 0 : 14}>
                  {w}
                </tspan>
              ))}
              <tspan x={x} dy={18} className={styles.value}>
                {Math.round(metrics[k])}
              </tspan>
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
