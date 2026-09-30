// Sound effects via ElevenLabs /v1/sound-generation. Skips files that already exist.
//   node scripts/sfx.mjs                 all missing
//   ONLY=stamp,impact node scripts/sfx.mjs   force regenerate some
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, post, retry } from "./env.mjs";

const SFX = {
  heartbeat: ["Slow tense human heartbeat, deep low thumps, close and dry, anxious, no music", 4],
  heartbeat_fast: ["Human heartbeat that starts steady and accelerates faster and faster, tense, deep low thumps, dry, no music", 6],
  rewind: ["VHS tape rewind scrub, fast reverse tape whirr with pitch warble, mechanical, analog", 2],
  needle_whoosh: ["Sharp mechanical sweep whoosh, a gauge needle swinging fast, crisp airy swish with a tiny metallic tick at the end", 1.2],
  stamp: ["Heavy rubber stamp thud on paper on a wooden desk, single hit, punchy, dry", 0.8],
  glitch_hit: ["Digital glitch hit, short bitcrushed stutter with a low punch, modern UI", 1],
  notify: ["Soft modern phone notification ping, clean gentle two-tone chime, single", 1],
  unlock: ["Satisfying lock release click followed by a bright soft shimmer sparkle, premium UI unlock", 1.2],
  typing: ["Fast laptop keyboard typing, crisp low-profile keys, continuous, close mic, no voices", 3],
  cash_click: ["Subtle confirm click, soft cash register key press, short, clean, single", 0.6],
  riser: ["Tension riser, rising synth noise swell building to a peak, cinematic, clean, no drums", 3],
  impact: ["Deep cinematic boom impact, sub bass hit with a short clean tail", 2],
};

const dir = join(ROOT, "public/audio/sfx");
mkdirSync(dir, { recursive: true });
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;

for (const [name, [text, dur]] of Object.entries(SFX)) {
  const f = join(dir, `${name}.mp3`);
  if (only ? !only.includes(name) : existsSync(f)) { console.log(`${name}: skip`); continue; }
  try {
    const buf = await retry(async () => {
      const res = await post("/sound-generation?output_format=mp3_44100_128", { text, duration_seconds: dur, prompt_influence: 0.5 });
      return Buffer.from(await res.arrayBuffer());
    });
    writeFileSync(f, buf);
    console.log(`${name}: ${(buf.length / 1024).toFixed(0)}kb`);
  } catch (e) { console.error(`${name}: FAILED ${e.message}`); }
}
