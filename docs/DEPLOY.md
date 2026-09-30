# Deploying Scenar to Vercel

Production URL: **https://www.tryscenar.xyz**. Vercel project `tryscenar`, with the custom domain `tryscenar.xyz` from Namecheap. The apex redirects (308) to `www`, so always use the `www` form for webhooks. The default `tryscenar.vercel.app` still works, but some Italian ISPs block `*.vercel.app` hostnames, which is why the custom domain exists.

## 1. Import the repo
1. https://vercel.com/new → **Import Git Repository** → `mrnetwork0001/scenar`.
2. **Project name:** `tryscenar`. Framework preset: **Next.js**, detected automatically. Leave the build settings at their defaults (`next build`).

## 2. Environment variables
Add these under **Settings → Environment Variables**, or during import, for **Production** (and Preview if you want preview deploys to work). Copy the values from your local `.env.local`, and never commit them.

| Name | Value | Notes |
|---|---|---|
| `LLM_BASE_URL` | `https://router-api.0g.ai/v1` | 0G router |
| `LLM_API_KEY` | *(your 0G key)* | server-only |
| `LLM_MODEL` | `gpt-4.1` | live turns |
| `LLM_REPORT_MODEL` | `claude-sonnet-5` | end-of-session report (Anthropic format, handled automatically) |
| `NEXT_PUBLIC_REVENUECAT_API_KEY` | *(sandbox key, `test_...`)* | Sandbox environment |
| `NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY` | *(production key, `rcb_...`)* | Live environment |
| `REVENUECAT_WEBHOOK_AUTH` | *(random secret, e.g. `openssl rand -hex 32`)* | must match the RevenueCat webhook |
| `SCENAR_SEAL_SECRET` | *(random secret, e.g. `openssl rand -hex 32`)* | encrypts custom scenarios and Pro report sections; keep it stable across deploys |
| `NEXT_PUBLIC_SITE_URL` | `https://www.tryscenar.xyz` | Open Graph and sitemap URLs |
| `REVENUECAT_SECRET_API_KEY` | *(optional, `sk_...`)* | server-side verification; falls back to the public keys |

`NEXT_PUBLIC_*` values are inlined at build time, so **redeploy** after changing them.

## 3. Deploy and verify
1. Click **Deploy**, then open https://www.tryscenar.xyz.
2. Check that:
   - the landing page loads;
   - `/app` → **Negotiate Your First Offer** → a conversation gets AI replies (not the "Offline demo AI" pill);
   - the paywall shows your plans in **Sandbox**, and the switch offers **Live**;
   - `/terms`, `/privacy` and `/refunds` load.

## 4. After the first deploy
- **Stripe:** update the business website to `https://www.tryscenar.xyz` (Settings → Business → Public details).
- **RevenueCat webhook:** Integrations → Webhooks → URL `https://www.tryscenar.xyz/api/revenuecat/webhook`, with the Authorization header set to your `REVENUECAT_WEBHOOK_AUTH` value. Then **Send test event**, which should return 200.
- **Rate limits** apply in production (per IP, per 10 minutes: turn 40, report 10, custom 6).
- **Webhook event log:** connect **Upstash Redis** (Vercel → Storage → Upstash → Connect to `tryscenar`). The integration adds the Redis REST URL and token env vars, and after a redeploy events persist across instances, deduplicated by event id. Without it, events are kept in memory per instance. The entitlement cache stays in memory (60s TTL) either way.
