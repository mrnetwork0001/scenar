import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { alignWords, sceneTiming } from "../timing";
import { C, CLAMP, EASE_IN_OUT, EASE_OUT, display, MONO, monoLabel, SANS } from "../theme";
import { FloatingCard, Stage } from "../ui/FloatingCard";
import { KineticLine } from "../ui/KineticLine";
import { Mark } from "../ui/Mark";
import { Redaction } from "../ui/Redaction";

export function ideaPlan() {
  const S = sceneTiming("idea");
  const markAt = Math.max(2, S.cue("scenar") - 6);
  // hold the centred lockup (~1.2s) before it docks, so "This is Scenar" lands
  const dock = Math.max(markAt + 36, S.cue("rehearsal") - 4);
  const cardsAt = Math.max(dock + 30, S.cue("every") - 6);
  // each dossier's redaction opens on a spoken cue; cards without their own word
  // open in a ripple right after (the line may or may not mention the deadline)
  const budget = S.cue(["budget", "ceiling"]);
  const reason = S.cue("reason");
  const hasDeadline = S.lines[0]?.words.some((w) => /deadline/i.test(w.word));
  const deadline = hasDeadline ? S.cue("deadline") : Math.round((S.cue("ceiling") + reason) / 2);
  const loud = S.cue(["loud", "out"]);
  const open: Record<string, number> = {
    "Dana Whitfield": budget,
    "Marcus Hale": deadline,
    "Prof. Elena Ricci": deadline + 7,
    "Jordan Pike": reason,
    "Priya Raman": Math.max(reason + 7, loud),
  };
  return { S, markAt, dock, cardsAt, open };
}

type Dossier = { name: string; role: string; initials: string; tag: string; secret: string; key: "budget" | "deadline" | "reason" };
const DOSSIERS: Dossier[] = [
  { name: "Jordan Pike", role: "Former peer", initials: "JP", tag: "Hard feedback", secret: "Caring for a sick parent. Hasn't told anyone.", key: "reason" },
  { name: "Marcus Hale", role: "Engineering manager", initials: "MH", tag: "Say no", secret: "The Monday demo can slip to Wednesday.", key: "deadline" },
  { name: "Dana Whitfield", role: "Senior recruiter", initials: "DW", tag: "Salary offer", secret: "Ceiling: $84,000 base, plus a $5k signing bonus.", key: "budget" },
  { name: "Prof. Elena Ricci", role: "Course lead", initials: "ER", tag: "Extension", secret: "Can grant up to 5 days for emergencies.", key: "deadline" },
  { name: "Priya Raman", role: "Director", initials: "PR", tag: "Unfair review", secret: "The rating came from one unverified escalation.", key: "reason" },
];
// 2.5D arc of cards: x, y, z, rotateY
const SLOTS = [
  { x: 205, y: 640, z: -240, ry: 18 },
  { x: 583, y: 625, z: -90, ry: 9 },
  { x: 960, y: 615, z: 40, ry: 0 },
  { x: 1337, y: 625, z: -90, ry: -9 },
  { x: 1715, y: 640, z: -240, ry: -18 },
];

export const Idea: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const I = ideaPlan();
  const { S } = I;

  // logo lockup: big and centred, then docks top-left
  const dockP = interpolate(f, [I.dock, I.dock + 22], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const word = interpolate(f, [I.markAt + 8, I.markAt + 22], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const lockScale = 1 - dockP * 0.8;
  const lockX = interpolate(dockP, [0, 1], [960, 110]);
  const lockY = interpolate(dockP, [0, 1], [540, 96]);

  const l0 = S.words(0);
  const rawTag = alignWords("A rehearsal room for hard conversations.", l0.filter((w) => w.start >= S.cue("rehearsal") - 12).slice(0, 6));
  // the tagline shares the logo's vertical band: never start it before the lockup has docked
  const tagShift = Math.max(0, I.dock + 20 - (rawTag[0]?.start ?? 0));
  const tagWords = rawTag.map((w) => ({ ...w, start: w.start + tagShift, end: w.end + tagShift }));
  const tagStart = tagWords[0]?.start ?? I.dock;
  const hideWords = alignWords("Every counterpart hides something.", l0.filter((w) => w.start >= S.cue("every") - 1).slice(0, 5));

  const camPush = interpolate(f, [I.cardsAt, S.dur], [1, 1.07], CLAMP);

  return (
    <AbsoluteFill style={{ background: C.white, overflow: "hidden" }}>
      {/* lockup */}
      <div
        style={{
          position: "absolute",
          left: lockX,
          top: lockY,
          // glide the centring offset (-50% -> 0) instead of snapping it on the first docking frame
          transform: `translate(${interpolate(dockP, [0, 1], [-50, 0])}%, -50%) scale(${lockScale})`,
          transformOrigin: "0 50%",
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <Mark size={250} at={I.markAt} />
        <div style={{ overflow: "hidden", width: `${word * 100}%`, maxWidth: word * 820 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 230, letterSpacing: "-0.05em", lineHeight: 1, color: C.ink, whiteSpace: "nowrap" }}>Scenar</div>
        </div>
      </div>

      {/* tagline between lockup and cards */}
      {f >= tagStart - 2 && f < I.cardsAt + 16 && (
        <div style={{ position: "absolute", left: 140, right: 140, top: 380, color: C.ink }}>
          <KineticLine words={tagWords} variant="rise" exitAt={I.cardsAt} style={{ ...display(150), justifyContent: "flex-start", letterSpacing: "-0.05em" }} />
        </div>
      )}

      {/* dossier cards */}
      {f >= I.cardsAt - 4 && (
        <>
          <div style={{ position: "absolute", left: 140, top: 190, color: C.ink }}>
            <KineticLine words={hideWords} variant="blur" style={{ ...display(84) }} />
          </div>
          <AbsoluteFill style={{ transform: `scale(${camPush})`, transformOrigin: "50% 60%" }}>
            <Stage perspective={1700}>
              {DOSSIERS.map((d, i) => {
                const s = SLOTS[i];
                const order = [2, 1, 3, 0, 4].indexOf(i);
                const inP = spring({ frame: f - I.cardsAt - order * 4, fps, config: { damping: 18, stiffness: 90 } });
                const openAt = I.open[d.name];
                const focus = spring({ frame: f - openAt, fps, config: { damping: 20, stiffness: 110 } });
                const bob = Math.sin((f + i * 23) / 34) * 8;
                return (
                  <FloatingCard
                    key={d.name}
                    x={s.x}
                    y={s.y + bob + (1 - inP) * 260}
                    z={s.z - (1 - inP) * 900 + focus * 90}
                    ry={s.ry * (1 - focus * 0.4)}
                    rx={(1 - inP) * 25}
                    w={360}
                    h={520}
                    opacity={Math.min(1, inP * 1.6)}
                    style={{ padding: 30 }}
                  >
                    <DossierBody d={d} openAt={openAt} />
                  </FloatingCard>
                );
              })}
            </Stage>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

const DossierBody: React.FC<{ d: Dossier; openAt: number }> = ({ d, openAt }) => (
  <div style={{ fontFamily: SANS, color: C.ink, display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 62, height: 62, borderRadius: 31, background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 21 }}>{d.initials}</div>
      <div>
        <div style={{ fontSize: 25, fontWeight: 500, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{d.name}</div>
        <div style={{ fontSize: 19, color: C.g55 }}>{d.role}</div>
      </div>
    </div>
    <div style={{ marginTop: 22, alignSelf: "flex-start", border: `1.5px solid ${C.g12}`, borderRadius: 999, padding: "6px 16px", fontSize: 16, fontWeight: 500 }}>{d.tag}</div>
    <div style={{ flex: 1 }} />
    <div style={{ ...monoLabel(15), color: C.g55, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14 }}>Hidden · classified</div>
    <Redaction openAt={openAt} frames={18} style={{ display: "block" }} pad="4px 6px">
      <span style={{ fontSize: 27, lineHeight: 1.22, letterSpacing: "-0.02em", fontWeight: 400, display: "block" }}>{d.secret}</span>
    </Redaction>
    <div style={{ marginTop: 18, height: 1.5, background: C.g08 }} />
    <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 14, color: C.g38 }}>FILE {d.initials}-{d.key.toUpperCase()}</div>
  </div>
);
