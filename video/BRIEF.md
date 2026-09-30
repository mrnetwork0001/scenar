# Scenar demo video: production brief ("Maya's One Take")

**Story:**
- **Problem:** a real person, Maya (23, final-year student), fumbles her first salary negotiation (Take 1).
- **Turn:** rewind.
- **Solution:** Scenar. She rehearses the same conversation, and we see what the app does.
- **Payoff:** the real call, where she anchors calmly and gets $83k.

Hard limit: **under 120s** (target about 115s). 1920×1080, 30fps, H.264 + AAC.
The script and voices are in `script.json`, the source of truth for words and scene order.

## Why it must look different
Five sibling projects (Haltr, Judr, Surgr, Nestor, NimSnap) share one template. **Do not use:**
- a logo title card at the start;
- eyebrow plus serif headline with an italic accent;
- fake browser windows with traffic lights and a URL pill;
- Side/Wide layouts with 01/02 step numbers;
- chips and lower-thirds in every scene;
- a "Built with" sponsor row;
- rise-and-fade on everything;
- one repeated wipe;
- textured or grid backgrounds with glow and vignette;
- a quiet ambient bed with tick and chime sounds;
- the narrator voice CwhRBWXzGAHq8TQ4Fs17.

## Scenar's visual language (matches the product: see /Users/mrnetwork/Scenar/docs/DESIGN.md)
- **Pure flat white** `#ffffff`, **ink** `#0a0a0a`, greys `rgba(10,10,10,.55/.38/.12/.08)`, surface `#f4f4f6`. No textures, glows or vignettes.
- The **only colour** is the tension gradient: `#10b981` (Calm) → `#f59e0b` (Tense) → `#ef4444` (Heated), plus a green `#15803d` for "Live".
- **Type:** Inter (weights 300–600) via `@remotion/google-fonts/Inter`. Huge weight-300 display type, tracking -0.04em. Mono labels in JetBrains Mono.
- **Spine motif:** a **giant thin-line tension gauge** (semicircle, ticks, needle) that recurs across the film. It works as a HUD, as the transition, and as the logo reveal.
- **Signature transitions (vary them):**
  - **needle wipe:** the needle sweeps 180° and wipes the frame;
  - **tape rewind:** time-reversed motion plus scan-offset jitter;
  - **redaction wipe:** a black bar retracts to reveal text;
  - **match cut:** a UI element becomes the next scene;
  - a **hard cut on the beat**.
- **No browser chrome.** Real footage is shown **full-bleed, cropped** to the interesting region, with a virtual camera (scale and translate), or with **individual UI regions lifted out as floating cards** with soft shadows and 2.5D parallax. Phone footage may use a minimal rounded phone silhouette (no brand hardware details).

## Asset contracts (all paths relative to `video/`)

### Audio (audio agent)
- `public/audio/vo/<sceneId>_<lineIndex>.mp3`: one clip per script line.
- `public/audio/sfx/<name>.mp3`: heartbeat, heartbeat_fast, rewind, needle_whoosh, stamp, glitch_hit, notify, unlock, typing, cash_click, riser, impact.
- `public/audio/music.mp3`: one rhythmic bed of about 118s. Tense and pulsing for Take 1, a drop at the rewind, confident and rising from Take 2, resolving at the close. Around 100 BPM so cuts can land on beats.
- `src/timing.json`:
```json
{ "fps": 30, "totalFrames": 3450, "bpm": 100,
  "scenes": [ { "id": "take1", "from": 0, "durationInFrames": 420,
     "lines": [ { "voice": "dana", "file": "audio/vo/take1_0.mp3", "startFrame": 12, "durationFrames": 150,
                  "words": [ { "word": "Hi!", "start": 12, "end": 20 } ] } ] } ] }
```
All frame numbers in `timing.json` are **absolute** (from film start). Each scene's `durationInFrames` is at least its planned seconds × 30, stretched only if the voice lines need it, with the total kept **≤ 3540 frames (118s)**.

### Footage (footage agent)
- `public/footage/<clip>.mp4`: H.264, yuv420p, 30fps, no audio.
- `src/footage.json`:
```json
{ "<clip>": { "file": "footage/<clip>.mp4", "width": 3200, "height": 1800, "durationFrames": 600,
   "marks": { "<event>": 123 },
   "rects": { "<name>": { "x": 0, "y": 0, "w": 0, "h": 0 } } } }
```
Rects are in **video pixel** space.

Clips:
- `take2` (desktop): the salary-offer conversation. A strong, data-anchored message is typed at a human pace, the reply arrives, tension drops, and the coach tip and progress update. Rects: meter, chat, coach, progress, composer.
- `reveal` (desktop): the report rising in, the radar chart, clicking "Reveal what they were hiding". Rects: score, radar, truth.
- `paywall` (desktop): report "Unlock with Scenar Pro" → paywall → select Monthly (trial timeline) → Start free trial → RevenueCat Test Store dialog → "Test valid purchase" → coaching unblurs. Rects: plans, timeline, cta, coaching.
- `live` (desktop): flip the header switch to Live → confirm → Live strip → Upgrade → Monthly → Start free trial → RevenueCat checkout showing "$0 due today". **Stop before any card entry.** Rects: switch, strip, checkout.
- `inspector` (desktop): press Shift+I after a Sandbox Pro purchase, showing entitlement, placement and "Server agrees: Pro".
- `builder` (desktop): /custom → quick-start preset → Build → building overlay → the new scenario's briefing.
- `phone` (393×852 viewport at DPR 3): mobile /app → open a scenario → one exchange → Menu sheet with the plan card and the Sandbox/Live switch.
- `voice`: a close crop on the mic dictation state (listening rings) and the speaker toggle.

### Stock footage (stock agent)
- **Source:** free-licence stock only (Pexels, Mixkit, or Pixabay's free content licence): commercial use allowed, no attribution required. Record every clip's source URL and licence in `public/stock/LICENSES.md`.
- **Casting:** one consistent-looking "Maya", a young woman of about 20–25, casual, at home or in a student setting.
- **Files:** `public/stock/<name>.mp4`, 1080p or better, H.264, 30fps, no audio, trimmed to the useful 3–8s:
  - `maya_laptop_night`: at a laptop or desk at night, focused, reading an email;
  - `maya_phone_anxious`: looking at her phone or laptop, anxious or hesitant, hand to face;
  - `maya_confident_call`: on a video or phone call, composed and confident;
  - `maya_smile`: a relieved, happy smile or small celebration.
- **Treatment in the film:** full-bleed, colour-graded toward neutral and slightly desaturated so it sits with the monochrome UI. The tension gauge HUD is overlaid on top.

### Composition (Remotion agent)
- A Remotion 4 project in `video/` (package.json, `remotion.config.ts`, `src/index.ts`, `src/Root.tsx`, `src/Film.tsx`, `src/scenes/*.tsx`, `src/ui/*.tsx`).
- Composition id `Scenar`, 1920×1080, 30fps, duration from `timing.json` (fallback 3450). Also a `Poster` still composition (frame 0 = a settled key frame, not black).
- Read `timing.json` and `footage.json`, and render placeholders when assets are missing so it always previews.
- Scripts in package.json:
  - `studio`;
  - `render`: `remotion render Scenar out/scenar-demo.mp4 --codec h264 --crf 16 --pixel-format yuv420p --audio-codec aac --audio-bitrate 320k`;
  - `poster`.

## Secrets
- The ElevenLabs key lives in `/Users/mrnetwork/Syntura/video/.env` (`ELEVENLABS_API_KEY`). Read it at runtime from that file. **Never** print it, log it, copy it into another file, or commit it.
- `video/.env*`, `video/out/` and `video/node_modules/` are gitignored.
