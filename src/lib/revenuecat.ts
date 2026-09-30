// RevenueCat Web Billing helpers (client-only).
//
// The SDK is always loaded through a dynamic `import()` so server rendering never
// evaluates it. Two billing environments are supported:
//   - sandbox: NEXT_PUBLIC_REVENUECAT_API_KEY (Test Store `test_` or Web Billing `rcb_sb_`)
//   - live:    NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY (Web Billing production `rcb_`)
// Each environment keeps its own anonymous app user id, so a sandbox trial never
// leaks into live and vice versa. When the sandbox key is missing we fall back to a
// local "demo billing" mode that mirrors the real offering so the app stays fully
// demoable without an account.

import type {
  CustomerInfo,
  Offering,
  Package,
  Purchases,
  PurchasesError,
} from "@revenuecat/purchases-js";
import {
  PRO_ENTITLEMENT,
  type BillingEnv,
  type BillingSnapshot,
  type KeyKind,
  type PaywallPackage,
  type PaywallReason,
} from "./types";

// Referenced literally so Next.js inlines them into the client bundle.
const SANDBOX_KEY = (process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ?? "").trim();
const LIVE_KEY = (process.env.NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY ?? "").trim();

const LEGACY_APP_USER_ID_KEY = "scenar.rc.appUserId";
const APP_USER_ID_KEY: Record<BillingEnv, string> = {
  sandbox: "scenar.rc.appUserId.sandbox",
  live: "scenar.rc.appUserId.live",
};
const ENV_KEY = "scenar.billing.env";
const LAST_PURCHASE_KEY = "scenar.rc.lastPurchase."; // + env | "demo"
const DEMO_ENTITLEMENT_KEY = "scenar.demo.entitlement";
const DEMO_APP_USER_ID_KEY = "scenar.demo.appUserId";
const DAY_MS = 24 * 60 * 60 * 1000;

export type RevenueCatSdk = typeof import("@revenuecat/purchases-js");

/* --------------------------------------------------------------------- keys */

/** Public RevenueCat key for an environment ("" when not configured). */
export function keyForEnv(env: BillingEnv): string {
  return env === "live" ? LIVE_KEY : SANDBOX_KEY;
}

/** Classifies a public key by its prefix. Never inspects more than the prefix. */
export function keyKindOf(key: string | null | undefined): KeyKind {
  const k = (key ?? "").trim();
  if (!k) return "demo";
  if (k.startsWith("test_")) return "test-store";
  if (k.startsWith("rcb_sb_")) return "web-billing-sandbox";
  if (k.startsWith("rcb_")) return "web-billing-live";
  return "unknown";
}

/** Display-safe key prefix, e.g. "test_SI…". Never returns the full key. */
export function maskKey(key: string | null | undefined): string | null {
  const k = (key ?? "").trim();
  return k ? `${k.slice(0, 7)}…` : null;
}

export function isDemoBilling(): boolean {
  return SANDBOX_KEY.length === 0;
}

let liveKeyWarned = false;

/** Live mode needs a production Web Billing key (`rcb_`, not `rcb_sb_`) and a sandbox key. */
export function isLiveAvailable(): boolean {
  if (isDemoBilling() || !LIVE_KEY) return false;
  const ok = keyKindOf(LIVE_KEY) === "web-billing-live";
  if (!ok && !liveKeyWarned && typeof window !== "undefined") {
    liveKeyWarned = true;
    console.warn(
      `[Scenar] NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY (${maskKey(LIVE_KEY)}) is not a production Web Billing key (rcb_…). Live mode disabled.`,
    );
  }
  return ok;
}

/* ------------------------------------------------------------------ storage */

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked (private mode, sandboxed iframe) - stay in-memory */
  }
}

/** Persisted environment choice; falls back to sandbox when live isn't available. */
export function readStoredEnv(): BillingEnv {
  return readStorage(ENV_KEY) === "live" && isLiveAvailable() ? "live" : "sandbox";
}

export function writeStoredEnv(env: BillingEnv): void {
  writeStorage(ENV_KEY, env);
}

/* ------------------------------------------------------------ app user ids */

const memoryUserIds: Partial<Record<BillingEnv, string>> = {};

/** One-time move of the pre-environments id into the sandbox slot. */
function migrateLegacyUserId(): void {
  const legacy = readStorage(LEGACY_APP_USER_ID_KEY);
  if (!legacy) return;
  if (!readStorage(APP_USER_ID_KEY.sandbox)) writeStorage(APP_USER_ID_KEY.sandbox, legacy);
  writeStorage(LEGACY_APP_USER_ID_KEY, null);
}

/** Stable anonymous RevenueCat id for `env`, persisted so purchases survive reloads. */
export function getAppUserId(sdk: RevenueCatSdk, env: BillingEnv): string {
  if (env === "sandbox") migrateLegacyUserId();
  const stored = readStorage(APP_USER_ID_KEY[env]);
  if (stored) return stored;
  memoryUserIds[env] ??= sdk.Purchases.generateRevenueCatAnonymousAppUserId();
  writeStorage(APP_USER_ID_KEY[env], memoryUserIds[env]);
  return memoryUserIds[env];
}

export function storeAppUserId(env: BillingEnv, appUserId: string): void {
  memoryUserIds[env] = appUserId;
  writeStorage(APP_USER_ID_KEY[env], appUserId);
}

/** Validates an app user id typed by a person ("restore on another device"). Returns an error message or null. */
export function validateAppUserId(id: string): string | null {
  if (!id) return "Enter your account ID.";
  if (id.length > 100) return "That ID is too long (100 characters max).";
  if (/\s/.test(id)) return "Account IDs can't contain spaces.";
  return null;
}

/* ---------------------------------------------------------- last purchase */

export type LastPurchase = NonNullable<BillingSnapshot["lastPurchase"]>;

export function readLastPurchase(scope: BillingEnv | "demo"): LastPurchase | null {
  const raw = readStorage(LAST_PURCHASE_KEY + scope);
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as { productId: string; paywallReason: PaywallReason; at: string };
    const at = new Date(rec.at);
    if (!rec.productId || Number.isNaN(at.getTime())) return null;
    return { productId: rec.productId, paywallReason: rec.paywallReason ?? "manual", at };
  } catch {
    return null;
  }
}

export function writeLastPurchase(scope: BillingEnv | "demo", rec: LastPurchase | null): void {
  writeStorage(
    LAST_PURCHASE_KEY + scope,
    rec ? JSON.stringify({ ...rec, at: rec.at.toISOString() }) : null,
  );
}

/* ---------------------------------------------------------------------- SDK */

let sdkPromise: Promise<RevenueCatSdk> | null = null;
/** The configured instance and the environment it belongs to. */
let active: { env: BillingEnv; promise: Promise<Purchases> } | null = null;
/** Serialises configure/close so rapid env switches never interleave. */
let queue: Promise<unknown> = Promise.resolve();

export function loadSdk(): Promise<RevenueCatSdk> {
  sdkPromise ??= import("@revenuecat/purchases-js");
  return sdkPromise;
}

/** Environment of the currently configured instance (null before the first configure). */
export function activeEnv(): BillingEnv | null {
  return active?.env ?? null;
}

/**
 * Configures the SDK for `env` (closing any instance bound to another environment)
 * and returns it. Idempotent for the environment already active.
 */
export function configurePurchases(env: BillingEnv): Promise<Purchases> {
  if (isDemoBilling()) {
    return Promise.reject(new Error("RevenueCat API key missing (demo billing mode)."));
  }
  if (env === "live" && !isLiveAvailable()) {
    return Promise.reject(new Error("Live payments are not configured."));
  }
  if (active?.env === env) return active.promise;

  const previous = active?.promise ?? null;
  const promise = queue.then(async () => {
    const sdk = await loadSdk();
    const { Purchases: P } = sdk;
    if (previous) {
      const old = await previous.catch(() => null);
      old?.close();
    } else if (P.isConfigured()) {
      // Left over from a hot reload: we can't tell which key it used, so start clean.
      P.getSharedInstance().close();
    }
    const instance = P.configure({ apiKey: keyForEnv(env), appUserId: getAppUserId(sdk, env) });
    // Warm up branding/checkout resources so the purchase sheet opens instantly.
    void instance.preload().catch(() => undefined);
    return instance;
  });
  queue = promise.catch(() => undefined);
  const entry = { env, promise };
  active = entry;
  promise.catch(() => {
    if (active === entry) active = null; // allow a retry on next call
  });
  return promise;
}

/** The configured instance (configures the persisted environment on first use). */
export function getPurchases(): Promise<Purchases> {
  return active?.promise ?? configurePurchases(readStoredEnv());
}

/* ------------------------------------------------------------ entitlements */

export interface ProStatus {
  isPro: boolean;
  isTrial: boolean;
  isSandbox: boolean;
  expiresAt: Date | null;
  managementUrl: string | null;
  activeEntitlements: string[];
  productId: string | null;
  periodType: BillingSnapshot["periodType"];
  willRenew: boolean | null;
  purchaseDate: Date | null;
}

export const EMPTY_STATUS: ProStatus = {
  isPro: false,
  isTrial: false,
  isSandbox: false,
  expiresAt: null,
  managementUrl: null,
  activeEntitlements: [],
  productId: null,
  periodType: null,
  willRenew: null,
  purchaseDate: null,
};

/** "Scenar Pro", "scenar-pro", "SCENAR_PRO" → "scenar_pro". */
const normalizeId = (id: string) => id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

export function readProStatus(info: CustomerInfo, sandboxKey: boolean): ProStatus {
  // Exact identifier first; tolerate dashboard spellings like "Scenar Pro" as a fallback.
  const active = info.entitlements.active;
  const ent =
    active[PRO_ENTITLEMENT] ??
    Object.entries(active).find(([id]) => normalizeId(id) === PRO_ENTITLEMENT)?.[1];
  return {
    isPro: Boolean(ent?.isActive ?? ent),
    isTrial: ent?.periodType === "trial",
    isSandbox: ent ? ent.isSandbox : sandboxKey,
    expiresAt: ent?.expirationDate ?? null,
    managementUrl: info.managementURL,
    activeEntitlements: Object.keys(active),
    productId: ent?.productIdentifier ?? null,
    periodType: ent?.periodType ?? null,
    willRenew: ent ? ent.willRenew : null,
    purchaseDate: ent?.latestPurchaseDate ?? null,
  };
}

/* ---------------------------------------------------------------- packages */

const KIND_ORDER: Record<PaywallPackage["kind"], number> = {
  weekly: 0,
  monthly: 1,
  annual: 2,
  lifetime: 3,
  other: 4,
};

const KIND_TITLE: Record<PaywallPackage["kind"], string> = {
  weekly: "Prep Pass",
  monthly: "Monthly",
  annual: "Annual",
  lifetime: "Lifetime",
  other: "",
};

const PERIOD_LABEL: Record<string, string> = {
  day: "/day",
  week: "/week",
  month: "/month",
  year: "/year",
};

const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };

function kindOf(pkg: Package): PaywallPackage["kind"] {
  switch (pkg.packageType as string) {
    case "$rc_weekly":
      return "weekly";
    case "$rc_monthly":
      return "monthly";
    case "$rc_annual":
      return "annual";
    case "$rc_lifetime":
      return "lifetime";
  }
  const period = pkg.product.period;
  if (!period) return pkg.product.productType === "subscription" ? "other" : "lifetime";
  const unit = period.unit as string;
  if (period.number === 1 && unit === "week") return "weekly";
  if (period.number === 1 && unit === "month") return "monthly";
  if ((period.number === 1 && unit === "year") || (period.number === 12 && unit === "month")) {
    return "annual";
  }
  return "other";
}

function periodLabelOf(pkg: Package, kind: PaywallPackage["kind"]): string {
  const period = pkg.product.period;
  if (!period) return "";
  const unit = period.unit as string;
  if (period.number === 1) return PERIOD_LABEL[unit] ?? "";
  if (kind === "annual") return "/year";
  return `/${period.number} ${unit}s`;
}

export function mapPackage(pkg: Package): PaywallPackage {
  const product = pkg.product;
  const kind = kindOf(pkg);
  const trialPeriod = product.freeTrialPhase?.period ?? null;
  const trialDays = trialPeriod
    ? trialPeriod.number * (UNIT_DAYS[trialPeriod.unit as string] ?? 1)
    : undefined;
  const pricePerMonth =
    kind === "annual"
      ? (product.defaultSubscriptionOption?.base.pricePerMonth?.formattedPrice ?? undefined)
      : undefined;

  return {
    id: pkg.identifier,
    kind,
    title: KIND_TITLE[kind] || product.title,
    price: product.price?.formattedPrice ?? product.currentPrice.formattedPrice,
    periodLabel: periodLabelOf(pkg, kind),
    pricePerMonth,
    trialDays: trialDays && trialDays > 0 ? trialDays : undefined,
  };
}

export function sortPackages<T extends Pick<PaywallPackage, "kind">>(list: T[]): T[] {
  return [...list].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** Returns mapped packages plus a lookup back to the SDK objects for purchasing. */
export function mapOffering(offering: Offering | null): {
  packages: PaywallPackage[];
  byId: Map<string, Package>;
} {
  const byId = new Map<string, Package>();
  if (!offering) return { packages: [], byId };
  for (const pkg of offering.availablePackages) byId.set(pkg.identifier, pkg);
  return { packages: sortPackages(offering.availablePackages.map(mapPackage)), byId };
}

/* ------------------------------------------------------------------ errors */

export function isPurchasesError(sdk: RevenueCatSdk, err: unknown): err is PurchasesError {
  return err instanceof sdk.PurchasesError;
}

export function isUserCancelled(sdk: RevenueCatSdk, err: unknown): boolean {
  return isPurchasesError(sdk, err) && err.errorCode === sdk.ErrorCode.UserCancelledError;
}

export function describePurchaseError(sdk: RevenueCatSdk, err: unknown): string {
  if (isPurchasesError(sdk, err)) {
    switch (err.errorCode) {
      case sdk.ErrorCode.NetworkError:
        return "Network hiccup - check your connection and try again.";
      case sdk.ErrorCode.ProductAlreadyPurchasedError:
        return "You already own this plan. Refreshing your access…";
      case sdk.ErrorCode.PaymentPendingError:
        return "Your payment is pending. Access unlocks as soon as it clears.";
      case sdk.ErrorCode.InvalidCredentialsError:
      case sdk.ErrorCode.ConfigurationError:
        return "Billing is misconfigured (check the RevenueCat API key and offering).";
      case sdk.ErrorCode.ProductNotAvailableForPurchaseError:
        return "This plan isn't available right now. Try another option.";
      default:
        return err.message || "The purchase couldn't be completed.";
    }
  }
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------- demo mode */

export const DEMO_PACKAGES: PaywallPackage[] = [
  { id: "$rc_weekly", kind: "weekly", title: "Prep Pass", price: "$3.99", periodLabel: "/week" },
  {
    id: "$rc_monthly",
    kind: "monthly",
    title: "Monthly",
    price: "$9.99",
    periodLabel: "/month",
    trialDays: 7,
  },
  {
    id: "$rc_annual",
    kind: "annual",
    title: "Annual",
    price: "$49.99",
    periodLabel: "/year",
    pricePerMonth: "$4.17",
    trialDays: 7,
  },
];

/** Product ids the demo "purchases" report, mirroring the real offering's naming. */
export const DEMO_PRODUCT_IDS: Record<string, string> = {
  $rc_weekly: "scenar_pro_weekly",
  $rc_monthly: "scenar_pro_monthly",
  $rc_annual: "scenar_pro_annual",
};

/** Stable local id so the inspector/account pages have something to show in demo mode. */
export function getDemoAppUserId(): string {
  const stored = readStorage(DEMO_APP_USER_ID_KEY);
  if (stored) return stored;
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const id = `demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  writeStorage(DEMO_APP_USER_ID_KEY, id);
  return id;
}

interface DemoEntitlementRecord {
  packageId: string;
  isTrial: boolean;
  expiresAt: string; // ISO
  purchasedAt?: string; // ISO (absent in records written before environments)
}

export function readDemoStatus(): ProStatus {
  const raw = readStorage(DEMO_ENTITLEMENT_KEY);
  if (!raw) return EMPTY_STATUS;
  try {
    const rec = JSON.parse(raw) as DemoEntitlementRecord;
    const expiresAt = new Date(rec.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      writeStorage(DEMO_ENTITLEMENT_KEY, null);
      return EMPTY_STATUS;
    }
    const purchasedAt = rec.purchasedAt ? new Date(rec.purchasedAt) : null;
    return {
      ...EMPTY_STATUS,
      isPro: true,
      isTrial: rec.isTrial,
      expiresAt,
      activeEntitlements: [PRO_ENTITLEMENT],
      productId: DEMO_PRODUCT_IDS[rec.packageId] ?? rec.packageId,
      periodType: rec.isTrial ? "trial" : "normal",
      willRenew: true,
      purchaseDate:
        purchasedAt && !Number.isNaN(purchasedAt.getTime())
          ? purchasedAt
          : new Date(expiresAt.getTime() - 7 * DAY_MS),
    };
  } catch {
    return EMPTY_STATUS;
  }
}

/** Simulates a checkout and grants a local Pro entitlement (trial where offered). */
export async function demoPurchase(packageId: string): Promise<ProStatus> {
  const pkg = DEMO_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) throw new Error("That plan isn't available.");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const now = Date.now();
  const rec: DemoEntitlementRecord = {
    packageId,
    isTrial: Boolean(pkg.trialDays),
    expiresAt: new Date(now + 7 * DAY_MS).toISOString(),
    purchasedAt: new Date(now).toISOString(),
  };
  writeStorage(DEMO_ENTITLEMENT_KEY, JSON.stringify(rec));
  return readDemoStatus();
}

export function resetDemoStatus(): void {
  writeStorage(DEMO_ENTITLEMENT_KEY, null);
  writeLastPurchase("demo", null);
}

/* ------------------------------------------------------------ formatting */

/** Best-effort numeric parse of a formatted price ("$9.99", "9,99 €"). */
export function parsePrice(formatted: string | undefined): number | null {
  if (!formatted) return null;
  let s = formatted.replace(/[^\d.,]/g, "");
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Remaining time until `date`, for the trial badge: "7d", "3h" or "5m" (short) and
 * "7 days" / "3 hours" / "5 minutes" (long). Sandbox and Test Store trials are
 * time-compressed (a 1-week trial lasts minutes), so sub-day values matter.
 */
export function timeLeft(date: Date | null, now: number): { short: string; long: string } | null {
  if (!date) return null;
  const ms = date.getTime() - now;
  if (ms <= 0) return null;
  const HOUR_MS = 60 * 60 * 1000;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (ms >= DAY_MS) {
    const d = Math.round(ms / DAY_MS);
    return { short: `${d}d`, long: plural(d, "day") };
  }
  if (ms >= HOUR_MS) {
    const h = Math.round(ms / HOUR_MS);
    return { short: `${h}h`, long: plural(h, "hour") };
  }
  const m = Math.max(1, Math.round(ms / 60_000));
  return { short: `${m}m`, long: plural(m, "minute") };
}
