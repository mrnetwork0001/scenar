# Stock footage licences

All four clips come from one Mixkit shoot (consecutive IDs 49912–49939) with the same actress: a young woman with a short black bob, a cream cardigan and a home-office setting. She plays "Maya".

**Licence:** Mixkit Stock Video Free License, https://mixkit.co/license/#videoFree
Commercial use is allowed, attribution is not required, and the files have no watermark.

**Verification note:** I found every clip by browsing Mixkit's free catalogue (`/free-stock-video/`). The Free-License label was confirmed on a clip page from the same catalogue (51386). Mixkit then rate-limited (HTTP 429) the individual pages for 49929, 49931, 49932 and 49933, so before release, open each source page and confirm it reads "Mixkit Stock Video Free License".

**Creator:** Mixkit (in-house production by Envato). Mixkit does not credit an individual videographer.

**Downloaded rendition:** `https://assets.mixkit.co/videos/<id>/<id>-1080.mp4`, 1920×1080 at 23.976 fps. The original master is also offered at 3840×2160 (4K).

**Processing (all clips):**
- scaled and cropped (cover) to 1920×1080;
- converted to 30 fps;
- encoded H.264 High, yuv420p, CRF 18, faststart;
- audio removed;
- graded with `eq=saturation=0.8:contrast=1.06` plus a small `colorbalance` shift toward cool/neutral (reduces the warm cast).

| Output file | Mixkit ID | Source page | Original resolution | Trim used (source seconds) | Extra treatment |
|---|---|---|---|---|---|
| `maya_laptop_night.mp4` | 49929 | https://mixkit.co/free-stock-video/face-of-a-woman-focused-on-her-work-49929/ | 3840×2160 (4K master; 1080p rendition used) | 0.0 – 6.0 s (6.0 s) | "night" look: `eq=brightness=-0.06:gamma=0.85`, `vignette=PI/4.5` |
| `maya_phone_anxious.mp4` | 49931 | https://mixkit.co/free-stock-video/woman-in-profile-working-on-a-computer-49931/ | 3840×2160 | 0.0 – 4.5 s (4.5 s) | none |
| `maya_confident_call.mp4` | 49932 | https://mixkit.co/free-stock-video/woman-in-homeoffice-having-a-phone-call-49932/ | 3840×2160 | 2.0 – 9.0 s (7.0 s) | none |
| `maya_smile.mp4` | 49933 | https://mixkit.co/free-stock-video/close-up-view-of-a-cheerful-woman-on-a-phone-49933/ | 3840×2160 | 6.0 – 12.43 s (6.43 s, to end of clip) | none |

## Alternates (kept in `video/.cache/stock_alt/`, not shipped)

These use the same licence and processing.

| Alternate file | Mixkit ID | Source page | Trim | Notes |
|---|---|---|---|---|
| `maya_laptop_night_alt_49925.mp4` | 49925 | https://mixkit.co/free-stock-video/professional-woman-working-in-home-office-49925/ | 0.0 – 5.0 s | Same actress; wide shot at a laptop, with the night grade. |
| `maya_confident_call_alt_49934.mp4` | 49934 | https://mixkit.co/free-stock-video/woman-working-in-home-office-answering-the-phone-49934/ | 8.5 – 14.5 s | Same actress; frontal, on the phone and smiling. A laptop lid shows at the bottom edge. Earlier in the source the lid carries a faint Apple logo, but none is visible in this trim. |
| `maya_smile_alt_49920.mp4` | 49920 | https://mixkit.co/free-stock-video/face-of-a-woman-during-a-phone-call-49920/ | 12.0 – 19.0 s | Same actress; close-up, smiling on the phone. |
| `maya_laptop_night_alt_51388.mp4` | 51388 | https://mixkit.co/free-stock-video/woman-with-insomnia-lying-down-using-her-laptop-51388/ | 2.0 – 8.0 s | **Different actress** (short dark hair). This is a genuine night shot, lying in bed at a laptop. Graded with `gamma=1.1`. |

Rejected: 49927 (a large Apple logo on the laptop lid is visible throughout).

## Licence verification (2026-09-30)
- 49929 (maya_laptop_night) and 49931 (maya_phone_anxious): source pages checked by the project owner in a browser. Both say "Download this free stock video clip for commercial or personal use, under the Mixkit Stock Video Free License" (https://mixkit.co/license/#videoFree).
- 49932 and 49933: same free Mixkit series; confirm on the source pages before release.
