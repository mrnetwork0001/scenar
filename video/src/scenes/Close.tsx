import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Stock } from "../media";
import { onScreen } from "../speech";
import { alignWords, sceneTiming } from "../timing";
import { C, CLAMP, EASE_IN_OUT, EASE_OUT, display, MONO, SANS } from "../theme";
import { Captions } from "../ui/Captions";
import { KineticLine } from "../ui/KineticLine";
import { Mark } from "../ui/Mark";
import { NeedleOverlay, wedgePolygon } from "../ui/transitions";
import { ramp, springKeys } from "../ui/anim";
import { ProblemHud } from "./Problem";

export function closePlan() {
  const S = sceneTiming("close");
  const e83 = S.cue(["eighty", "83"], 0, { line: 1 });
  const smileAt = Math.max(S.lineStart(1) + 10, e83 - 2);
  const hold = 45; // last 1.5s held clean
  const last = S.lines.length - 1;
  const wipe = Math.min(S.dur - hold - 50, Math.max(smileAt + 36, S.lineStart(last) - 12));
  // the set-up line is on screen only (the narrator says just "Rehearse it first.")
  const endWords = wipe + 10;
  const rehearse = Math.min(S.dur - hold - 22, Math.max(endWords + 12, S.cue("rehearse", 0, { line: last })));
  const sign = Math.min(S.dur - hold - 14, rehearse + 24);
  return { S, e83, smileAt, wipe, endWords, rehearse, sign, hold };
}

export const Close: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const X = closePlan();
  const { S } = X;

  const value = springKeys(f, fps, [
    { at: 0, v: 46 },
    { at: S.cue("comfortable", 0, { line: 0 }), v: 33 },
    { at: X.e83, v: 12 },
  ], { stiffness: 50, damping: 12, mass: 1 });

  const wipeP = interpolate(f, [X.wipe, X.wipe + 22], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const numP = interpolate(f, [X.e83 - 2, X.e83 + 20], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const k = Math.round(72 + 11 * numP);

  const lastWords = S.words(S.lines.length - 1);
  const rw = lastWords.filter((w) => w.start >= X.rehearse - 1).slice(0, 3);
  const end1 = alignWords("Rehearse it first.", rw.length === 3 ? rw : lastWords.slice(-3)).map((w, i) => ({ ...w, start: Math.min(w.start, X.rehearse + 12 + i * 5) }));
  const end0c = "Your next hard conversation is coming.".split(" ").map((w, i) => ({ word: w, start: X.endWords + i * 3, end: X.endWords + i * 3 + 3 }));
  const sign = ramp(f, X.sign, X.sign + 14);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {wipeP < 1 && (
        <AbsoluteFill>
          <Sequence durationInFrames={X.smileAt} layout="none">
            <Stock name="maya_confident_call" window={X.smileAt} shade={0.26} zoom={[1.02, 1.08]} />
          </Sequence>
          <Sequence from={X.smileAt} layout="none">
            <Stock name="maya_smile" window={X.wipe - X.smileAt + 20} shade={0.22} zoom={[1.1, 1.04]} />
          </Sequence>
          <ProblemHud value={value} />
          {f >= X.e83 - 2 && (
            <div style={{ position: "absolute", left: 110, top: 170, color: "#fff", opacity: numP }}>
              <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: "rgba(255,255,255,.6)", marginBottom: 20 }}>FINAL OFFER</div>
              <div style={{ ...display(300), letterSpacing: "-0.06em", fontVariantNumeric: "tabular-nums", transform: `translateY(${(1 - numP) * 40}px)` }}>
                ${k},000
              </div>
              <div style={{ fontFamily: SANS, fontSize: 34, color: "rgba(255,255,255,.6)", marginTop: 14, textDecoration: "line-through", opacity: numP }}>$72,000</div>
            </div>
          )}
          <Captions words={S.words(0).map((w) => ({ ...w, word: onScreen(w.word) }))} speaker="Maya" left={110} width={880} maxWords={8} />
          <Captions words={S.words(1)} speaker="Dana" left={110} width={880} maxWords={8} />
        </AbsoluteFill>
      )}
      {wipeP > 0 && (
        <AbsoluteFill style={{ background: C.white, clipPath: wipeP >= 1 ? undefined : wedgePolygon(wipeP) }}>
          <div style={{ position: "absolute", left: 140, top: 250, right: 140, color: C.ink }}>
            <KineticLine words={end0c} variant="blur" style={{ ...display(72), color: C.g55 }} />
            <div style={{ height: 34 }} />
            <KineticLine words={end1} variant="rise" style={{ ...display(236), letterSpacing: "-0.055em" }} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 140,
              right: 140,
              bottom: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: sign,
              transform: `translateY(${(1 - sign) * 16}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Mark size={84} at={X.sign - 2} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 64, letterSpacing: "-0.04em", color: C.ink }}>Scenar</span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 40, color: C.ink, letterSpacing: "0.01em" }}>www.tryscenar.xyz</span>
          </div>
        </AbsoluteFill>
      )}
      <NeedleOverlay p={wipeP} />
    </AbsoluteFill>
  );
};
