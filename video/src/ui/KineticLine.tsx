import React from "react";
import { interpolate, random, useCurrentFrame } from "remotion";
import { CLAMP, EASE_OUT } from "../theme";
import type { Word } from "../timing";

export type KVariant = "type" | "rise" | "blur" | "scale" | "stutter";

const STUTTER = /^(oh|um|uh|sorry|er|like)\b/i;

type Props = {
  words: Word[];
  variant?: KVariant;
  style?: React.CSSProperties;
  /** per-word style override (emphasis) */
  wordStyle?: (w: string, i: number) => React.CSSProperties | undefined;
  /** frame at which the whole line exits */
  exitAt?: number;
  exitFrames?: number;
  caret?: boolean;
  caretColor?: string;
  /** words are hidden until their cue (default) or shown as ghost text */
  ghost?: number;
};

export const KineticLine: React.FC<Props> = ({
  words,
  variant = "rise",
  style,
  wordStyle,
  exitAt,
  exitFrames = 10,
  caret = false,
  caretColor = "currentColor",
  ghost = 0,
}) => {
  const f = useCurrentFrame();
  const exit = exitAt === undefined ? 0 : interpolate(f, [exitAt, exitAt + exitFrames], [0, 1], { ...CLAMP, easing: EASE_OUT });
  if (exit >= 1) return null;

  // index of the word currently being typed (for the caret)
  let active = -1;
  words.forEach((w, i) => {
    if (f >= w.start) active = i;
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: "0.26em",
        rowGap: "0.08em",
        opacity: 1 - exit,
        filter: exit > 0 ? `blur(${exit * 14}px)` : undefined,
        transform: exit > 0 ? `translateY(${-exit * 30}px)` : undefined,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const ws = wordStyle?.(w.word, i);
        const p = interpolate(f, [w.start, w.start + 9], [0, 1], { ...CLAMP, easing: EASE_OUT });
        const shown = f >= w.start;

        if (variant === "type") {
          const len = w.word.length;
          const typeEnd = Math.max(w.start + len * 0.9, Math.min(w.end, w.start + len * 2.2));
          const n = shown ? Math.round(interpolate(f, [w.start, typeEnd], [1, len], CLAMP)) : 0;
          const typing = i === active && (n < len || (i === words.length - 1 && Math.floor(f / 8) % 2 === 0) || (words[i + 1] && f < words[i + 1].start && Math.floor(f / 8) % 2 === 0));
          return (
            <span key={i} style={{ position: "relative", whiteSpace: "pre", ...ws }}>
              <span>{w.word.slice(0, n)}</span>
              <span style={{ opacity: ghost }}>{w.word.slice(n)}</span>
              {caret && typing && (
                <span
                  style={{
                    position: "absolute",
                    top: "0.08em",
                    bottom: "0.02em",
                    width: "0.06em",
                    background: caretColor,
                    left: `calc(${(n / len) * 100}% + 0.04em)`,
                  }}
                />
              )}
            </span>
          );
        }

        if (variant === "rise") {
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em", ...ws }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: shown ? 1 : ghost }}>{w.word}</span>
            </span>
          );
        }

        if (variant === "scale") {
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: shown ? p : ghost,
                transform: `scale(${1 + (1 - p) * 0.35})`,
                transformOrigin: "50% 80%",
                ...ws,
              }}
            >
              {w.word}
            </span>
          );
        }

        // blur + stutter
        const isStutter = variant === "stutter" && STUTTER.test(w.word.replace(/[^\w]/g, ""));
        const age = f - w.start;
        const jitter = isStutter && shown ? Math.max(0.35, 1 - age / 20) : variant === "stutter" && shown ? Math.max(0, 1 - age / 8) * 0.4 : 0;
        const jx = jitter ? (random(`jx${i}-${f}`) - 0.5) * 14 * jitter : 0;
        const jy = jitter ? (random(`jy${i}-${f}`) - 0.5) * 8 * jitter : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: shown ? p * (isStutter ? 0.55 : 1) : ghost,
              filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
              transform: `translate(${jx}px, ${jy + (1 - p) * 14}px)`,
              ...ws,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
