// Render many stills from one bundle: node scripts/stills.mjs 10 200 530 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const frames = process.argv.slice(2).map(Number);
const scale = Number(process.env.SCALE ?? 0.5);
const root = path.resolve(import.meta.dirname, "..");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const composition = await selectComposition({ serveUrl, id: "Scenar", inputProps: {} });
for (const frame of frames) {
  const output = path.join(root, `out/stills/f_${frame}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale, overwrite: true });
  console.log(output);
}
