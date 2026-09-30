import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { alignWords, sceneTiming } from "../timing";
import { C, CLAMP, EASE_IN, EASE_IN_OUT, display, monoLabel, W } from "../theme";
import { Rewind } from "../ui/Rewind";
import { NeedleOverlay, wedgePolygon } from "../ui/transitions";
import { KineticLine } from "../ui/KineticLine";
import { Problem, problemPlan } from "./Problem";

export function rewindPlan() {
  const S = sceneTiming("rewind");
  const rewindEnd = Math.min(46, Math.round(S.dur * 0.22));
  const wipeStart = rewindEnd - 4;
  const wipeEnd = wipeStart + 22;
  const one = Math.max(wipeEnd, S.cue("one"));
  const what = Math.max(one + 20, S.cue("what"));
  return { S, rewindEnd, wipeStart, wipeEnd, one, what };
}

/** The whole of Take 1 plays backwards at speed, then the needle wipes to white. */
export const RewindScene: React.FC = () => {
  const f = useCurrentFrame();
  const R = rewindPlan();
  const P = problemPlan();
  const probEnd = P.stamp + 30;
  // accelerate backwards through Take 1: slow start, very fast middle
  const srcFrame = (fr: number) => probEnd - interpolate(fr, [0, R.rewindEnd], [0, probEnd], { ...CLAMP, easing: EASE_IN });
  const amount = (fr: number) => interpolate(fr, [0, 6, R.rewindEnd - 8, R.rewindEnd], [0.35, 1, 1, 0.6], CLAMP);

  const wipe = interpolate(f, [R.wipeStart, R.wipeEnd], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });

  const l0 = S_words(R, 0);
  const oneTake = alignWords("One take.", l0.filter((w) => /^(one|take)/i.test(w.word)).slice(0, 2));
  const pre = alignWords("The conversations that shape your career get", l0.slice(0, 7));
  const q1 = alignWords("What if Maya could", l0.filter((w) => w.start >= R.S.cue("what") - 1).slice(0, 4));
  const q2 = alignWords("rehearse it first?", l0.filter((w) => w.start >= R.S.cue("rehearse") - 1).slice(0, 3));
  const firstExit = R.what - 6;

  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      {f < R.wipeEnd && (
        <AbsoluteFill>
          <Rewind srcFrame={srcFrame} amount={(fr) => (fr < R.rewindEnd ? amount(fr) : 0)}>
            <Problem />
          </Rewind>
        </AbsoluteFill>
      )}
      {/* white floods in behind the sweeping needle */}
      {wipe > 0 && (
        <AbsoluteFill style={{ background: "#fff", clipPath: wipe >= 1 ? undefined : wedgePolygon(wipe) }}>
          <Words f={f} pre={pre} oneTake={oneTake} q1={q1} q2={q2} firstExit={firstExit} />
        </AbsoluteFill>
      )}
      <NeedleOverlay p={wipe} />
    </AbsoluteFill>
  );
};

function S_words(R: ReturnType<typeof rewindPlan>, i: number) {
  // the narrator's line spans the whole scene, including the rewind itself
  return R.S.words(i);
}

const Words: React.FC<{
  f: number;
  pre: ReturnType<typeof alignWords>;
  oneTake: ReturnType<typeof alignWords>;
  q1: ReturnType<typeof alignWords>;
  q2: ReturnType<typeof alignWords>;
  firstExit: number;
}> = ({ f, pre, oneTake, q1, q2, firstExit }) => (
  <AbsoluteFill style={{ color: C.ink }}>
    {f < firstExit + 12 && (
      <div style={{ position: "absolute", left: 140, top: 250, width: W - 280 }}>
        <KineticLine words={pre} variant="blur" exitAt={firstExit} style={{ ...display(52), color: C.g55 }} ghost={0} />
        <div style={{ height: 24 }} />
        <KineticLine words={oneTake} variant="rise" exitAt={firstExit} style={{ ...display(330), letterSpacing: "-0.055em" }} />
      </div>
    )}
    {f >= firstExit && (
      <div style={{ position: "absolute", left: 140, top: 300, width: W - 280 }}>
        <KineticLine words={q1} variant="blur" style={{ ...display(64), color: C.g55 }} />
        <div style={{ height: 30 }} />
        <KineticLine words={q2} variant="rise" style={{ ...display(220), letterSpacing: "-0.05em" }} />
      </div>
    )}
    <div style={{ position: "absolute", left: 140, bottom: 80, ...monoLabel(22), color: C.g38 }}>TAKE 2</div>
  </AbsoluteFill>
);
