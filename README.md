# Scenar

**Rehearse the conversations that matter, before the stakes are real.**

Scenar is an AI conversation simulator for students and new professionals. Practise the conversations people dread (negotiating your first salary, saying no to your manager, asking a strict professor for an extension, giving hard feedback to a former peer) against an AI counterpart with a **hidden agenda**. A live tension meter reacts to every line. At the end you get a scored report and the truth they were hiding.

- **Live app:** https://www.tryscenar.xyz
- **Demo video (under 2 min):** https://www.youtube.com/watch?v=AiIgc4P5wDU
- **Launch post on X:** https://x.com/encrypt_wizard/status/2105331373917573621
- **Built for:** RevenueCat Shipaton 2026, Next Gen Award
- **Stack:** Next.js 16, React 19, TypeScript, RevenueCat (Test Store + Web Billing with Stripe), 0G AI router
- **Platforms:** iOS, iPadOS, Android and macOS (and any modern browser). Installable as an app: on iPhone use **Share → Add to Home Screen**, on Android use **Install app**. It opens full-screen straight into `/app`.

---

## Contents
- [The problem](#the-problem)
- [The idea: every counterpart hides something](#the-idea-every-counterpart-hides-something)
- [How it works](#how-it-works)
- [Features](#features)
- [RevenueCat integration](#revenuecat-integration)
- [Architecture](#architecture)
- [Security and privacy](#security-and-privacy)
- [Run it locally](#run-it-locally)
- [Environment variables](#environment-variables)
- [Deploy](#deploy)
- [Testing the payment flows](#testing-the-payment-flows)
- [Project structure](#project-structure)
- [Docs](#docs)
- [License](#license)

---

## The problem
The conversations that shape a career get no rehearsal. You get one real attempt at a salary negotiation or a hard 1:1. Advice articles don't talk back, friends go easy on you, and nerves make people hedge, over-apologise, accept the first offer, or say yes when they mean no.

## The idea: every counterpart hides something
Scenar isn't "ask a chatbot to roleplay". Each counterpart has a **persona**, a **concrete secret** you can uncover, and an explicit **win condition**, so you can actually win or lose.

| Scenario | Tier | The secret you have to uncover |
|---|---|---|
| Negotiate Your First Offer | Free | The recruiter's approved ceiling is $84k plus a $5k signing bonus |
| Say No to Your Manager | Free | The "urgent" Monday demo can actually slip to Wednesday |
| Appeal to a Strict Professor | Pro | University rules allow up to 5 days for documented emergencies |
| Give Hard Feedback to a Former Peer | Pro | Your report is quietly caring for a sick parent |
| Push Back on an Unfair Review | Pro | The rating came from one unverified escalation |

At the end the report reveals the secret: *"Dana's ceiling was $84,000. You landed $83,000 plus the $5,000 bonus."*

## How it works
1. **Pick a scenario.** Five built-in counterparts, or build your own (Pro).
2. **Talk it through.** Every turn returns the counterpart's in-character reply plus:
   - a **tension** score from 0 to 100 (Calm / Guarded / Tense / Heated);
   - **progress to goal**;
   - four skill scores: **Assertiveness, Emotional Regulation, Clarity, Boundary Setting**;
   - a one-line **coach tip**.
3. **Get the report.**
   - Free: overall score, verdict, a radar chart of the four skills, and the hidden truth.
   - Pro adds tactical coaching: what worked, what to improve, and a line-by-line rewrite of your weakest moment.

## Features

### Practice
- **Live tension meter:** a spring-animated gauge. It's the only colourful element on screen.
- **Live scoring and coach tips** on every message.
- **Report** with a count-up score ring, a radar chart, a black "hidden truth" card that unblurs on reveal, and Pro coaching.
- **Progress tracking** (free): session history, a radar comparison against your last attempt, a "+12 vs last time" delta, personal bests, streaks, and a "focus next" skill. Stored locally in your browser.

### Pro
- **All five scenarios.**
- **Tactical rewrites:** what worked, what to fix, and the exact line that would have changed the outcome.
- **Voice mode:** dictate replies and hear the counterpart answer in a consistent voice, using the browser's Web Speech API.
- **Custom scenario builder:** describe the conversation you're dreading. The AI builds a counterpart with their own hidden agenda, and the scenario is sealed with AES-256-GCM so the browser can't read the secret.

### Product and design
- **Marketing site at `/`:**
  - hero with an animated gauge;
  - problem, insight and live demo sections;
  - skills, a scenario marquee, a Pro features bento and pricing;
  - privacy and tech, FAQ, a closing call to action and the footer.

  Each section has its own animation. The app itself lives at **`/app`**, behind **Launch app**.
- **Monochrome design system:** black on white, Inter 300-600, pill controls, a single signature easing curve, and colour only where it carries meaning. See [docs/DESIGN.md](docs/DESIGN.md).
- **Custom icon set:** 50+ hand-drawn icons in one stroke style, using the logo and gauge geometry (`src/components/icons`).
- **Installable app (PWA):** a web app manifest, home-screen icons (including a maskable one) and iOS full-screen mode. See `src/app/manifest.ts`.
- **Mobile control centre:** below 768px the Menu pill opens a full-screen sheet with the plan card, the Sandbox/Live switch and navigation.
- **Accessible:**
  - dialogs trap focus;
  - the meter uses `role="meter"`;
  - keyboard shortcuts are available;
  - reduced motion is respected and hydration-safe;
  - there is no horizontal overflow at 320px.

## RevenueCat integration
RevenueCat powers every purchase, entitlement and paywall decision in Scenar.

### Two environments, side by side
| Environment | RevenueCat key | Payments |
|---|---|---|
| **Sandbox** (default) | Test Store (`test_...`) | Test purchases through RevenueCat's dialog. No card, no charge. |
| **Live** | Web Billing production (`rcb_...`) | Real payments through Stripe |

- **Switching:** users switch with the **Sandbox | Live** control in the header, the mobile menu, the pricing section, `/account` or the inspector. Switching to Live asks for confirmation.
- **Separate identities:** each environment keeps its own anonymous app user ID, so a sandbox purchase never unlocks Live.
- **Always visible when live:** Live mode shows a green dot on the badge and a persistent "Live payments" strip.
- **Verified end to end:** a real 7-day-trial subscription was purchased and cancelled on the deployed site.

### Entitlement and offering
- **One entitlement, `scenar_pro`,** gates four value moments: Pro scenarios, tactical coaching, voice mode and the custom builder.
- **Offering-driven paywall:** plans, prices, trial length, the "Save X%" chip and "Best value" (shown only when annual actually saves) all come from the current offering at runtime. There are no hard-coded prices.

| Plan | Price | Trial |
|---|---|---|
| Monthly | $9.99 / month | 7 days |
| Annual | $79.99 / year (Save 33%) | none |
| Lifetime | $99.99 once | none |

### Placements and attribution
Each paywall moment requests its own **RevenueCat placement** and falls back to the current offering. Offerings can be changed per moment from the dashboard, without a deploy.

| Moment | Placement |
|---|---|
| Clicking a locked Pro scenario | `locked_scenario` |
| "Unlock with Scenar Pro" on the report | `report_upsell` |
| Tapping the mic or speaker as a free user | `voice_mode` |
| "Build my scenario" as a free user | `custom_builder` |
| Header badge, menu or pricing | `manual_upgrade` |

- **Attribution:** every purchase is tagged with `paywall_reason`, `placement_id`, `offering_id` and `billing_env`.
- **Impressions:** `trackCustomPaywallImpression` runs on every paywall open.

### Server-side verification (Pro is enforced, not just hidden)
- **`verifyPro(req)`** in `src/lib/entitlementServer.ts`:
  - reads the RevenueCat identity headers (`x-scenar-user`, `x-scenar-env`);
  - asks RevenueCat's REST API (`GET /v1/subscribers/{id}`) with `REVENUECAT_SECRET_API_KEY` or that environment's public key;
  - honours expiry dates and grace periods;
  - caches results (60s for Pro, 10s otherwise) and coalesces concurrent lookups;
  - times out after 5s and fails closed.
- **Gated routes:** `/api/custom`, plus `/api/turn` and `/api/report` for Pro scenarios, return `403 { code: "pro_required" }`, and the client opens the right paywall.
- **Sealed Pro content:** free users get the report's coaching section **AES-256-GCM sealed** (with a 24h expiry and a purpose-bound key). `POST /api/report/unlock` re-verifies with RevenueCat and then reveals it, so the report unlocks in place right after purchase. The coaching can't be read from the network before that.

### Webhooks
- **Receiver:** `POST /api/revenuecat/webhook` checks the shared `Authorization` secret with a constant-time compare, and accepts it with or without `Bearer`.
- **Cache clearing:** every event clears the cached entitlement check for every user ID it concerns.
- **Storage:** events go to **Upstash Redis** when configured, as a per-user list with a 30-day TTL, deduplicated by event ID. Otherwise they're kept in memory.
- **Feed:** `GET /api/revenuecat/events?user=<id>` returns only that user's events.

### Inspector and account
- **RevenueCat inspector:** open it with **Shift+I**, from the menu, or with the RC chip. It shows live SDK state (environment, key type, app user ID, entitlement, product, renewal, trial countdown, offering and placement, last purchase), server verification ("Server agrees: Pro") and webhook events.
- **`/account`:** plan, trial end or renewal date, **Manage or cancel** via RevenueCat's customer portal, and **restore access on another device** via `changeUser`. No sign-up needed.
- **Legal pages** required for live payments: [`/terms`](https://www.tryscenar.xyz/terms), [`/privacy`](https://www.tryscenar.xyz/privacy) and [`/refunds`](https://www.tryscenar.xyz/refunds), linked from the paywall, footer and account page.

## Architecture

```
Browser (Next.js client)                         Server (Next.js route handlers)
------------------------                         -------------------------------
Landing / app / play / report UI                 /api/turn      -> LLM (0G router, GPT-4.1)
EntitlementProvider                              /api/report    -> LLM (Claude Sonnet 5)
  @revenuecat/purchases-js                                         + Pro section sealed unless verified
  Sandbox: Test Store key                        /api/report/unlock -> verifyPro -> unseal
  Live: Web Billing key (Stripe)                 /api/custom    -> verifyPro -> LLM -> sealed scenario
  placements, metadata, snapshot                 /api/entitlement -> verifyPro (inspector)
identityHeaders() --------x-scenar-user/env----> verifyPro -> RevenueCat REST API
                                                 /api/revenuecat/webhook <- RevenueCat events
BillingInspector, /account                       /api/revenuecat/events  -> Upstash Redis
```

- **Secrets stay on the server:** personas and secrets live in `src/lib/scenarios.ts`. Server components pass only public fields (`toPublic()`), and custom scenarios travel as sealed tokens.
- **AI calls:** `src/lib/llm.ts` speaks both the OpenAI Chat Completions and Anthropic Messages formats (`claude-*` models switch automatically). A single call plays the counterpart **and** silently scores the user's message.
- **Offline fallback:** `src/lib/mock.ts` keeps the app working with no LLM key or when the provider fails.

## Security and privacy
- **Scenario secrets:** never sent to the browser before the report.
- **Pro:** enforced server-side, with sealed coaching and gated routes.
- **Rate limits:** per IP in production (per 10 minutes: turn 40, report 10, custom 6, unlock 30).
- **Keys:** only public RevenueCat keys reach the client, and keys are never logged.
- **No account needed:** access is tied to an anonymous RevenueCat ID, and practice history stays in your browser.
- **AI output:** normalised (for example, no em dashes) before it reaches the UI.

## Run it locally
```bash
npm install
cp .env.example .env.local   # fill in the keys you have (all optional)
npm run dev                  # http://localhost:3000
```
- **No `LLM_API_KEY`:** an offline heuristic counterpart runs.
- **No RevenueCat key:** the paywall runs in a clearly labelled demo-billing mode.

Quality checks:
```bash
npx tsc --noEmit
npx eslint src
npm run build
```

## Environment variables
| Name | Required | Purpose |
|---|---|---|
| `LLM_BASE_URL` | no | OpenAI-compatible endpoint, e.g. `https://router-api.0g.ai/v1` |
| `LLM_API_KEY` | no | LLM key (server-only); without it the offline engine runs |
| `LLM_MODEL` | no | Live turns, e.g. `gpt-4.1` |
| `LLM_REPORT_MODEL` | no | Reports, e.g. `claude-sonnet-5` |
| `NEXT_PUBLIC_REVENUECAT_API_KEY` | no | Sandbox key (`test_...` or `rcb_sb_...`) |
| `NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY` | no | Live Web Billing key (`rcb_...`); enables the Live switch |
| `REVENUECAT_SECRET_API_KEY` | no | Optional secret key for server-side verification |
| `REVENUECAT_WEBHOOK_AUTH` | for webhooks | Shared secret for the webhook `Authorization` header |
| `SCENAR_SEAL_SECRET` | recommended | Key material for sealed scenarios and Pro sections |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_URL` / `_TOKEN`) | no | Persistent webhook event log |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL for Open Graph and the sitemap |

`NEXT_PUBLIC_*` values are inlined at build time, so restart or redeploy after changing them.

## Deploy
Deployed on Vercel as project `tryscenar`. See [docs/DEPLOY.md](docs/DEPLOY.md) for the full checklist, which covers the env vars, the webhook URL, the Upstash integration and the Stripe website setting. AI routes set `maxDuration = 60`.

## Testing the payment flows
- **Sandbox:**
  1. Open the app in a private window and click a Pro scenario or **Upgrade**.
  2. Choose **Monthly**, then **Start free trial**, then **Test valid purchase** in RevenueCat's Test Store dialog.
  3. The badge shows **Pro · Trial**. Test Store trials last a few minutes.
- **Live:**
  1. Flip the switch to **Live** and choose **Monthly**. RevenueCat's checkout shows **$0 due today** with a 1-week trial.
  2. After the purchase, `/account` shows **Pro · Trial · 7d**. Cancel with **Manage or cancel**.
- **Inspector:** press **Shift+I** at any point to see the entitlement, placement, server verification and webhook events.

## Project structure
```
src/
  app/
    page.tsx               marketing landing page
    app/                   in-app home (scenarios, progress, build your own)
    play/[id], play/custom roleplay screens
    custom/                custom scenario builder
    account/               account & billing
    terms, privacy, refunds
    api/turn, api/report, api/report/unlock, api/custom
    api/entitlement, api/revenuecat/webhook, api/revenuecat/events
  components/
    landing/               landing sections
    billing/               inspector helpers
    legal/                 legal page layout
    icons/                 custom icon set
    EntitlementProvider, Paywall, EnvironmentSwitch, BillingInspector,
    PlayClient, TensionMeter, RadarChart, Report, MobileSheet, LiveStrip, ...
  lib/
    scenarios.ts, prompts.ts, llm.ts, mock.ts, customPrompt.ts
    revenuecat.ts, entitlementServer.ts, seal.ts, webhookEvents.ts, rateLimit.ts
    types.ts, identity.ts, history.ts, customStore.ts
```

## Docs
- [docs/REVENUECAT_SETUP.md](docs/REVENUECAT_SETUP.md): Test Store, Web Billing, Stripe, products, offering, placements and webhooks
- [docs/DEPLOY.md](docs/DEPLOY.md): Vercel deployment
- [docs/DESIGN.md](docs/DESIGN.md): the design system
- [docs/SUBMISSION.md](docs/SUBMISSION.md): Devpost write-up and demo video script

## License
MIT. See [LICENSE](LICENSE).
