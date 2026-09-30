# Scenar

**Rehearse the conversations that matter — before the stakes are real.**

Scenar is an AI conversation simulator for students and new professionals. You practise the conversations people dread — negotiating your first salary, saying no to your manager, asking a strict professor for an extension, giving hard feedback to a former peer — against an AI counterpart that has a **hidden agenda**.

Built for the **RevenueCat Shipaton 2026 — Next Gen Award**.

## Why it's not "just ask ChatGPT to roleplay"

Every counterpart has a **secret** and a **win condition**:

| Scenario | The secret you have to uncover |
|---|---|
| Negotiate Your First Offer | The recruiter's approved ceiling is $84k + a $5k signing bonus |
| Say No to Your Manager | The "urgent" demo can actually slip to Wednesday |
| Appeal to a Strict Professor | University rules allow up to 5 days for documented emergencies |
| Give Hard Feedback to a Former Peer | Your report is quietly caring for a sick parent |
| Push Back on an Unfair Review | The rating came from one unverified escalation |

So there's a real outcome to win or lose. At the end, the **hidden truth is revealed**: *"Dana could go to $84k — you stopped at $78k."*

## Features

- **Live tension meter**: an animated gauge that reacts every turn to how the counterpart is feeling.
- **Live scoring** of every message on Assertiveness, Emotional Regulation, Clarity and Boundary Setting, plus a one-line coach tip.
- **Report**: radar chart, verdict, the secret revealed, and (Pro) tactical line-by-line rewrites of what you should have said.
- **Progress tracking**: session history, radar comparison against your last attempt, personal-best and streak tracking, and a "focus next" skill.
- **Voice mode (Pro)**: speak your replies and hear the counterpart answer in a consistent voice (browser-native Web Speech API).
- **Custom scenario builder (Pro)**: describe the real conversation you're dreading, and the AI builds a counterpart with their own hidden agenda. The scenario is sealed server-side with AES-256-GCM, so the browser can't peek at the secret.
- **Monochrome design** (see [docs/DESIGN.md](docs/DESIGN.md)): black-on-white Inter typography, pill controls, and motion throughout. Colour appears only in the tension meter, where it means something.

## RevenueCat integration

Scenar uses **RevenueCat Web Billing** via [`@revenuecat/purchases-js`](https://www.npmjs.com/package/@revenuecat/purchases-js).

- **Entitlement `scenar_pro`** gates four value moments: 3 of the 5 scenarios, the tactical-rewrite section of the report, voice mode and the custom scenario builder. The coaching section is generated with every report but only delivered sealed to non-Pro callers, so it unlocks seconds after the purchase without re-running the analysis.
- **Every purchase is tagged with the moment that caused it** (`metadata.paywall_reason`: locked scenario, report, voice, builder or header), and `trackCustomPaywallImpression` runs on every paywall open.
- **Offerings are dashboard-driven**: the custom paywall renders whatever packages are in the current offering. It computes "Save X%" for annual versus monthly and reads free-trial length from the product's trial phase. Nothing is hard-coded.
- **Pricing matched to how people actually prepare**: Monthly with a 7-day free trial for someone preparing for one big conversation, Annual for managers who practise continuously, and a one-time Lifetime plan. The trial length, prices and "Best value" / "Save X%" badges are all derived from the offering at runtime.
- **Anonymous app user IDs**: nobody has to sign up before they can practise.
- **Live entitlement badge** (Free / Pro · Trial with days left / Pro), refreshed on window focus.
- **Context-aware paywall copy**: the headline depends on where the paywall was opened (locked scenario versus report upsell).

### Server-side verification

Pro is enforced on the server, not just hidden in the browser:

- **`verifyPro(req)`** (`src/lib/entitlementServer.ts`) reads the RevenueCat app user id + environment the client sends (`x-scenar-user` / `x-scenar-env`) and asks RevenueCat directly (`GET /v1/subscribers/{id}`, with `REVENUECAT_SECRET_API_KEY` or that environment's public key). An entitlement counts when `expires_date` is in the future (or null for Lifetime) or it is inside a billing grace period. Results are cached per user (60 s for Pro, 10 s otherwise), lookups time out after 5 s, and errors fail closed without ever returning a 500.
- **Gated routes**: `/api/custom` (the builder) and `/api/turn` / `/api/report` for Pro scenarios (built-in or sealed custom ones) return `403 { code: "pro_required" }`, and the client opens the matching paywall.
- **Sealed Pro content**: for everyone else, `/api/report` strips *what worked / to improve / the rewrite* and returns them only as an AES-256-GCM `proSealed` token. It uses its own key-derivation label and expires after 24 h. After a purchase, `POST /api/report/unlock` re-verifies with RevenueCat (bypassing the cache) and returns the section, so the report unlocks in place.
- **Webhooks**: `POST /api/revenuecat/webhook` checks the `Authorization` header against `REVENUECAT_WEBHOOK_AUTH` using a constant-time compare, clears the cached result for the user(s) in the event, and records the event. `GET /api/revenuecat/events?user=<id>` returns only that user's recent events. They are kept in a per-instance in-memory ring of 50, which is enough for the demo; use a DB/KV in production.
- **`GET /api/entitlement`** shows what the server believes (`mode: revenuecat | demo | unverifiable`) for the inspector's "Server verification" row.

Setup: see [docs/REVENUECAT_SETUP.md](docs/REVENUECAT_SETUP.md). Deployment: see [docs/DEPLOY.md](docs/DEPLOY.md). Without a key, the app runs in a clearly labelled **demo billing** mode.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules (no UI libraries) · RevenueCat Web Billing · LLM via the 0G router (GPT-4.1 for live turns, Claude Sonnet 5 for reports; OpenAI and Anthropic API formats both supported) · `motion` · `lucide-react`.

```
src/lib/scenarios.ts        scenario personas, secrets, win conditions (server-only)
src/lib/prompts.ts          counterpart + evaluator prompts
src/app/api/turn            one conversation turn → reply + tension + scores
src/app/api/report          end-of-session report
src/app/api/custom          custom scenario generator → sealed (encrypted) scenario token
src/lib/seal.ts             AES-256-GCM sealing of custom scenario secrets
src/components/…            TensionMeter, RadarChart, Paywall, EntitlementProvider, PlayClient, Report
```

Scenario secrets never reach the browser. Server components pass only public fields to the client, custom scenarios travel as encrypted tokens, and the secret appears only in the final report. The LLM routes are rate-limited per IP in production.

## Run it

```bash
npm install
cp .env.example .env.local   # add LLM + RevenueCat keys (both optional)
npm run dev
```

Without `LLM_API_KEY`, an offline heuristic counterpart runs, so the demo always works.

## License

MIT
