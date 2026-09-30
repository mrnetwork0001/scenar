import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { clip, clipTime, markOf, rectOf } from "../assets";
import { ClipView } from "../media";
import { sceneTiming } from "../timing";
import { C, CLAMP, EASE_IN_OUT, EASE_OUT, display, MONO, monoLabel, SANS, W } from "../theme";
import { Camera, type CamKey } from "../ui/Camera";
import { ramp } from "../ui/anim";

export function rcPlan() {
  const S = sceneTiming("revenuecat");
  const offering = S.cue("revenuecat", 0, { line: 0 });
  const placement = S.cue("placement");
  const trial = S.cue(["seven", "7"]);
  const sandbox = S.cue("sandbox");
  const live = Math.max(sandbox + 18, S.cue("live"));
  const stripe = Math.max(live + 12, S.cue("stripe"));
  const diagram = Math.max(stripe + 30, S.cue("and", 0, { line: 1 }) - 8);
  const verifies = Math.max(diagram + 8, S.cue("verifies"));
  const purchase = Math.max(verifies + 8, S.cue("purchase"));
  const rc2 = Math.max(purchase + 8, S.cue("revenuecat", 0, { line: 1 }));
  const unlock = Math.max(rc2 + 12, S.cue("unlocks"));
  // after the narration: the coaching literally unseals, then the inspector proves it
  const coaching = Math.min(S.dur - 260, unlock + 34);
  const inspector = Math.min(S.dur - 160, coaching + 96);
  const pc = clip("paywall");
  const pay = clipTime(pc, [
    { at: 0, src: Math.max(0, (markOf(pc, ["paywall_open"]) ?? 0) - 4) },
    { at: placement - 6, src: ["monthly_selected"] },
    { at: sandbox - 16, src: ["cta_click", "cta"] },
  ]);
  return { pc, coaching, inspector, S, offering, placement, trial, sandbox, live, stripe, diagram, verifies, purchase, rc2, unlock, pay };
}

export const RevenueCat: React.FC = () => {
  const f = useCurrentFrame();
  const P = rcPlan();
  return (
    <AbsoluteFill style={{ background: C.white }}>
      {f < P.sandbox && <PaywallPhase P={P} />}
      {f >= P.sandbox && f < P.diagram && <LivePhase P={P} />}
      {f >= P.diagram && f < P.coaching && <DiagramPhase P={P} />}
      {f >= P.coaching && f < P.inspector && <CoachingPhase P={P} />}
      {f >= P.inspector && <InspectorPhase P={P} />}
    </AbsoluteFill>
  );
};

type Plan = ReturnType<typeof rcPlan>;

// ---------- A: paywall footage + mono labels ----------
const PaywallPhase: React.FC<{ P: Plan }> = ({ P }) => {
  const f = useCurrentFrame();
  const c = P.pc;
  const keys: CamKey[] = [
    { at: 0, rect: rectOf(c, "sheet") ?? null, pad: 0.04 },
    { at: P.placement - 14, rect: rectOf(c, "plans"), pad: 0.12, move: 26 },
    { at: P.trial - 10, rect: rectOf(c, "timeline"), pad: 0.14, move: 22 },
    { at: P.sandbox - 26, rect: rectOf(c, "cta"), pad: 0.3, move: 18 },
  ];
  const labels = [
    { text: "offering · default", at: P.offering },
    { text: "placement · report_upsell", at: P.placement },
    { text: "trial · 7 days", at: P.trial },
  ];
  return (
    <AbsoluteFill>
      <Camera sw={c.width} sh={c.height} keys={keys} drift={0.0003}>
        <ClipView name="paywall" map={P.pay.map} />
      </Camera>
      <div style={{ position: "absolute", left: 80, bottom: 80, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
        {labels.map((l) => {
          const p = interpolate(f, [l.at - 2, l.at + 10], [0, 1], { ...CLAMP, easing: EASE_OUT });
          if (p <= 0) return null;
          return (
            <div
              key={l.text}
              style={{
                padding: "14px 26px",
                borderRadius: 999,
                background: C.ink,
                color: "#fff",
                ...monoLabel(34),
                transform: `translateX(${(1 - p) * -420}px)`,
                filter: `blur(${(1 - p) * 10}px)`,
                opacity: p,
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- B: Sandbox | Live switch, then the live checkout ----------
export const ModeSwitch: React.FC<{ live: number; scale?: number }> = ({ live, scale = 1 }) => {
  const w = 900 * scale;
  const h = 170 * scale;
  const pad = 12 * scale;
  const thumbW = (w - pad * 2) / 2;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: h / 2, background: C.surface }}>
      <div
        style={{
          position: "absolute",
          top: pad,
          left: pad + live * thumbW,
          width: thumbW,
          height: h - pad * 2,
          borderRadius: h,
          background: live > 0.5 ? C.live : C.ink,
          boxShadow: "0 8px 20px rgba(10,10,10,.18)",
        }}
      />
      {["Sandbox", "Live"].map((l, i) => {
        const on = i === 0 ? live < 0.5 : live >= 0.5;
        return (
          <div
            key={l}
            style={{
              position: "absolute",
              top: 0,
              height: h,
              left: pad + i * thumbW,
              width: thumbW,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16 * scale,
              fontFamily: SANS,
              fontSize: 60 * scale,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: on ? "#fff" : C.g55,
            }}
          >
            {i === 1 && <span style={{ width: 16 * scale, height: 16 * scale, borderRadius: 99, background: on ? "#fff" : C.live }} />}
            {l}
          </div>
        );
      })}
    </div>
  );
};

const LivePhase: React.FC<{ P: Plan }> = ({ P }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = spring({ frame: f - P.live, fps, config: { damping: 16, stiffness: 150 } });
  const split = interpolate(f, [P.stripe - 6, P.stripe + 14], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const c = clip("live");
  const checkout = rectOf(c, "checkout");
  const keys: CamKey[] = [{ at: 0, rect: checkout, pad: 0.1 }];
  const leftW = W - split * (W * 0.5);
  const cap = ramp(f, P.sandbox + 4, P.sandbox + 16);
  return (
    <AbsoluteFill>
      {/* right: live checkout footage */}
      {split > 0 && (
        <div style={{ position: "absolute", left: leftW, top: 0, right: 0, bottom: 0, overflow: "hidden", borderLeft: `2px solid ${C.g08}` }}>
          <div style={{ position: "absolute", left: -W / 4 + (1 - split) * 200, top: 0, width: W, height: 1080 }}>
            <Camera sw={c.width} sh={c.height} keys={keys} drift={0.0004}>
              <ClipView name="live" map={(fr) => (markOf(c, ["checkout_shown", "checkout"]) ?? c.durationFrames - 140) - 8 + (fr - P.stripe)} />
            </Camera>
          </div>
          <div style={{ position: "absolute", left: 60, bottom: 60, padding: "12px 22px", borderRadius: 999, background: C.liveSoft, color: C.live, ...monoLabel(28) }}>
            ● live · $0 due today
          </div>
        </div>
      )}
      {/* left: the switch */}
      <div style={{ position: "absolute", left: 0, top: 0, width: leftW, bottom: 0, background: C.white, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 60 }}>
        <div style={{ transform: `scale(${1 - split * 0.32})` }}>
          <ModeSwitch live={flip} />
        </div>
        <div style={{ display: "flex", gap: 80 * (1 - split * 0.4), fontFamily: SANS, opacity: cap }}>
          <div style={{ ...display(64 - split * 18), color: flip < 0.5 ? C.ink : C.g38 }}>for testing</div>
          <div style={{ ...display(64 - split * 18), color: flip >= 0.5 ? C.ink : C.g38 }}>for real</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- C: Browser → RevenueCat → Server verify → Unlock ----------
const NODES = [
  { label: "Browser", x: 250 },
  { label: "RevenueCat", x: 720 },
  { label: "Server verify", x: 1220 },
];
const ROW = 520;
const edge = (x1: number, x2: number) => `M ${x1} ${ROW} C ${x1 + 70} ${ROW - 60}, ${x2 - 70} ${ROW - 60}, ${x2} ${ROW}`;

const DiagramPhase: React.FC<{ P: Plan }> = ({ P }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = f - P.diagram;
  const edges = [
    { d: edge(NODES[0].x + 150, NODES[1].x - 170), at: P.verifies - 4 },
    { d: edge(NODES[1].x + 170, NODES[2].x - 190), at: P.purchase - 2 },
    { d: edge(NODES[2].x + 190, 1560), at: P.unlock - 14 },
  ];
  const flipP = spring({ frame: f - P.unlock, fps, config: { damping: 14, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ background: C.white }}>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }}>
        {edges.map((e, i) => {
          const p = interpolate(f, [e.at, e.at + 14], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
          const ev = evolvePath(p, e.d);
          const len = getLength(e.d);
          const pulseP = interpolate(f, [e.at + 4, e.at + 22], [0, 1], CLAMP);
          const pt = getPointAtLength(e.d, len * pulseP);
          return (
            <g key={i}>
              <path d={e.d} stroke={C.g12} strokeWidth={3} fill="none" strokeDasharray="2 12" strokeLinecap="round" opacity={ramp(f, P.diagram, P.diagram + 10)} />
              <path d={e.d} stroke={C.ink} strokeWidth={3.5} fill="none" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
              {pt && pulseP > 0 && pulseP < 1 && (
                <>
                  <circle cx={pt.x} cy={pt.y} r={22} fill={C.ink} opacity={0.1} />
                  <circle cx={pt.x} cy={pt.y} r={10} fill={C.ink} />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {NODES.map((n, i) => {
        const inP = spring({ frame: local - i * 5, fps, config: { damping: 20, stiffness: 120 } });
        const lit = i === 0 ? f >= P.verifies - 4 : f >= edges[i - 1].at + 20;
        return (
          <div
            key={n.label}
            style={{
              position: "absolute",
              left: n.x,
              top: ROW,
              transform: `translate(-50%, -50%) scale(${0.85 + inP * 0.15})`,
              opacity: inP,
              padding: "26px 44px",
              borderRadius: 999,
              border: `2.5px solid ${lit ? C.ink : C.g12}`,
              background: lit ? C.ink : C.white,
              color: lit ? "#fff" : C.ink,
              fontFamily: SANS,
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {n.label}
          </div>
        );
      })}

      {/* the sealed coaching card flips to Unlocked */}
      <div style={{ position: "absolute", left: 1560, top: ROW - 210, width: 300, height: 420, perspective: 1400 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `rotateY(${flipP * 180}deg) translateZ(0)`,
            opacity: ramp(f, P.diagram + 10, P.diagram + 24),
          }}
        >
          <SealFace sealed />
          <SealFace sealed={false} />
        </div>
      </div>

      <div style={{ position: "absolute", left: 120, top: 120, ...monoLabel(26), color: C.g55, letterSpacing: "0.12em", opacity: ramp(f, P.diagram, P.diagram + 12) }}>
        EVERY PURCHASE · VERIFIED SERVER-SIDE
      </div>
    </AbsoluteFill>
  );
};

const SealFace: React.FC<{ sealed: boolean }> = ({ sealed }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backfaceVisibility: "hidden",
      transform: sealed ? undefined : "rotateY(180deg)",
      borderRadius: 32,
      background: sealed ? C.ink : C.white,
      border: sealed ? "none" : `2.5px solid ${C.ink}`,
      boxShadow: "0 40px 80px -30px rgba(10,10,10,.35)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 30,
      color: sealed ? "#fff" : C.ink,
      fontFamily: SANS,
    }}
  >
    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={sealed ? "#fff" : C.live} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      {sealed ? <path d="M8 11V8a4 4 0 0 1 8 0v3" /> : <path d="M8 11V8a4 4 0 0 1 7.6-1.8" />}
    </svg>
    <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em", color: sealed ? "#fff" : C.live }}>{sealed ? "Sealed" : "Unlocked"}</div>
    <div style={{ fontFamily: MONO, fontSize: 20, opacity: 0.55 }}>tactical coaching</div>
  </div>
);

// ---------- D: the sealed coaching unblurs (paywall footage tail) ----------
const CoachingPhase: React.FC<{ P: Plan }> = ({ P }) => {
  const f = useCurrentFrame();
  const c = P.pc;
  const local = f - P.coaching;
  const u = markOf(c, ["unlocked"]) ?? 400;
  const keys: CamKey[] = [{ at: 0, rect: rectOf(c, "coaching") ?? null, pad: 0.04, zoom: 1.25 }];
  const p = interpolate(local, [4, 16], [0, 1], { ...CLAMP, easing: EASE_OUT });
  return (
    <AbsoluteFill>
      <Camera sw={c.width} sh={c.height} keys={keys} drift={0.0006}>
        <ClipView name="paywall" map={(fr) => u - 14 + (fr - P.coaching) * 1.2} />
      </Camera>
      <Pill text="✓ coaching · unsealed" p={p} live />
    </AbsoluteFill>
  );
};

// ---------- E: RevenueCat inspector: entitlement → placement → "Server agrees: Pro" ----------
const InspectorPhase: React.FC<{ P: Plan }> = ({ P }) => {
  const f = useCurrentFrame();
  const ic = clip("inspector");
  const local = f - P.inspector;
  const agrees = markOf(ic, ["server_agrees"]) ?? ic.durationFrames - 60;
  const offeringHold = markOf(ic, ["offering_hold"]) ?? agrees - 60;
  const entHold = markOf(ic, ["entitlement_hold"]) ?? offeringHold - 60;
  const seg = Math.round((P.S.dur - P.inspector) / 3);
  const time = clipTime(ic, [
    { at: 0, src: entHold },
    { at: seg, src: offeringHold },
    { at: seg * 2, src: agrees },
  ]);
  // never reach the webhook section (it reads "not on localhost")
  const map = (fr: number) => Math.min(agrees + 40, time.map(fr - P.inspector));
  const keys: CamKey[] = [
    { at: 0, rect: rectOf(ic, "entitlement") ?? null, pad: 0.4, dx: 360, free: true },
    { at: seg - 10, rect: rectOf(ic, "offering") ?? null, pad: 0.4, dx: 360, free: true, move: 22 },
    { at: seg * 2 - 10, rect: rectOf(ic, "server") ?? null, pad: 0.4, dx: 360, free: true, move: 22 },
  ].map((k) => ({ ...k, at: k.at + P.inspector }));
  const labels = [
    { text: "entitlement · scenar_pro", at: 6 },
    { text: "placement · report_upsell", at: seg },
    { text: "Server agrees: Pro", at: seg * 2 + 8, live: true },
  ];
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <Camera sw={ic.width} sh={ic.height} keys={keys} drift={0.0002}>
        <ClipView name="inspector" map={map} />
      </Camera>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 800, background: C.white, borderRight: `1.5px solid ${C.g08}` }} />
      <div style={{ position: "absolute", left: 110, top: 0, bottom: 0, width: 660, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
        <div style={{ ...monoLabel(24), color: C.g38, letterSpacing: "0.16em", marginBottom: 10 }}>REVENUECAT · INSPECTOR</div>
        {labels.map((l) => {
          const p = interpolate(local, [l.at, l.at + 12], [0, 1], { ...CLAMP, easing: EASE_OUT });
          const on = local >= l.at;
          return (
            <div
              key={l.text}
              style={{
                opacity: p * (l.live ? 1 : local >= seg * 2 + 8 ? 0.4 : 1),
                transform: `translateX(${(1 - p) * -60}px)`,
                ...(l.live ? display(92, 400) : monoLabel(40)),
                color: l.live ? C.live : C.ink,
                display: on ? "block" : "none",
              }}
            >
              {l.live ? "✓ " : ""}
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ text: string; p: number; live?: boolean }> = ({ text, p, live }) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      bottom: 80,
      padding: "14px 26px",
      borderRadius: 999,
      background: live ? C.live : C.ink,
      color: "#fff",
      ...monoLabel(34),
      opacity: p,
      transform: `translateX(${(1 - p) * -300}px)`,
    }}
  >
    {text}
  </div>
);
