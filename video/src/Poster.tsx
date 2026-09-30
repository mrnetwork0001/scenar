import React from "react";
import { AbsoluteFill } from "remotion";
import { MetaCtx, Stock } from "./media";
import { ProblemHud } from "./scenes/Problem";
import { display, SANS } from "./theme";
import { Mark } from "./ui/Mark";

/** Headline + (optional) mark laid over the opening of Take 1. */
export const PosterOverlay: React.FC<{ withMark?: boolean }> = ({ withMark = true }) => (
  <AbsoluteFill>
    {!withMark && (
      // film thumbnail: same shot as Take 1's first frame, plus the line
      <AbsoluteFill>
        <Stock name="maya_laptop_night" window={286} shade={0.2} />
        <ProblemHud value={16} />
      </AbsoluteFill>
    )}
    <div style={{ position: "absolute", left: 110, top: 150, color: "#fff" }}>
      <div style={{ ...display(190), letterSpacing: "-0.055em", lineHeight: 0.96 }}>
        Rehearse
        <br />
        it first.
      </div>
    </div>
    {withMark && (
      <div style={{ position: "absolute", left: 110, bottom: 96, display: "flex", alignItems: "center", gap: 18, color: "#fff" }}>
        <Mark size={70} color="#fff" />
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 52, letterSpacing: "-0.04em" }}>Scenar</span>
      </div>
    )}
  </AbsoluteFill>
);

/** Key art still: Maya, the giant gauge running hot, the line. */
export const Poster: React.FC<{ meta: Record<string, number> }> = ({ meta }) => (
  <MetaCtx.Provider value={meta ?? {}}>
    <AbsoluteFill style={{ background: "#000" }}>
      <Stock name="maya_phone_anxious" window={1} freezeAt={45} startFrom={0} shade={0.42} zoom={[1.08, 1.08]} />
      <ProblemHud value={82} pulse={0.6} />
      <PosterOverlay withMark />
    </AbsoluteFill>
  </MetaCtx.Provider>
);
