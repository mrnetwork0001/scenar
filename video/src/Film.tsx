import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { has, src } from "./assets";
import { MetaCtx } from "./media";
import { PosterOverlay } from "./Poster";
import { closePlan, Close } from "./scenes/Close";
import { Idea, ideaPlan } from "./scenes/Idea";
import { Montage } from "./scenes/Montage";
import { Problem, problemPlan } from "./scenes/Problem";
import { rcPlan, RevenueCat } from "./scenes/RevenueCat";
import { Reveal, revealPlan } from "./scenes/Reveal";
import { RewindScene, rewindPlan } from "./scenes/RewindScene";
import { Take2, take2Plan } from "./scenes/Take2";
import { TIMING, sceneById } from "./timing";
import { barWipe, needleWipe } from "./ui/transitions";
import type { TransitionPresentation } from "@remotion/transitions";

const SCENES: { id: string; C: React.FC }[] = [
  { id: "problem", C: Problem },
  { id: "rewind", C: RewindScene },
  { id: "idea", C: Idea },
  { id: "take2", C: Take2 },
  { id: "reveal", C: Reveal },
  { id: "revenuecat", C: RevenueCat },
  { id: "montage", C: Montage },
  { id: "close", C: Close },
];

/**
 * Transitions INTO a scene. The outgoing scene is extended by the transition length,
 * so every scene still starts exactly at its timing.json `from` (audio stays locked);
 * the transition plays over the first frames of the incoming scene.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const INTO: Record<string, { frames: number; p: TransitionPresentation<any> }> = {
  take2: { frames: 20, p: needleWipe() },
  revenuecat: { frames: 18, p: barWipe() },
};

export type FilmProps = { meta: Record<string, number> };

export const Film: React.FC<FilmProps> = ({ meta }) => {
  return (
    <MetaCtx.Provider value={meta ?? {}}>
      <AbsoluteFill style={{ background: "#fff" }}>
        <TransitionSeries>
          {SCENES.flatMap(({ id, C: Comp }, i) => {
            const s = sceneById(id);
            const next = SCENES[i + 1];
            const tr = next ? INTO[next.id] : undefined;
            const items = [
              <TransitionSeries.Sequence key={id} durationInFrames={s.durationInFrames + (tr?.frames ?? 0)} premountFor={30}>
                <Comp />
              </TransitionSeries.Sequence>,
            ];
            if (tr) {
              items.push(<TransitionSeries.Transition key={`${id}-t`} presentation={tr.p} timing={linearTiming({ durationInFrames: tr.frames })} />);
            }
            return items;
          })}
        </TransitionSeries>
        {/* a settled, poster-like first frame (thumbnail), then straight into the scene */}
        <Sequence durationInFrames={6} layout="none">
          <PosterOverlay withMark={false} />
        </Sequence>
        <Soundtrack />
      </AbsoluteFill>
    </MetaCtx.Provider>
  );
};

// ---------------- audio ----------------

type Sfx = { name: string; at: number; volume?: number; dur?: number; loop?: boolean };

function sfxCues(): Sfx[] {
  const P = problemPlan();
  const R = rewindPlan();
  const I = ideaPlan();
  const T = take2Plan();
  const V = revealPlan();
  const RC = rcPlan();
  const X = closePlan();
  const at = (id: string, rel: number) => sceneById(id).from + rel;
  const out: Sfx[] = [
    { name: "notify", at: at("problem", P.notifyAt), volume: 0.7 },
    { name: "typing", at: at("problem", P.offerAt), dur: P.S.lineEnd(1) - P.offerAt, loop: true, volume: 0.35 },
    { name: "heartbeat", at: at("problem", P.mayaAt - 10), dur: P.dana2At - P.mayaAt + 10, loop: true, volume: 0.6 },
    { name: "heartbeat_fast", at: at("problem", P.dana2At), dur: P.freeze - P.dana2At, loop: true, volume: 0.7 },
    { name: "stamp", at: at("problem", P.stamp - 1), volume: 1 },
    { name: "rewind", at: at("rewind", 0), volume: 0.85 },
    { name: "glitch_hit", at: at("rewind", 0), volume: 0.6 },
    { name: "needle_whoosh", at: at("rewind", R.wipeStart), volume: 0.75 },
    { name: "riser", at: at("idea", I.markAt - 40), dur: 42, volume: 0.35 },
    { name: "impact", at: at("idea", I.markAt + 2), volume: 0.8 },
    { name: "needle_whoosh", at: sceneById("take2").from, volume: 0.6 },
    { name: "cash_click", at: at("reveal", V.number), volume: 0.8 },
    { name: "needle_whoosh", at: sceneById("revenuecat").from, volume: 0.4 },
    { name: "cash_click", at: at("revenuecat", RC.live), volume: 0.5 },
    { name: "unlock", at: at("revenuecat", RC.unlock), volume: 0.9 },
    { name: "cash_click", at: at("close", X.e83), volume: 0.7 },
    { name: "needle_whoosh", at: at("close", X.wipe), volume: 0.7 },
  ];
  // typing under the composer in Take 2, when the footage says when it is typed
  const send = T.c.marks.sent ?? T.c.marks.send;
  if (send !== undefined) {
    const a = Math.max(0, T.time.inv(T.c.marks.typed_start ?? 0));
    const b = T.time.inv(send);
    if (b - a > 6) out.push({ name: "typing", at: at("take2", a), dur: b - a, loop: true, volume: 0.22 });
  }
  return out.filter((s) => s.at >= 0);
}

function musicVolume(f: number): number {
  // mix from the audio agent: ~0.37 between lines, ~0.12 under dialogue/VO
  const base = 0.37;
  const duck = 0.12;
  let v = base;
  for (const s of TIMING.scenes) {
    for (const l of s.lines) {
      const a = l.startFrame;
      const b = l.startFrame + l.durationFrames;
      const k = interpolate(f, [a - 10, a, b, b + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      v = Math.min(v, base - (base - duck) * k);
    }
  }
  const fadeOut = interpolate(f, [TIMING.totalFrames - 40, TIMING.totalFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = interpolate(f, [0, 8], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return v * fadeOut * fadeIn;
}

// Dana's short closing lines sit low in the mix: +3 dB
const VO_GAIN: Record<string, number> = { problem_3: 1.4, close_1: 1.4 };

const Soundtrack: React.FC = () => {
  const music = "audio/music.mp3";
  return (
    <>
      {has(music) && <Audio src={src(music)} volume={musicVolume} />}
      {TIMING.scenes.flatMap((s) =>
        s.lines.map((l, i) =>
          has(l.file) ? (
            <Sequence key={`${s.id}-${i}`} from={l.startFrame} layout="none">
              <Audio src={src(l.file)} volume={VO_GAIN[`${s.id}_${i}`] ?? 1} />
            </Sequence>
          ) : null,
        ),
      )}
      {sfxCues().map((c, i) => {
        const file = `audio/sfx/${c.name}.mp3`;
        if (!has(file)) return null;
        return (
          <Sequence key={`sfx-${i}`} from={Math.round(c.at)} durationInFrames={c.dur ? Math.max(1, Math.round(c.dur)) : undefined} layout="none">
            <Audio src={src(file)} volume={c.volume ?? 1} loop={c.loop} />
          </Sequence>
        );
      })}
    </>
  );
};
