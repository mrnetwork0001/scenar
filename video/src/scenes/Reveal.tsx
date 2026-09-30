import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clip, clipTime, rectOf } from "../assets";
import { ClipView } from "../media";
import { alignWords, sceneTiming } from "../timing";
import { C, CLAMP, EASE_IN_OUT, display, H, monoLabel, W } from "../theme";
import { Camera, projectRect, type CamKey } from "../ui/Camera";
import { KineticLine } from "../ui/KineticLine";
import { Redaction } from "../ui/Redaction";

export function revealPlan() {
  const S = sceneTiming("reveal");
  const truth = S.cue("truth");
  const match = Math.max(truth + 24, S.cue("dana") - 6);
  const number = Math.max(match + 16, S.cue(["eighty", "84"]));
  const c = clip("reveal");
  // open on the finished score, reach "truth revealed" as the narrator says "truth"
  const time = clipTime(c, [
    { at: 0, src: Math.max(0, (c.marks.truth_revealed ?? 190) - Math.max(40, truth + 30)) },
    { at: truth + 4, src: ["truth_revealed", "click", "reveal"] },
  ]);
  const ask = Math.min(S.dur - 70, S.lineEnd(0) + 12);
  return { S, c, time, truth, match, number, ask };
}

export const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const V = revealPlan();
  const { S, c } = V;
  const truthRect = rectOf(c, "truth") ?? { x: 0, y: 0, w: c.width, h: c.height };
  const keys: CamKey[] = [
    { at: 0, rect: rectOf(c, "score"), pad: 0.1 },
    { at: Math.round(V.truth * 0.45), rect: rectOf(c, "radar"), pad: 0.1, move: 26 },
    { at: V.truth - 14, rect: truthRect, pad: 0.06, move: 22 },
  ];
  const drift = 0.0003;

  // match cut: the hidden-truth card grows into a full-frame black card
  const from = projectRect(truthRect, V.match, keys, c.width, c.height, drift);
  const p = interpolate(f, [V.match, V.match + 16], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const box = {
    x: from.x * (1 - p),
    y: from.y * (1 - p),
    w: from.w + (W - from.w) * p,
    h: from.h + (H - from.h) * p,
  };
  const cardText = interpolate(f, [V.match + 10, V.match + 22], [0, 1], CLAMP);
  const tail = alignWords("Now Maya knows exactly what to ask for.", S.words(0).filter((w) => w.start >= S.cue("now") - 1).slice(0, 8));

  return (
    <AbsoluteFill style={{ background: C.white }}>
      <Camera sw={c.width} sh={c.height} keys={keys} drift={drift}>
        <ClipView name="reveal" map={V.time.map} />
      </Camera>
      {f >= V.match && (
        <div
          style={{
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
            background: C.ink,
            borderRadius: 40 * (1 - p),
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 150, top: 250, color: "#fff", opacity: cardText }}>
            <div style={{ ...monoLabel(26), color: "rgba(255,255,255,.5)", letterSpacing: "0.16em", marginBottom: 34 }}>THE HIDDEN TRUTH</div>
            <div style={{ ...display(96), color: "rgba(255,255,255,.62)", marginBottom: 30 }}>Her ceiling</div>
            <Redaction openAt={V.number} frames={18} bar="#fff" pad="0 0.06em">
              <span style={{ ...display(340), letterSpacing: "-0.06em", fontVariantNumeric: "tabular-nums" }}>$84,000</span>
            </Redaction>
          </div>
          {/* silent beat after the line: what she will ask for */}
          <div
            style={{
              position: "absolute",
              right: 150,
              bottom: 104,
              textAlign: "right",
              color: "#fff",
              opacity: interpolate(f, [V.ask, V.ask + 14], [0, 1], CLAMP),
              transform: `translateX(${interpolate(f, [V.ask, V.ask + 14], [40, 0], CLAMP)}px)`,
            }}
          >
            <div style={{ ...monoLabel(26), color: "rgba(255,255,255,.5)", letterSpacing: "0.16em", marginBottom: 20 }}>HER ASK</div>
            <div style={{ ...display(120), letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>$85,000</div>
          </div>
          <div style={{ position: "absolute", left: 150, bottom: 120, color: "rgba(255,255,255,.7)" }}>
            <KineticLine words={tail} variant="blur" style={display(54)} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
