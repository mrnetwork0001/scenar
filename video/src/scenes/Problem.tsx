import React from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Stock } from "../media";
import { onScreen } from "../speech";
import { alignWords, sceneTiming } from "../timing";
import { C, CLAMP, EASE_OUT, display, monoLabel, tensionColor, tensionLabel } from "../theme";
import { Gauge } from "../ui/Gauge";
import { KineticLine } from "../ui/KineticLine";
import { Stamp } from "../ui/Stamp";
import { heartbeat, impulse, ramp, shake, springKeys } from "../ui/anim";

/** Take 1: Maya fumbles the offer. Cold open, no logo. */
export function problemPlan() {
  const S = sceneTiming("problem");
  const offerAt = S.lineStart(1);
  const mayaAt = S.lineStart(2);
  const dana2At = S.lineStart(3);
  // freeze as Dana's last word lands; the stamp must slam inside the scene (the rewind
  // then starts on the stamped frame, so "You only get one." carries across the cut)
  const freeze = Math.min(S.cue("competitive", 0, { line: 3 }) + 8, S.dur - 30);
  const stamp = Math.min(freeze + 9, S.dur - 14);
  const needle = [
    { at: 0, v: 16 },
    { at: S.cue(["seventy", "72"], 0, { line: 1 }), v: 38 },
    { at: S.cue("board", 0, { line: 1 }), v: 47 },
    { at: mayaAt + 2, v: 58 },
    { at: S.cue("sorry", 0, { line: 2 }), v: 66 },
    { at: S.cue("totally", 0, { line: 2 }), v: 74 },
    { at: dana2At, v: 79 },
    { at: S.cue("competitive", 0, { line: 3 }), v: 84 },
  ];
  return { S, offerAt, mayaAt, dana2At, freeze, stamp, needle, notifyAt: offerAt - 8 };
}

// gauge HUD geometry (shared with the poster so frame 0 matches it)
export const HUD = { left: 1040, top: 440, width: 820 };

export const ProblemHud: React.FC<{ value: number; pulse?: number }> = ({ value, pulse = 0 }) => (
  <>
    <div style={{ position: "absolute", left: HUD.left, top: HUD.top }}>
      <Gauge value={value} width={HUD.width} tone="light" pulse={pulse} weight={1.3} />
    </div>
    <div
      style={{
        position: "absolute",
        left: HUD.left + HUD.width / 2 - 200,
        width: 400,
        top: HUD.top + (500 * HUD.width) / 1000 + 34,
        textAlign: "center",
        color: "#fff",
      }}
    >
      <div style={{ ...display(104), fontVariantNumeric: "tabular-nums" }}>{Math.round(value)}</div>
      <div style={{ ...monoLabel(22), marginTop: 8, color: tensionColor(value), textTransform: "uppercase", letterSpacing: "0.14em" }}>
        ● {tensionLabel(value)}
      </div>
    </div>
  </>
);

export const Problem: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const P = problemPlan();
  const { S, offerAt, mayaAt, dana2At, freeze, stamp } = P;

  const value = springKeys(Math.min(f, freeze), fps, P.needle);
  const beat = f >= mayaAt - 10 ? heartbeat(Math.min(f, freeze), fps, interpolate(f, [mayaAt, freeze], [78, 118], CLAMP)) : 0;
  const pulse = beat * interpolate(f, [mayaAt - 10, mayaAt + 20], [0, 1], CLAMP);
  const shakeAmp = f < freeze ? interpolate(f, [mayaAt, dana2At, freeze], [0, 2.2, 5], CLAMP) * (0.6 + 0.4 * beat) : 0;
  const sh = shake(f, shakeAmp, "prob");
  const hit = impulse(f, stamp, 9);
  const hitShake = shake(f, hit * 16, "hit");

  // text
  const nar = alignWords("Maya. 23.", S.words(0).filter((w) => /maya|twenty/i.test(w.word)));
  const offer = alignWords(onScreen(S.lines[1].text), S.words(1));
  const reply = alignWords(S.lines[2].text, S.words(2));
  const dana2 = alignWords(S.lines[3].text, S.words(3));

  const offerPush = ramp(f, mayaAt - 4, mayaAt + 14);
  const notif = interpolate(f, [P.notifyAt, P.notifyAt + 10], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const notifOut = ramp(f, offerAt + 20, offerAt + 32);

  const content = (
    <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(1.02)` }}>
      <Sequence durationInFrames={mayaAt} layout="none">
        <Stock name="maya_laptop_night" window={mayaAt} shade={0.2} />
      </Sequence>
      <Sequence from={mayaAt} layout="none">
        <Stock name="maya_phone_anxious" window={S.dur - mayaAt} shade={0.3} zoom={[1.08, 1.18]} style={{ transform: "scaleX(-1)" }} />
      </Sequence>

      <ProblemHud value={value} pulse={pulse} />

      {/* narrator keywords */}
      <div style={{ position: "absolute", left: 110, bottom: 120, color: "#fff" }}>
        <KineticLine words={nar} variant="rise" exitAt={P.notifyAt - 6} style={{ ...display(190), columnGap: "0.3em" }} />
      </div>

      {/* incoming message notice */}
      {f >= P.notifyAt && notifOut < 1 && (
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 96,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "14px 26px 14px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,.96)",
            color: C.ink,
            fontSize: 26,
            fontFamily: "inherit",
            transform: `translateY(${(1 - notif) * -70}px)`,
            opacity: notif * (1 - notifOut),
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 22, background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 17, fontWeight: 600 }}>DW</span>
          <span style={{ fontWeight: 500 }}>Dana Whitfield</span>
          <span style={{ color: C.g55 }}>· Offer · Northwind Labs</span>
        </div>
      )}

      {/* Dana's offer, typed huge */}
      {f >= offerAt - 2 && f < dana2At && (
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 190,
            width: 1480,
            color: "#fff",
            transformOrigin: "0 0",
            transform: `translateY(${-offerPush * 80}px) scale(${1 - offerPush * 0.42})`,
            opacity: 1 - offerPush * 0.55,
          }}
        >
          <div style={{ ...monoLabel(24), color: "rgba(255,255,255,.6)", marginBottom: 26 }}>DANA · RECRUITER</div>
          <KineticLine
            words={offer}
            variant="type"
            caret
            style={{ ...display(96), lineHeight: 1.08 }}
            wordStyle={(w) => (w.startsWith("$") ? { fontWeight: 500 } : undefined)}
          />
        </div>
      )}

      {/* Maya's reply, stuttering */}
      {f >= mayaAt - 2 && f < dana2At + 12 && (
        <div style={{ position: "absolute", left: 110, top: 440, width: 900, color: "#fff", opacity: 1 - ramp(f, dana2At, dana2At + 12) }}>
          <div style={{ ...monoLabel(24), color: "rgba(255,255,255,.6)", marginBottom: 22 }}>MAYA</div>
          <KineticLine words={reply} variant="stutter" style={{ ...display(72, 300), lineHeight: 1.12 }} />
        </div>
      )}

      {/* Dana closes the door */}
      {f >= dana2At - 2 && (
        <div style={{ position: "absolute", left: 110, top: 250, width: 1000, color: "#fff" }}>
          <div style={{ ...monoLabel(24), color: "rgba(255,255,255,.6)", marginBottom: 26 }}>DANA</div>
          <KineticLine words={dana2} variant="scale" style={{ ...display(120, 400), lineHeight: 1.02 }} />
        </div>
      )}
    </AbsoluteFill>
  );

  const wash = interpolate(f, [freeze, freeze + 5], [0, 1], CLAMP);
  const cap = ramp(f, stamp + 6, stamp + 18);

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${hitShake.x}px, ${hitShake.y}px)` }}>
        <Freeze frame={freeze} active={f >= freeze}>
          <AbsoluteFill style={{ filter: wash > 0 ? `grayscale(${wash}) contrast(${1 + wash * 0.2})` : undefined }}>{content}</AbsoluteFill>
        </Freeze>
        {/* frozen frame bleaches to paper */}
        <AbsoluteFill style={{ background: "#fff", opacity: wash * 0.88 }} />
        {f >= stamp - 6 && (
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 70 }}>
            <Stamp at={stamp} text="TAKE 1" size={250} />
            <div style={{ ...display(56), color: C.ink, opacity: cap, transform: `translateY(${(1 - cap) * 16}px)` }}>You only get one.</div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      {/* impact flash */}
      {hit > 0 && <AbsoluteFill style={{ background: "#fff", opacity: hit * 0.5 }} />}
    </AbsoluteFill>
  );
};
