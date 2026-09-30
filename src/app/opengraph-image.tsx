import { ImageResponse } from "next/og";

export const alt = "Scenar — Rehearse the conversations that matter. AI conversation rehearsal.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Gauge line art (Satori renders inline SVG). */
const CX = 600;
const CY = 610;
const R = 470;
const VALUE = 0.68;

function polar(r: number, t: number) {
  const a = Math.PI * (1 - t);
  return [Math.round((CX + r * Math.cos(a)) * 100) / 100, Math.round((CY - r * Math.sin(a)) * 100) / 100] as const;
}

/** Inter Light/Medium from Google Fonts; falls back to the bundled font if offline. */
async function loadInter(weight: 300 | 500): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [light, medium] = await Promise.all([loadInter(300), loadInter(500)]);
  const fonts = [
    light && { name: "Inter", data: light, weight: 300 as const, style: "normal" as const },
    medium && { name: "Inter", data: medium, weight: 500 as const, style: "normal" as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));

  const ticks = Array.from({ length: 61 }, (_, i) => {
    const t = i / 60;
    const major = i % 15 === 0;
    const [x1, y1] = polar(R + 14, t);
    const [x2, y2] = polar(R + (major ? 40 : i % 5 === 0 ? 28 : 20), t);
    return { i, x1, y1, x2, y2, major };
  });
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const [fx, fy] = polar(R, VALUE);
  const fillArc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${fx.toFixed(1)} ${fy.toFixed(1)}`;
  const [nx, ny] = polar(R - 20, VALUE);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#ffffff",
          color: "#0a0a0a",
          fontFamily: fonts.length ? "Inter" : "sans-serif",
        }}
      >
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="t" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d={`M ${CX - 340} ${CY} A 340 340 0 0 1 ${CX + 340} ${CY}`} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
          <path d={`M ${CX - 210} ${CY} A 210 210 0 0 1 ${CX + 210} ${CY}`} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
          {ticks.map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.major ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.16)"}
              strokeWidth="1.2"
            />
          ))}
          <path d={arc} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.2" />
          <path d={fillArc} fill="none" stroke="url(#t)" strokeWidth="4" strokeLinecap="round" />
          <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" />
          <circle cx={nx} cy={ny} r="5" fill="#0a0a0a" />
          <rect x="0" y="330" width="1200" height="300" fill="url(#fade)" />
        </svg>

        <div
          style={{
            position: "absolute",
            left: 64,
            top: 56,
            right: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="40" height="40" viewBox="0 0 32 32">
              <g transform="rotate(-35 16 16)" fill="#0a0a0a">
                <rect x="7.5" y="4" width="7.5" height="24" rx="3.75" />
                <rect x="17" y="9" width="7.5" height="15" rx="3.75" />
              </g>
            </svg>
            <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>Scenar</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 999,
              backgroundColor: "#f4f4f6",
              fontSize: 20,
              fontWeight: 500,
              color: "rgba(10,10,10,0.6)",
            }}
          >
            RevenueCat Shipaton 2026
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 64,
            bottom: 56,
            right: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "rgba(10,10,10,0.55)", marginBottom: 20 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#0a0a0a" }} />
              AI conversation rehearsal
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 78,
                fontWeight: 300,
                lineHeight: 1,
                letterSpacing: "-0.035em",
              }}
            >
              <span>Rehearse the conversations</span>
              <span>that matter.</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
