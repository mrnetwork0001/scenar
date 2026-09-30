import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { clip, clipTime, markOf, rectOf } from "../assets";
import { ClipView } from "../media";
import { alignWords, beatFrames, sceneTiming, snapToBeat } from "../timing";
import { C, CLAMP, EASE_OUT, display, monoLabel, SANS } from "../theme";
import { Camera, type CamKey } from "../ui/Camera";
import { KineticLine } from "../ui/KineticLine";
import { Gauge } from "../ui/Gauge";

export function montagePlan() {
  const S = sceneTiming("montage");
  const snap = (rel: number) => snapToBeat(rel + S.from) - S.from;
  const cuts = [0, snap(S.cue("build") - 3), snap(S.cue("track") - 3), snap(S.cue(["any", "device"]) - 3)];
  // enforce order and minimum length
  for (let i = 1; i < cuts.length; i++) cuts[i] = Math.max(cuts[i], cuts[i - 1] + 24);
  const beats = beatFrames()
    .map((b) => b - S.from)
    .filter((b) => b > 0 && b < S.dur);
  return { S, cuts, beats };
}

const TEXTS = ["Say it out loud.", "Build your own scenario.", "Track your progress,", "on any device."];

export const Montage: React.FC = () => {
  const M = montagePlan();
  const { S, cuts } = M;
  const all = S.words(0);
  return (
    <AbsoluteFill style={{ background: C.white }}>
      {cuts.map((from, i) => {
        const to = cuts[i + 1] ?? S.dur + 40;
        const words = alignWords(TEXTS[i], all.filter((w) => w.start >= from - 6 && w.start < to).slice(0, TEXTS[i].split(" ").length)).map((w) => ({
          ...w,
          start: w.start - from,
          end: w.end - from,
        }));
        return (
          <Sequence key={i} from={from} durationInFrames={to - from} layout="none">
            <Segment i={i} words={words} beats={M.beats.filter((b) => b >= from && b < to).map((b) => b - from)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Segment: React.FC<{ i: number; words: ReturnType<typeof alignWords>; beats: number[] }> = ({ i, words, beats }) => {
  const f = useCurrentFrame();
  // every other beat: hard punch-in cut
  let beatIdx = 0;
  beats.forEach((b) => {
    if (f >= b) beatIdx++;
  });
  const punch = beatIdx % 2 === 1 ? 1.14 : 1;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 0, bottom: 0, width: 760, display: "flex", flexDirection: "column", justifyContent: "center", color: C.ink }}>
        <div style={{ ...monoLabel(22), color: C.g38, letterSpacing: "0.16em", marginBottom: 30 }}>{["VOICE", "BUILDER", "PROGRESS", "MOBILE"][i]}</div>
        <KineticLine words={words.map((w) => ({ ...w, start: Math.max(0, w.start) }))} variant="scale" style={{ ...display(118), lineHeight: 1.02 }} />
      </div>
      <div style={{ position: "absolute", left: 900, top: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${punch})`, transformOrigin: "50% 50%" }}>
          {i === 0 && <VoiceShot />}
          {i === 1 && <BuilderShot beatIdx={beatIdx} />}
          {i === 2 && <ProgressShot />}
          {i === 3 && <PhoneShot />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const frame: React.CSSProperties = {
  borderRadius: 32,
  overflow: "hidden",
  position: "relative",
  background: C.white,
  border: `1.5px solid ${C.g08}`,
  boxShadow: "0 50px 100px -40px rgba(10,10,10,.3), 0 16px 32px -16px rgba(10,10,10,.12)",
};

const VoiceShot: React.FC = () => {
  const c = clip("voice");
  const mic = markOf(c, ["mic_on"]) ?? 0;
  const mic2 = rectOf(c, "mic");
  // tight on the mic, the listening line and the live transcript
  const rect = mic2 ? { x: mic2.x - 1180, y: mic2.y - 150, w: 1400, h: 330 } : null;
  return (
    <div style={{ ...frame, width: 1000, height: 440 }}>
      <Camera sw={c.width} sh={c.height} keys={[{ at: 0, rect, pad: 0.02, free: true }]} vw={1000} vh={440} drift={0.0015}>
        <ClipView name="voice" map={(fr) => mic + 42 + fr * 1.5} />
      </Camera>
    </div>
  );
};

const BuilderShot: React.FC<{ beatIdx: number }> = ({ beatIdx }) => {
  const c = clip("builder");
  const built = markOf(c, ["built"]) ?? 230;
  // speed through preset → build → briefing so the new counterpart lands mid-segment
  const time = clipTime(c, [
    { at: 0, src: Math.max(0, (markOf(c, ["preset_click"]) ?? 60) + 20) },
    { at: 14, src: ["build_click", "building"] },
    { at: 30, src: built },
  ]);
  const keys: CamKey[] = [{ at: 0, rect: rectOf(c, "form") ?? rectOf(c, "input") ?? null, pad: 0.04 }];
  return (
    <div style={{ ...frame, width: 900, height: 620 }}>
      <Camera sw={c.width} sh={c.height} keys={beatIdx >= 2 ? [{ at: 0, rect: rectOf(c, "title") ?? rectOf(c, "briefing") ?? null, pad: 0.04, zoom: 0.5 }] : keys} vw={900} vh={620}>
        <ClipView name="builder" map={time.map} />
      </Camera>
    </div>
  );
};

const SCORES = [38, 45, 41, 56, 61, 58, 70, 74, 83];
const ProgressShot: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = 820;
  const h = 300;
  const pts = SCORES.map((v, i) => [40 + (i * (w - 80)) / (SCORES.length - 1), h - 30 - ((v - 30) / 60) * (h - 60)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  const p = interpolate(f, [2, 30], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const ev = evolvePath(p, d);
  const n = Math.round(SCORES[0] + (SCORES[SCORES.length - 1] - SCORES[0]) * p);
  const g = spring({ frame: f - 4, fps, config: { damping: 16 } });
  return (
    <div style={{ ...frame, width: 900, height: 620, padding: 40, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontFamily: SANS, color: C.ink }}>
        <div>
          <div style={{ fontSize: 24, color: C.g55 }}>Overall score</div>
          <div style={{ ...display(150), fontVariantNumeric: "tabular-nums" }}>{n}</div>
        </div>
        <Gauge value={interpolate(g, [0, 1], [70, 22])} width={260} weight={2.2} labels={false} />
      </div>
      <svg width={w} height={h} style={{ position: "absolute", left: 40, bottom: 30 }}>
        {[0, 1, 2].map((k) => (
          <line key={k} x1={40} x2={w - 40} y1={30 + k * ((h - 60) / 2)} y2={30 + k * ((h - 60) / 2)} stroke={C.g08} strokeWidth={2} />
        ))}
        <path d={d} fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        {pts.map((q, i) => (i / (pts.length - 1) <= p ? <circle key={i} cx={q[0]} cy={q[1]} r={9} fill="#fff" stroke={C.ink} strokeWidth={4} /> : null))}
      </svg>
    </div>
  );
};

const PhoneShot: React.FC = () => {
  const c = clip("phone");
  const sw = 400;
  const scale = sw / c.width;
  // one exchange, then the Menu sheet with the plan card and the Sandbox/Live switch
  const phoneTime = clipTime(c, [
    { at: 0, src: Math.max(0, (markOf(c, ["reply_in"]) ?? 60) - 40) },
    { at: 26, src: ["reply_in"] },
    { at: 50, src: ["sheet_open"] },
  ]);
  const sh = c.height * scale;
  return (
    <div style={{ width: sw + 28, height: sh + 28, borderRadius: 78, background: C.ink, padding: 14, boxSizing: "border-box", boxShadow: "0 60px 120px -40px rgba(10,10,10,.45)" }}>
      <div style={{ width: sw, height: sh, borderRadius: 64, overflow: "hidden", position: "relative", background: "#fff" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: c.width, height: c.height, position: "absolute" }}>
          <ClipView name="phone" map={phoneTime.map} />
        </div>
      </div>
    </div>
  );
};
