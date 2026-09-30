import React from "react";
import { interpolate } from "remotion";
import { Gauge } from "./ui/Gauge";
import { C, CLAMP, EASE_OUT, MONO, SANS, tensionColor, tensionLabel } from "./theme";

/**
 * Placeholder product screens, drawn at the footage's native pixel size (DPR 2) with
 * the same rect geometry as assets.DEFAULT_CLIPS. They only exist so the film
 * previews before the footage agent delivers; real clips replace them automatically.
 */
type MockProps = { t: number; w: number; h: number };

const card = (x: number, y: number, w: number, h: number, extra?: React.CSSProperties): React.CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  width: w,
  height: h,
  background: C.white,
  border: `2px solid ${C.g08}`,
  borderRadius: 40,
  boxShadow: "0 8px 40px rgba(10,10,10,.06)",
  boxSizing: "border-box",
  overflow: "hidden",
  ...extra,
});
const txt = (size: number, weight = 400, color: string = C.ink): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: "-0.01em",
  lineHeight: 1.35,
});
const bubble = (me: boolean): React.CSSProperties => ({
  maxWidth: 1180,
  padding: "34px 44px",
  borderRadius: 44,
  background: me ? C.ink : C.surface,
  alignSelf: me ? "flex-end" : "flex-start",
  ...txt(40),
  color: me ? "#fff" : C.ink,
});
const typed = (s: string, t: number, a: number, b: number) => s.slice(0, Math.round(interpolate(t, [a, b], [0, s.length], CLAMP)));
const Logo: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 64 }) => (
  <svg style={{ position: "absolute", left: x, top: y }} width={s} height={s} viewBox="0 0 32 32">
    <g transform="rotate(-35 16 16)" fill={C.ink}>
      <rect x="7.5" y="4" width="7.5" height="24" rx="3.75" />
      <rect x="17" y="9" width="7.5" height="15" rx="3.75" />
    </g>
  </svg>
);

const MSG = "Market data for this role is $82k to $88k, so I'd be comfortable at $86,000. Is there flexibility?";

const Take2: React.FC<MockProps> = ({ t, w, h }) => {
  const send = 150;
  const reply = 300;
  const tension = interpolate(t, [0, 60, 330, 380], [70, 78, 78, 24], CLAMP);
  const prog = interpolate(t, [330, 380], [45, 72], { ...CLAMP, easing: EASE_OUT });
  const rep = interpolate(t, [reply, reply + 14], [0, 1], CLAMP);
  return (
    <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
      <Logo x={160} y={70} />
      <div style={card(160, 200, 900, 620)}>
        <div style={{ position: "absolute", left: 90, top: 60 }}>
          <Gauge value={tension} width={720} weight={2.2} labels={false} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center", ...txt(120, 300), letterSpacing: "-0.04em" }}>
          {Math.round(tension)}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", ...txt(32, 500, tensionColor(tension)) }}>
          ● {tensionLabel(tension)}
        </div>
      </div>
      <div style={card(160, 860, 900, 300, { padding: 60 })}>
        <div style={{ display: "flex", justifyContent: "space-between", ...txt(36, 400, C.g55) }}>
          <span>Progress to goal</span>
          <span style={{ color: C.ink }}>{Math.round(prog)}%</span>
        </div>
        <div style={{ marginTop: 40, height: 12, borderRadius: 6, background: C.surface }}>
          <div style={{ width: `${prog}%`, height: 12, borderRadius: 6, background: C.ink }} />
        </div>
      </div>
      <div style={card(160, 1200, 900, 440, { padding: 60 })}>
        <div style={{ ...txt(30, 500, C.g55), marginBottom: 24 }}>● Coach</div>
        <div style={txt(38, 400)}>
          {t > 330 ? "Strong anchor. You gave a range and a reason - now stay quiet and let Dana respond." : "Anchor with a specific number and a reason. Don't apologise for asking."}
        </div>
      </div>
      <div style={card(1140, 200, 1900, 1440)}>
        <div style={{ display: "flex", alignItems: "center", gap: 30, padding: "44px 60px", borderBottom: `2px solid ${C.g08}` }}>
          <div style={{ width: 100, height: 100, borderRadius: 50, background: C.ink, color: "#fff", display: "grid", placeItems: "center", ...txt(36, 500, "#fff") }}>DW</div>
          <div>
            <div style={txt(44, 500)}>Dana Whitfield</div>
            <div style={txt(32, 400, C.g55)}>Senior Recruiter, Northwind Labs</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 34, padding: 60 }}>
          <div style={bubble(false)}>Honestly, $72k is already quite competitive for a junior analyst here. Can you share what you're thinking?</div>
          {t >= send && <div style={bubble(true)}>{MSG}</div>}
          {t >= reply && (
            <div style={{ ...bubble(false), opacity: rep, transform: `translateY(${(1 - rep) * 30}px)` }}>
              I appreciate you bringing specific data. Let me see what I can do.
            </div>
          )}
        </div>
      </div>
      <div style={card(1140, 1420, 1900, 220, { borderRadius: 110, background: C.white, display: "flex", alignItems: "center", padding: "0 70px" })}>
        <div style={txt(40, 400, t < send && t > 20 ? C.ink : C.g38)}>{t < send && t > 20 ? typed(MSG, t, 30, 140) : "Reply to Dana..."}</div>
      </div>
    </div>
  );
};

const Reveal: React.FC<MockProps> = ({ t, w, h }) => {
  const click = 190;
  const blur = interpolate(t, [click, click + 20], [22, 0], CLAMP);
  const radar = [0.78, 0.84, 0.8, 0.72, 0.86];
  const pts = radar
    .map((v, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / radar.length;
      return `${750 + Math.cos(a) * 280 * v},${350 + Math.sin(a) * 280 * v}`;
    })
    .join(" ");
  return (
    <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
      <div style={card(240, 220, 1100, 700)}>
        <svg width="1100" height="700">
          <circle cx="550" cy="330" r="200" stroke={C.surface} strokeWidth="20" fill="none" />
          <circle cx="550" cy="330" r="200" stroke={C.ink} strokeWidth="20" fill="none" strokeDasharray={`${2 * Math.PI * 200 * 0.82} 9999`} transform="rotate(-90 550 330)" strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", ...txt(150, 300), letterSpacing: "-0.04em" }}>82</div>
      </div>
      <div style={card(1460, 220, 1500, 700)}>
        <svg width="1500" height="700">
          {[1, 0.66, 0.33].map((k) => (
            <polygon key={k} fill="none" stroke={C.g12} strokeWidth="2" points={radar.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `${750 + Math.cos(a) * 280 * k},${350 + Math.sin(a) * 280 * k}`; }).join(" ")} />
          ))}
          <polygon points={pts} fill="rgba(10,10,10,.06)" stroke={C.ink} strokeWidth="4" />
        </svg>
      </div>
      <div style={card(240, 1000, 2720, 640, { background: C.ink, border: "none", padding: 80 })}>
        <div style={{ ...txt(44, 500, "#fff"), marginBottom: 40 }}>The hidden truth</div>
        <div style={{ ...txt(60, 400, "#fff"), filter: `blur(${blur}px)` }}>
          Dana can go up to $84,000 base plus a $5,000 signing bonus, but will not cross that ceiling.
        </div>
        {t < click && (
          <div style={{ position: "absolute", right: 80, top: 70, padding: "24px 44px", borderRadius: 60, background: "#fff", ...txt(34, 500) }}>Reveal what they were hiding</div>
        )}
      </div>
    </div>
  );
};

const Paywall: React.FC<MockProps> = ({ t, w, h }) => {
  const sel = t > 120;
  const bought = t > 480;
  return (
    <div style={{ width: w, height: h, background: "rgba(10,10,10,.35)", position: "relative" }}>
      <div style={card(800, 80, 1600, 1720, { borderRadius: 60, padding: 100, boxShadow: "0 40px 120px rgba(0,0,0,.2)" })}>
        <div style={txt(34, 400, C.g55)}>● Scenar Pro</div>
        <div style={{ ...txt(110, 300), letterSpacing: "-0.04em", lineHeight: 1.05, marginTop: 40 }}>See exactly what to say next time</div>
      </div>
      <div style={{ position: "absolute", left: 900, top: 760, width: 1400, height: 330, borderRadius: 50, background: C.surface, display: "flex", gap: 20, padding: 16, boxSizing: "border-box" }}>
        {["Monthly|$9.99/month|7-day trial", "Annual|$79.99/year|Save 33%", "Lifetime|$99.99|"].map((p, i) => {
          const [a, b, c] = p.split("|");
          const on = sel ? i === 0 : i === 1;
          return (
            <div key={a} style={{ flex: 1, borderRadius: 40, background: on ? C.ink : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={txt(36, 500, on ? "#fff" : C.g55)}>{a}</div>
              <div style={txt(64, 300, on ? "#fff" : C.ink)}>{b}</div>
              <div style={txt(30, 500, on ? "#fff" : C.live)}>{c}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 900, top: 1110, width: 1400, height: 230 }}>
        <div style={{ position: "absolute", left: 20, right: 460, top: 40, height: 3, background: C.ink }} />
        <div style={{ position: "absolute", left: 6, top: 26, width: 30, height: 30, borderRadius: 15, background: C.ink }} />
        <div style={{ position: "absolute", left: 924, top: 26, width: 30, height: 30, borderRadius: 15, border: `3px solid ${C.ink}`, background: "#fff", boxSizing: "border-box" }} />
        <div style={{ position: "absolute", left: 0, top: 90, ...txt(40, 500) }}>Today<div style={txt(34, 400, C.g55)}>Full Pro access · $0.00</div></div>
        <div style={{ position: "absolute", left: 920, top: 90, ...txt(40, 500) }}>Day 7<div style={txt(34, 400, C.g55)}>$9.99/month begins</div></div>
      </div>
      <div style={{ position: "absolute", left: 900, top: 1400, width: 1400, height: 160, borderRadius: 80, background: C.ink, display: "grid", placeItems: "center", ...txt(44, 500, "#fff") }}>
        {bought ? "✓ You're Pro" : "Start free trial →"}
      </div>
    </div>
  );
};

const Live: React.FC<MockProps> = ({ t, w, h }) => {
  const on = t > 60;
  return (
    <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
      <Logo x={160} y={100} />
      <div style={{ position: "absolute", left: 2500, top: 80, width: 560, height: 120, borderRadius: 60, background: C.surface, display: "flex", padding: 10, boxSizing: "border-box" }}>
        {["Sandbox", "Live"].map((l, i) => (
          <div key={l} style={{ flex: 1, borderRadius: 50, display: "grid", placeItems: "center", background: (i === 1) === on ? (i === 1 ? C.live : C.ink) : "transparent", ...txt(38, 500, (i === 1) === on ? "#fff" : C.g55) }}>{l}</div>
        ))}
      </div>
      {on && <div style={{ position: "absolute", left: 0, top: 240, width: w, height: 100, background: C.liveSoft, display: "grid", placeItems: "center", ...txt(36, 500, C.live) }}>● Live payments · real charges</div>}
      <div style={card(1000, 460, 1200, 900, { padding: 90 })}>
        <div style={txt(40, 400, C.g55)}>Scenar Pro · Monthly</div>
        <div style={{ ...txt(150, 300), letterSpacing: "-0.04em", marginTop: 40 }}>$0.00</div>
        <div style={txt(46, 500)}>due today</div>
        <div style={{ ...txt(36, 400, C.g55), marginTop: 60 }}>Then $9.99/month after your 7-day trial.</div>
        <div style={{ marginTop: 80, height: 130, borderRadius: 26, border: `2px solid ${C.g12}` }} />
      </div>
    </div>
  );
};

const Inspector: React.FC<MockProps> = ({ w, h }) => (
  <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
    <div style={card(1800, 300, 1300, 1200, { padding: 80 })}>
      <div style={{ ...txt(34, 500, C.g55), fontFamily: MONO }}>entitlement inspector</div>
      {[
        ["entitlement", "scenar_pro"],
        ["placement", "report_upsell"],
        ["offering", "default"],
        ["environment", "sandbox"],
      ].map(([k, v], i) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", marginTop: i ? 40 : 70, fontFamily: MONO, fontSize: 40, color: C.ink }}>
          <span style={{ color: C.g55 }}>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 1900, top: 1180, width: 1100, height: 200, borderRadius: 40, background: C.liveSoft, display: "grid", placeItems: "center", ...txt(56, 500, C.live) }}>✓ Server agrees: Pro</div>
  </div>
);

const SITUATION = "My landlord wants to raise rent 18% and I want to push back politely.";
const Builder: React.FC<MockProps> = ({ t, w, h }) => {
  const building = t > 150 && t < 230;
  const done = t >= 230;
  return (
    <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
      {!done && (
        <div style={card(700, 500, 1800, 500, { padding: 80 })}>
          <div style={txt(34, 500, C.g55)}>Describe your situation</div>
          <div style={{ ...txt(64, 300), marginTop: 40, letterSpacing: "-0.02em" }}>{typed(SITUATION, t, 10, 130)}</div>
        </div>
      )}
      {building && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center", ...txt(80, 300) }}>Building your counterpart…</div>
      )}
      {done && (
        <div style={card(700, 300, 1800, 1200, { padding: 100 })}>
          <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
            <div style={{ width: 160, height: 160, borderRadius: 80, background: C.ink, display: "grid", placeItems: "center", ...txt(56, 500, "#fff") }}>RK</div>
            <div>
              <div style={txt(70, 500)}>Rob Keller</div>
              <div style={txt(44, 400, C.g55)}>Your landlord</div>
            </div>
          </div>
          <div style={{ ...txt(50, 400), marginTop: 80 }}>Rob wants the renewal signed this week. He's hiding something - find out what.</div>
        </div>
      )}
    </div>
  );
};

const Phone: React.FC<MockProps> = ({ t, w, h }) => {
  const v = interpolate(t, [60, 140], [62, 30], CLAMP);
  return (
    <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
      <Logo x={70} y={110} s={90} />
      <div style={card(50, 280, w - 100, 700, { borderRadius: 60 })}>
        <div style={{ position: "absolute", left: 100, top: 90 }}>
          <Gauge value={v} width={w - 300} weight={2.4} labels={false} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 520, textAlign: "center", ...txt(130, 300) }}>{Math.round(v)}</div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1060, display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ ...bubble(false), fontSize: 50 }}>Hey, got a sec? Big favour - you can make that work, right?</div>
        {t > 90 && <div style={{ ...bubble(true), fontSize: 50 }}>I can't take the weekend, but I can hand it to Priya.</div>}
      </div>
    </div>
  );
};

const Voice: React.FC<MockProps> = ({ t, w, h }) => (
  <div style={{ width: w, height: h, background: C.white, position: "relative" }}>
    {[0, 1, 2].map((i) => {
      const p = ((t + i * 20) % 60) / 60;
      return (
        <div key={i} style={{ position: "absolute", left: w / 2 - 90 - p * 220, top: h / 2 - 90 - p * 220, width: 180 + p * 440, height: 180 + p * 440, borderRadius: "50%", border: `3px solid ${C.ink}`, opacity: (1 - p) * 0.5 }} />
      );
    })}
    <div style={{ position: "absolute", left: w / 2 - 90, top: h / 2 - 90, width: 180, height: 180, borderRadius: 90, background: C.ink, display: "grid", placeItems: "center" }}>
      <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: h / 2 + 260, textAlign: "center", ...txt(44, 400, C.g55) }}>Listening…</div>
  </div>
);

export const MOCKS: Record<string, React.FC<MockProps>> = {
  take2: Take2,
  reveal: Reveal,
  paywall: Paywall,
  live: Live,
  inspector: Inspector,
  builder: Builder,
  phone: Phone,
  voice: Voice,
};
