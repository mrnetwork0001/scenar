# RevenueCat setup for Scenar (Web Billing)

Scenar runs in **demo billing** mode until `NEXT_PUBLIC_REVENUECAT_API_KEY` is set: the paywall works end to end and grants a fake local Pro entitlement. Follow these steps to switch to real RevenueCat Web Billing in sandbox mode. It takes about 20 minutes.

> Dashboard menu names shift over time. Where a label below is marked *(approx.)*, look for the nearest match.

## Fastest path: RevenueCat Test Store (no Stripe needed)
RevenueCat's **Test Store** works with `@revenuecat/purchases-js`. Under **Apps**, copy the Test Store API key (it starts with `test_`), put it in `.env.local` as `NEXT_PUBLIC_REVENUECAT_API_KEY`, and restart the app. At checkout, RevenueCat opens a "Test Store Purchase" dialog with **Test valid purchase** and **Test failed purchase** buttons, and entitlements, offerings and customers all behave as real ones do. You still need steps 4–6 below (products, the `scenar_pro` entitlement, and a Current offering), created for the Test Store app. Use the Stripe / Web Billing steps only when you want real card payments.

## 1. Account and project
- [ ] Sign up at <https://app.revenuecat.com> (free).
- [ ] Create a new project named **Scenar**.

## 2. Connect Stripe (test mode is fine)
- [ ] Create a Stripe account at <https://dashboard.stripe.com> if you don't have one. You don't need to activate it, because sandbox purchases use Stripe **test mode**.
- [ ] In RevenueCat, open **Project settings → Apps & providers** *(approx.)* and connect Stripe via OAuth. Web Billing requires a connected Stripe account.

## 3. Add the Web Billing app
- [ ] **Apps & providers → Add app → Web → RevenueCat Web Billing** *(RevenueCat previously called this "RevenueCat Billing")*.
- [ ] Name: `Scenar Web`. Pick the Stripe account from step 2. Set a support email and default currency **USD**.
- [ ] Optional: under the app's appearance/branding settings, set the colors to match Scenar (the code also passes `brandingAppearanceOverride` with violet buttons and pill shapes).

## 4. Create products (Product catalog → Products → New, Web Billing app)
| Identifier | Type | Duration | Price | Free trial |
|---|---|---|---|---|
| `scenar_pro_weekly` | Subscription | 1 week | $3.99 | none |
| `scenar_pro_monthly` | Subscription | 1 month | $9.99 | 7 days |
| `scenar_pro_annual` | Subscription | 1 year | $49.99 | 7 days |

- [ ] Create all three. Give them display titles such as "Prep Pass", "Monthly" and "Annual".

## 5. Create the entitlement
- [ ] **Product catalog → Entitlements → New**, identifier **`scenar_pro`** (it must match `PRO_ENTITLEMENT` in `src/lib/types.ts` exactly).
- [ ] Attach all three products to `scenar_pro`.
- [ ] Optional: create **`starter_scenarios`** too, for reporting only. In the app it is the **free tier** (the 2 free scenarios need no purchase), so no product has to unlock it. If you want it to appear on customer profiles, attach the same three products; the code never checks it.

## 6. Create the offering
- [ ] **Product catalog → Offerings → New**, identifier **`default`**.
- [ ] Add three packages using the built-in identifiers:
  - `$rc_weekly` → `scenar_pro_weekly`
  - `$rc_monthly` → `scenar_pro_monthly`
  - `$rc_annual` → `scenar_pro_annual`
- [ ] Mark the offering as **Current** (the ⋯ menu or "Make current"). The app reads `offerings.current`, so if no offering is current the paywall shows "Plans are unavailable".

## 7. API key → `.env.local`
- [ ] **Project settings → API keys**. Under the Web Billing app, copy the **Sandbox** public key (it starts with `rcb_sb_`). Do **not** use a secret key (`sk_...`).
- [ ] Paste it into the existing `.env.local` in the repo root:
  ```bash
  NEXT_PUBLIC_REVENUECAT_API_KEY=rcb_sb_xxxxxxxxxxxxxxxx
  ```
- [ ] Restart `npm run dev`. `NEXT_PUBLIC_*` variables are inlined at build time, so a restart or redeploy is needed. On Vercel, add the same variable under Project → Settings → Environment Variables.
- [ ] The paywall should now show a teal **Sandbox** pill instead of "Demo billing".

## 8. Test a purchase
- [ ] Open a Pro scenario, or click the **Free** badge, then choose a plan and click **Start free trial**.
- [ ] RevenueCat's checkout opens. Use any email, card **4242 4242 4242 4242**, any future expiry, any CVC and any ZIP.
- [ ] On success, Scenar's "You're Pro" animation plays and the badge switches to **Pro · Trial · 7d left**.
- [ ] Confirm in RevenueCat under **Customers**: turn on the sandbox data toggle to see test customers. You should see an anonymous `$RCAnonymousID:…` customer with `scenar_pro` active and a `paywall_reason` purchase metadata value.

## Webhooks (server-side cache busting + event log)
- [ ] Generate a random secret, e.g. `openssl rand -hex 32`, and add it to `.env.local` (and Vercel) as `REVENUECAT_WEBHOOK_AUTH=<secret>`.
- [ ] RevenueCat dashboard → **Project → Integrations → Webhooks → Add new configuration**.
- [ ] **Webhook URL**: `https://<your-domain>/api/revenuecat/webhook`
- [ ] **Authorization header value**: the exact same `<secret>`. RevenueCat sends it verbatim in the `Authorization` header, and Scenar compares it in constant time. A wrong or missing value gets a `401`, and `503` means `REVENUECAT_WEBHOOK_AUTH` isn't set on the server.
- [ ] Choose the environment (sandbox, production or both), save, then click **Send test event**. It should return `200`.
- [ ] What it does: every event (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, …) clears the server's cached entitlement check for that user, so the next Pro request asks RevenueCat again. The event is also stored so `GET /api/revenuecat/events?user=<appUserId>` can list it. That store is in memory, holds one instance's last 50 events and resets on redeploy, so use a DB/KV in production.
- [ ] Optional: set `REVENUECAT_SECRET_API_KEY=sk_...` (server-only, never `NEXT_PUBLIC_`) to verify entitlements with a secret key. Without it, the server calls `GET /v1/subscribers/{id}` with the environment's public key.

## 9. Before going live (after the hackathon)
- [ ] Swap to the **production** Web Billing public key (`rcb_...` without `sb_`) and activate your Stripe account.
- [ ] Note: users are anonymous and identified per browser (the id is stored in `localStorage` as `scenar.rc.appUserId`). Clearing site data loses access until you add login and call `purchases.changeUser(realUserId)`.

## What the integration does (for judges)
- `Purchases.configure` runs once with a persisted anonymous id, then `preload()` warms up the checkout.
- `getCustomerInfo()` and `getOfferings()` are fetched in parallel. Pro, trial, sandbox and expiry state all come from `entitlements.active.scenar_pro`.
- The custom paywall is built from the **current offering's** packages: prices, trial length and the per-month annual price come straight from RevenueCat, so plans are editable without a deploy.
- `trackCustomPaywallImpression` runs on every paywall open, so paywall views are attributed to the offering.
- `purchase({ rcPackage, metadata: { paywall_reason } })` records which moment triggered the conversion (locked scenario vs. coaching report vs. header).
- Entitlements refresh on window focus, and cancellations (`UserCancelledError`) are handled quietly.
- **Server-side enforcement**: API routes check `scenar_pro` with RevenueCat's REST API before serving Pro scenarios, the builder or the coaching section, which non-Pro callers only receive sealed. Webhooks clear the server cache when a subscription changes.
