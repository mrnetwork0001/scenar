# Devpost submission kit - Next Gen Award

## Checklist
- [ ] Devpost registration done with the **student email** (verified via JetBrains/swot)
- [ ] Repo is **public** on GitHub, `LICENSE` present (MIT)
- [ ] Demo video **under 2:00**, uploaded to YouTube (public or unlisted) or Vimeo
- [ ] Category selected: **Next Gen Award**
- [ ] Submitted before **Sep 30, 2026 11:45pm PDT**
- [ ] Devpost account email is the **unicam.it** student address (University of Camerino is on the JetBrains swot list)
- [ ] App icon, 1024×1024: `docs/assets/app-icon-1024.png`
- [ ] Screenshots, 1179×2556 without device frames: `docs/assets/screenshots/` (landing, scenarios, conversation, report, hidden truth, paywall)
- [ ] Category: **Next Gen only**

## Platforms
Scenar is a web app that runs on **iOS, iPadOS, Android and macOS**, and installs to the home screen as an app (PWA). RevenueCat powers its **web purchases** (Test Store in Sandbox, Web Billing with Stripe in Live). Next Gen doesn't require a store release.

## Tagline
Rehearse the conversations that matter - against AI counterparts with hidden agendas.

## Inspiration
Students and first-time managers walk into their hardest conversations cold: a first salary offer, a "no" to their boss, a deadline appeal, feedback to a friend they now manage. We only get one real attempt at each. Scenar gives you as many practice attempts as you want.

## What it does
You pick a scenario and talk it through with an AI counterpart. Each counterpart has a hidden secret, such as a recruiter's real budget ceiling or a deadline that can actually move. A live tension meter reacts to every message. Each message is scored on assertiveness, emotional regulation, clarity and boundary-setting, with a one-line coach tip. At the end, the report reveals what they were hiding and how close you got. Pro users also get line-by-line rewrites of what to say next time, voice mode (speak your replies and hear the counterpart answer), and a custom scenario builder: describe the real conversation you're dreading, and Scenar builds a counterpart with their own hidden agenda. Progress tracking shows your streak, personal bests and how you improved since your last attempt.

## How we built it
- Next.js 16, React 19 and TypeScript, styled with hand-built CSS Modules (no UI kit) in a dark glassmorphism system.
- An OpenAI-compatible LLM on 0G Compute plays the counterpart and acts as a silent evaluator in the same call. It returns structured JSON for the reply, tension, progress, metrics, coach note and win/lose status.
- Scenario secrets stay on the server and are revealed only in the final report.
- An offline heuristic fallback keeps the demo working with no network.

## RevenueCat
- **Real payments, live:** `@revenuecat/purchases-js` with two environments side by side. **Sandbox** uses the RevenueCat Test Store (no card) and **Live** uses RevenueCat Web Billing with Stripe (real charges). Users switch at runtime; each environment keeps its own anonymous app user ID, and Live is always marked with a green badge dot and a "Live payments" strip. A real 7-day-trial subscription was purchased and cancelled on the deployed site through RevenueCat's customer portal.
- **Server-side entitlement enforcement:** Pro API routes verify `scenar_pro` with RevenueCat's REST API. The report's Pro coaching is **AES-256-GCM sealed** for free users and unlocked by `/api/report/unlock` only after RevenueCat confirms the purchase, so it can't be read from the network.
- **Webhooks:** an authenticated `/api/revenuecat/webhook` clears the cached entitlement check and records events in Upstash Redis (deduplicated by event ID), and the in-app inspector shows each user their own event feed.
- **Placements:** every paywall moment (locked scenario, report upsell, voice, builder, manual) requests its own RevenueCat placement, with a fallback to the current offering. Each purchase is tagged with `paywall_reason`, `placement_id`, `offering_id` and `billing_env`.
- **Offering-driven custom paywall:** plans, "Save X%", "Best value" (only when annual actually saves) and the trial timeline all come from the offering at runtime.
- **RevenueCat inspector** (Shift+I): live SDK state (environment, key type, app user ID, entitlement, product, renewal, trial countdown, offering and placement, last purchase), server verification and webhook events.
- **Account & billing page:** plan, trial end or renewal date, "Manage or cancel" via RevenueCat's management URL, and restore-on-another-device via `changeUser`.
- Pricing matches how people prepare: Monthly with a 7-day free trial, Annual (Save 33%) and a one-time Lifetime plan.

## Challenges
Getting the model to stay in character, keep its secret, and score the user honestly, all in one structured response per turn.

## What's next
Accounts that sync across devices, team plans for manager training cohorts, and mobile apps that share the same RevenueCat entitlement.

---

## Demo video script (≈1:50)

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Landing hero, tension meter animating | "Your first salary negotiation. Saying no to your boss. You only get one real shot. Scenar lets you rehearse first." |
| 0:12–0:22 | Scroll the scenario grid, hover the glowing cards | "Five high-stakes scenarios. Every AI counterpart has a hidden agenda." |
| 0:22–0:30 | Open *Negotiate Your First Offer*, briefing card | "Dana offers me $72k. My goal is 80 or more." |
| 0:30–0:55 | Type a weak, apologetic reply. Tension rises, coach tip appears. | "If I hedge, the tension meter spikes and the coach tells me why." |
| 0:55–1:15 | Type a strong anchored ask with market data. Tension drops, progress climbs, status Won. | "When I anchor with data and stay calm, she moves." |
| 1:15–1:30 | Report: radar draw-in, click "Reveal what they were hiding" | "Then the reveal: her ceiling was $84k. Now I know exactly what I left on the table." |
| 1:30–1:42 | Locked Pro coaching → paywall slides up → select Monthly (7-day trial timeline) → Start free trial → RevenueCat Test Store "Test valid purchase" → success → coaching unlocks | "Pro coaching is sealed on the server and unlocks only when RevenueCat verifies the purchase." |
| 1:42–1:52 | Flip the header switch to **Live** (green strip) → RevenueCat checkout "Total due today $0" → press Shift+I: inspector shows entitlement, placement and "Server agrees: Pro" | "Sandbox for testing, Live for real Stripe payments: the same RevenueCat offering, verified end to end." |
| 1:52–1:58 | /account → "Manage or cancel", then back to landing | "Scenar. Rehearse the conversations that matter." |

Show at least one clip on a real iPhone: install via Share → Add to Home Screen, open it full-screen, and play a turn. The rules ask for footage of the app running on the device it was built for.

Recording tips: record on https://www.tryscenar.xyz in a fresh private window (a new anonymous user) at 1440×900 and 100% zoom. Test Store trials last about 5 minutes, so record the purchase and the Pro features in one take. For the Live segment, show the checkout but don't submit a card, or use the clip of your real trial purchase and cancellation.

## Design notes (for judges)
Look for these: the spring-physics needle on the tension meter and its colour-shifting glow, the staggered card entrances with per-scenario accent glows, the paywall's animated gradient border and the success burst, the blur-to-clear "hidden truth" reveal, and the radar chart drawing in.
