import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clip, clipTime, markOf, rectOf } from "../assets";
import { ClipView } from "../media";
import { sceneTiming } from "../timing";
import { C, CLAMP, EASE_IN_OUT, display, monoLabel, SANS, tensionColor, tensionLabel } from "../theme";
import { Camera, type CamKey } from "../ui/Camera";
import { Gauge } from "../ui/Gauge";
import { ramp, springKeys } from "../ui/anim";

export function take2Plan() {
  const S = sceneTiming("take2");
  const c = clip("take2");
  const anchors = S.cue(["anchors", "anchor"]);
  const calm = S.cue("calm");
  const sent = markOf(c, ["sent", "send"]) ?? 150;
  const typed0 = markOf(c, ["typed_start", "typeStart"]) ?? 0;
  const sendAt = anchors + 18;
  // the long typing is sped up (max 3.5x) so "sent" lands on "anchors", the drop on "calm"
  const time = clipTime(c, [
    { at: 0, src: Math.max(typed0, Math.round(sent - 3.5 * sendAt)) },
    { at: sendAt, src: sent },
    { at: calm + 4, src: ["tension_drop", "drop", "reply_in", "reply"] },
  ]);
  const dropMark = markOf(c, ["tension_drop", "drop", "reply_in", "reply"]);
  const dropAt = dropMark !== undefined ? Math.round(time.inv(dropMark)) : calm;
  const liftAt = Math.max(anchors + 20, calm - 26);
  const scored = S.cue("scored");
  const skills = {
    Assertiveness: S.cue("assertiveness"),
    Composure: S.cue("composure"),
    Clarity: S.cue("clarity"),
    Boundaries: S.cue("boundaries"),
  };
  const meterAgain = S.cue("tension", 0, { line: 1 });
  const landed = S.cue("landed");
  const notes = (c.notes ?? {}) as Record<string, string>;
  const before = Number(notes.tensionBefore ?? 50);
  const after = Number(notes.tensionAfter ?? 35);
  const pullBack = landed + 34;
  const compare = Math.min(S.dur - 150, landed + 80);
  return { S, c, time, anchors, calm, dropAt, liftAt, scored, skills, meterAgain, landed, before, after, pullBack, compare };
}

// the values the take2 footage shows for Maya's anchoring message
const SKILL_VALUES: Record<string, number> = { Assertiveness: 92, Composure: 95, Clarity: 90, Boundaries: 95 };

export const Take2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = take2Plan();
  const { c } = T;
  const R = (n: string) => rectOf(c, n);

  const keys: CamKey[] = [
    { at: 0, rect: R("composer") ? { ...R("composer")!, y: R("composer")!.y - 380, h: R("composer")!.h + 420 } : null, pad: 0.04 },
    { at: T.anchors - 4, rect: R("log") ?? R("chat"), pad: 0.04, move: 30 },
    { at: T.liftAt, rect: R("chat"), pad: 0.02, dx: -330, free: true, move: 24 },
    { at: T.scored - 6, rect: R("side") ?? R("metrics"), pad: 0.08, dx: -470, free: true, move: 28 },
    { at: T.meterAgain - 8, rect: R("meter"), pad: 0.1, move: 26 },
    { at: T.landed - 4, rect: R("progress"), pad: 0.1, move: 26 },
    { at: T.pullBack, rect: null, move: 36 },
  ];

  // meter lift-out overlay: in at liftAt, out when the skills arrive
  const lift = spring({ frame: f - T.liftAt, fps, config: { damping: 18, stiffness: 100 } });
  const liftOut = ramp(f, T.scored - 12, T.scored + 4);
  const liftP = lift * (1 - liftOut);
  const value = springKeys(f, fps, [
    { at: 0, v: T.before },
    { at: T.dropAt, v: T.after },
  ], { stiffness: 40, damping: 14, mass: 1 });

  // skill bars overlay
  const firstSkill = Math.min(...Object.values(T.skills));
  const skIn = spring({ frame: f - (firstSkill - 12), fps, config: { damping: 20, stiffness: 110 } });
  const skOut = ramp(f, T.meterAgain - 14, T.meterAgain);
  const skP = skIn * (1 - skOut);

  const dim = Math.max(liftP, skP) * 0.5;

  return (
    <AbsoluteFill style={{ background: C.white }}>
      <Camera sw={c.width} sh={c.height} keys={keys} drift={0.00025}>
        <ClipView name="take2" map={T.time.map} />
      </Camera>
      <AbsoluteFill style={{ background: "#fff", opacity: dim }} />

      {/* the meter, lifted out of the UI */}
      {liftP > 0.001 && (
        <div
          style={{
            position: "absolute",
            left: 1010,
            top: 150,
            width: 800,
            height: 780,
            borderRadius: 36,
            background: C.white,
            border: `1.5px solid ${C.g08}`,
            boxShadow: "0 60px 120px -40px rgba(10,10,10,.35), 0 20px 40px -20px rgba(10,10,10,.15)",
            transform: `perspective(1600px) translateY(${(1 - liftP) * 200}px) rotateX(${(1 - liftP) * 18}deg) rotateY(-8deg) scale(${0.7 + liftP * 0.3})`,
            opacity: Math.min(1, liftP * 1.5),
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 60, top: 70 }}>
            <Gauge value={value} width={680} weight={1.6} labels />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", color: C.ink }}>
            <div style={{ ...display(220), fontVariantNumeric: "tabular-nums", letterSpacing: "-0.06em" }}>{Math.round(value)}</div>
            <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 22px", borderRadius: 999, background: C.surface, fontFamily: SANS, fontSize: 28, fontWeight: 500, color: C.ink }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: tensionColor(value) }} />
              {tensionLabel(value)}
            </div>
          </div>
        </div>
      )}

      {/* four skills, on the word */}
      {skP > 0.001 && (
        <div
          style={{
            position: "absolute",
            left: 1000,
            top: 190,
            width: 820,
            padding: "56px 60px",
            borderRadius: 36,
            background: C.white,
            border: `1.5px solid ${C.g08}`,
            boxShadow: "0 60px 120px -40px rgba(10,10,10,.35), 0 20px 40px -20px rgba(10,10,10,.15)",
            transform: `perspective(1600px) translateX(${(1 - skP) * 160}px) rotateY(${-6 - (1 - skP) * 20}deg)`,
            opacity: Math.min(1, skP * 1.5),
            boxSizing: "border-box",
          }}
        >
          <div style={{ ...monoLabel(20), color: C.g55, letterSpacing: "0.14em", marginBottom: 30 }}>SCORED LIVE · THIS MESSAGE</div>
          {Object.entries(T.skills).map(([name, at]) => {
            const p = spring({ frame: f - at, fps, config: { damping: 22, stiffness: 90 } });
            const v = SKILL_VALUES[name] * p;
            return (
              <div key={name} style={{ marginBottom: 34, opacity: interpolate(f, [at - 4, at + 4], [0.22, 1], CLAMP) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: SANS, color: C.ink }}>
                  <span style={{ fontSize: 44, fontWeight: 400, letterSpacing: "-0.03em" }}>{name}</span>
                  <span style={{ ...display(64), fontVariantNumeric: "tabular-nums" }}>{f >= at ? Math.round(v) : "–"}</span>
                </div>
                <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: C.surface }}>
                  <div style={{ width: `${v}%`, height: 6, borderRadius: 3, background: C.ink }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {f >= T.compare && <Compare at={T.compare} after={T.after} />}

      {/* take counter */}
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 48,
          padding: "10px 20px",
          borderRadius: 999,
          background: C.ink,
          color: "#fff",
          ...monoLabel(22),
          letterSpacing: "0.12em",
          opacity: 1 - ramp(f, 70, 90),
        }}
      >
        ● TAKE 2
      </div>
    </AbsoluteFill>
  );
};

/** Silent beat after the narration: the same moment, Take 1 vs Take 2. */
const Compare: React.FC<{ at: number; after: number }> = ({ at, after }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(f, [at, at + 14], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const col = (i: number) => spring({ frame: f - at - 8 - i * 14, fps, config: { damping: 20, stiffness: 110 } });
  const v2 = springKeys(f, fps, [
    { at: 0, v: 84 },
    { at: at + 34, v: after },
  ], { stiffness: 60, damping: 12, mass: 1 });
  const cols = [
    { take: "TAKE 1", v: 84, quote: "\u201cI was kind of hoping for a bit more?\u201d" },
    { take: "TAKE 2", v: v2, quote: "\u201cI'd be comfortable at $85,000.\u201d" },
  ];
  return (
    <AbsoluteFill style={{ background: C.white, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
      <div style={{ position: "absolute", left: 960, top: 170, bottom: 170, width: 1.5, background: C.g12 }} />
      {cols.map((c, i) => {
        const p = col(i);
        return (
          <div key={c.take} style={{ position: "absolute", left: i ? 1060 : 100, top: 150, width: 760, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, color: C.ink }}>
            <div style={{ ...monoLabel(26), letterSpacing: "0.16em", color: i ? C.ink : C.g38 }}>{c.take}</div>
            <div style={{ marginTop: 40, marginLeft: 20 }}>
              <Gauge value={c.v} width={560} weight={1.6} labels={false} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: -40 }}>
              <span style={{ ...display(180), fontVariantNumeric: "tabular-nums", letterSpacing: "-0.06em" }}>{Math.round(c.v)}</span>
              <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 500, color: tensionColor(c.v) }}>{tensionLabel(c.v)}</span>
            </div>
            <div style={{ ...display(46), color: i ? C.ink : C.g55, lineHeight: 1.15, marginTop: 30, letterSpacing: "-0.03em" }}>{c.quote}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
