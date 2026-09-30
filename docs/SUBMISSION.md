# Devpost submission kit — Next Gen Award

## Checklist
- [ ] Devpost registration done with the **student email** (verified via JetBrains/swot)
- [ ] Repo is **public** on GitHub, `LICENSE` present (MIT)
- [ ] Demo video **under 2:00**, uploaded to YouTube (public or unlisted) or Vimeo
- [ ] Category selected: **Next Gen Award**
- [ ] Submitted before **Sep 30, 2026 11:45pm PDT**

## Tagline
Rehearse the conversations that matter — against AI counterparts with hidden agendas.

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
- `@revenuecat/purchases-js` Web Billing with anonymous app user IDs.
- The `scenar_pro` entitlement gates 3 of the 5 scenarios and the tactical rewrites. The report is already generated, so it unblurs the moment the purchase completes.
- The custom paywall is driven by the offering. It computes "Save X%" and reads the trial length from the product.
- Pricing matches how people prepare: a weekly Prep Pass for a one-off negotiation, and monthly/annual plans with a 7-day trial for managers.
- A live entitlement badge shows the trial days left.

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
| 1:30–1:45 | Blurred Pro rewrites → paywall slides up → toggle annual → Start free trial → success → unblur | "Pro unlocks tactical rewrites and the manager scenarios, powered by RevenueCat Web Billing, from a weekly prep pass to annual." |
| 1:45–1:55 | Pro badge in header, back to landing | "Scenar. Rehearse the conversations that matter." |

Recording tips: use a 1440×900 browser window at 100% zoom and record with the real LLM key set. Clear localStorage first so the trial state is fresh.

## Design notes (for judges)
Look for these: the spring-physics needle on the tension meter and its colour-shifting glow, the staggered card entrances with per-scenario accent glows, the paywall's animated gradient border and the success burst, the blur-to-clear "hidden truth" reveal, and the radar chart drawing in.
