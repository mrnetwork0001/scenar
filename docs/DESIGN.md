# Scenar design system - "Quiet confidence"

Scenar is about composure under pressure, so the interface is calm: black ink on white, light display type, pill-shaped controls, plenty of space. **Colour appears only when it means something.** The tension meter's green → amber → red and good/warn/bad states are the only colours. When the meter turns red, it is the loudest thing on screen.

## Foundations

**Tokens:** everything lives in `src/app/globals.css`.
- Never hard-code a colour except inside the tension gradient.
- Legacy tokens (`--glass`, `--grad-brand`, …) are aliases kept for old code; don't use them in new code.

**Type:** Inter, weights 300, 400, 500 and 600.
- Display headings: weight **300**, `letter-spacing: -0.03em`, `line-height: 1`. Sizes are clamp-based; the hero is `clamp(2.5rem, 5.5vw, 4.5rem)` on desktop.
- Body: 15–16px, weight 400, `--fg`.
- Secondary text: 13px, `--fg-muted` (55% black).
- Micro labels, tags and meta: 11px, weight 500.
- Numbers (scores, tension, counts): weight 300 at display sizes, `font-variant-numeric: tabular-nums`.

**Surfaces:**
- Page: `--bg` (#fff).
- Cards: `--surface` with a `1px solid var(--line)` border, `--radius` of 20px, and `--shadow`. On hover: `--line-bold` border, a 2px lift, `--shadow-lg`.
- Wells, tracks and grey pills: `--surface-muted` (#F4F4F6).
- Inverse elements: `--surface-inverse` (#0a0a0a) with white text. Used for primary buttons, the user's chat bubbles, and active segments.

**Controls:**
- `.btn .btn-primary`: black pill, white 13px/500 text.
- `.btn .btn-ghost`: transparent, `1px solid var(--line-bold)`.
- `.tag`: white pill, `--line-strong` border, 11px.
- `.eyebrow`: 8px black dot plus a 13px muted label.
- Icon buttons: circles, 28px on mobile and 32px on desktop. Black with a white icon when primary; `--surface-muted` when secondary.
- Icons come from the custom Scenar set in `src/components/icons` (24px grid, round stroke, brand motifs: the -35° logo bars for Pro and streak, the gauge arc for tension and targets). Use them at 12–18px with `strokeWidth` 2 (or 2.5–3 for tiny glyphs inside circles).

**Motion:** `motion` (`import { motion } from "motion/react"`).
- Signature easing: `[0.16, 1, 0.3, 1]` (CSS `var(--ease-out)`).
- Entrances slide up 16–20px while fading in, over 0.8–1s, staggered 0.1–0.2s apart.
- Nothing bounces except the tension needle, which uses a spring.
- Respect `prefers-reduced-motion` (`useReducedMotion()` from motion, plus the global CSS rule).

**Layout:**
- Mobile-first, with the breakpoint at 768px. No horizontal overflow at 375px.
- Page gutters: 16px on mobile, 32px on desktop.
- Content max width: 1200px.

## Navigation (fixed, every page)

The fixed top bar has `pointer-events: none` on the bar itself and `auto` on its children. It fades in and slides down on first load.

**Left side:**
1. **Logo:** two rounded rectangles rotated -35°, filled black (`LogoMark`), plus the "Scenar" wordmark (15px/600, hidden below 768px).
2. **Menu pill:** a black pill containing a white circle with an `IconPlus` (size 12, strokeWidth 3), plus the "Menu" label (11px, white). It opens a small white dropdown card with links: Scenarios, Build your own, How it works, Your progress. The Plus rotates 45° while the menu is open.
3. **Tags pill** (desktop only): a `--surface-muted` rounded-full container with two labels: "Negotiation" and "Hard feedback".

**Right side:** the entitlement pill (`ProBadge`). A `--surface-muted` pill containing:
- a black circle with a 4-dot grid icon, or a crown/sparkle icon when Pro;
- a label: "Free · Upgrade", "Pro · Trial · 7d", or "Pro". The label is hidden on mobile.

## Landing hero (full viewport)

- `min-height: 100svh`, white, flex column with `justify-content: space-between`.
- **Background (z-index 0):** in place of a video, a large, slow **monochrome animated visual**:
  - A huge thin-stroke semicircular tension gauge, centred, filling about 80% of the width on mobile and 100% on desktop.
  - Fine tick marks, and a needle that drifts between calm and heated on a slow loop.
  - Faint floating conversation fragments fading in and out around it, such as "I was expecting $86,000." and "That's above our range…". They are 13px, in pill bubbles, at 30–60% opacity.
  - Only the arc segment behind the needle picks up the tension colour. Everything else is black lines at low opacity.
  - It fades in from opacity 0 and scale 1.05 over 1.8s.
- **Footer block (z-index 30), pinned to the bottom** over `linear-gradient(to top, #fff 0%, rgba(255,255,255,.8) 50%, transparent 100%)`:
  - **Left:**
    - Eyebrow: "AI conversation rehearsal · Shipaton 2026".
    - Heading on two lines: "Rehearse the conversations / that matter."
    - Buttons: "Start rehearsing" (primary, scrolls to the scenarios) and "How it works" (ghost).
  - **Right:** tags "Salary negotiation", "Boundaries" and "Hard feedback".
  - Stacks vertically on mobile; a bottom-aligned row on desktop.
- **Timing:**
  - Nav: 0.8s.
  - Visual: 1.8s.
  - Footer wrapper: y 20 → 0 with a 0.5s delay.
  - Eyebrow: 0.6s delay. Heading: 0.8s. Buttons: 1.0s.
  - All use the signature easing.

## Below the hero

The same language continues on the landing page:
- `ProgressPanel`: only shown when there is history.
- "Choose your conversation" scenario grid.
- `BuildYourOwnCard`.
- A "How it works" three-step section.
- The footer.

Each section starts with an `.eyebrow` and a weight-300 display heading.

## Component notes

**Scenario card:**
- A white card containing:
  - a category `.tag`;
  - FREE or a lock with PRO, shown as a black pill;
  - the title at 20px/500;
  - the brief in 13px muted text, clamped to 3 lines;
  - a footer row with an initials avatar (black circle, white initials), the name and role, difficulty dots and minutes.
- The scenario accent colour appears only as a 6px dot beside the category.
- Locked cards shake and open the paywall.

**Play screen:**
- White chat card. Counterpart bubbles are `--surface-muted` with ink text; user bubbles are black with white text.
- Composer: a grey rounded well with a black circular send button.
- **Tension meter:** thin black gauge lines, the value in weight-300 tabular numerals, the needle in black, and the arc fill in the tension colour. It is the only colourful element on the page.
- Metric bars: 4px, with a black fill on a grey track.
- Coach note: a card with an eyebrow reading "Coach".

**Report:**
- Score ring: black stroke on a grey track, with a weight-300 numeral.
- Radar: black 1px grid, black stroke, 6% black fill; the compare overlay is a dashed grey line.
- "The hidden truth" card is **inverse** (black card, white text). It is the dramatic moment, and the reveal unblurs it.
- The Pro section is blurred behind a white overlay card with a black CTA.

**Paywall:**
- White sheet with `--shadow-lg`, over a backdrop of `rgba(10,10,10,0.35)` with an 8px blur.
- Headline in weight 300; benefits rows with 32px grey-circle icons.
- Plan picker: a grey segmented control, with the active plan as a black pill in white text. The "Best value" badge is a small black tag, and "Save 58%" is in `--good`.
- Trial timeline: a 1px black line with dots.
- Success state: a black check that draws in, plus a subtle monochrome confetti of black and grey squares.

**Pills that show status** (demo billing, sandbox, offline AI, outcome won/lost): use `--good`, `--warn` or `--bad` text on the matching `*-soft` background. Everything else is monochrome.
