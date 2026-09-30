// Loudness report (ffmpeg ebur128) for VO clips and music, with a suggested music gain.
//   node scripts/mixcheck.mjs
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
function measure(f) {
  const r = spawnSync("ffmpeg", ["-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const s = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
  const I = parseFloat(s.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const peak = parseFloat(s.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  return { I, peak };
}

const vodir = join(ROOT, "public/audio/vo");
const vo = readdirSync(vodir).filter((f) => f.endsWith(".mp3")).sort().map((f) => ({ f, ...measure(join(vodir, f)) }));
for (const v of vo) console.log(`${v.f.padEnd(18)} ${v.I.toFixed(1).padStart(6)} LUFS  peak ${v.peak.toFixed(1)} dBTP`);
const voAvg = vo.reduce((a, v) => a + v.I, 0) / vo.length;
const m = measure(join(ROOT, "public/audio/music.mp3"));
console.log(`\nVO mean ${voAvg.toFixed(1)} LUFS -> gain to -16: ${(-16 - voAvg).toFixed(1)} dB`);
console.log(`music   ${m.I.toFixed(1)} LUFS (peak ${m.peak.toFixed(1)}) -> for bed at -36 LUFS (20 dB under VO @-16) apply ${(-36 - m.I).toFixed(1)} dB = volume ${Math.pow(10, (-36 - m.I) / 20).toFixed(3)} under VO; between lines ~ -26 LUFS = volume ${Math.pow(10, (-26 - m.I) / 20).toFixed(3)}`);
