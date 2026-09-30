import React from "react";
import { CalculateMetadataFunction, Composition, Still, staticFile } from "remotion";
import { getVideoMetadata } from "@remotion/media-utils";
import { clip, has, STOCK, stockFile } from "./assets";
import { Film, type FilmProps } from "./Film";
import { Poster } from "./Poster";
import { TOTAL_FRAMES } from "./timing";
import { FPS, H, W } from "./theme";

/** Measure the stock clips that exist so short clips can be slowed / held, never looped. */
const measure = async (): Promise<Record<string, number>> => {
  const meta: Record<string, number> = {};
  const files = [...STOCK.map(stockFile), ...["take2", "reveal", "paywall", "live", "inspector", "builder", "phone", "voice"].map((c) => clip(c).file)];
  await Promise.all(
    files.filter(has).map(async (f) => {
      try {
        const m = await getVideoMetadata(staticFile(f));
        meta[f] = Math.floor(m.durationInSeconds * FPS);
      } catch {
        /* unreadable: fall back to defaults */
      }
    }),
  );
  return meta;
};

const calc: CalculateMetadataFunction<FilmProps> = async ({ props }) => ({
  durationInFrames: TOTAL_FRAMES || 3450,
  props: { ...props, meta: await measure() },
});

const calcStill: CalculateMetadataFunction<FilmProps> = async ({ props }) => ({ props: { ...props, meta: await measure() } });

export const Root: React.FC = () => (
  <>
    <Composition id="Scenar" component={Film} durationInFrames={TOTAL_FRAMES || 3450} fps={FPS} width={W} height={H} defaultProps={{ meta: {} }} calculateMetadata={calc} />
    <Still id="Poster" component={Poster} width={W} height={H} defaultProps={{ meta: {} }} calculateMetadata={calcStill} />
  </>
);
