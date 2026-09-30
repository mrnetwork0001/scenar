// RevenueCat Web Billing helpers (client-only).
//
// The SDK is always loaded through a dynamic `import()` so server rendering never
// evaluates it. When NEXT_PUBLIC_REVENUECAT_API_KEY is missing we fall back to a
// local "demo billing" mode that mirrors the real offering so the app stays fully
// demoable without an account.

import type {
  CustomerInfo,
  Offering,
  Package,
  Purchases,
  PurchasesError,
} from "@revenuecat/purchases-js";
import { PRO_ENTITLEMENT, type PaywallPackage } from "./types";

const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ?? "";
const APP_USER_ID_KEY = "scenar.rc.appUserId";
const DEMO_ENTITLEMENT_KEY = "scenar.demo.entitlement";
const DAY_MS = 24 * 60 * 60 * 1000;

export type RevenueCatSdk = typeof import("@revenuecat/purchases-js");

export function isDemoBilling(): boolean {
  return API_KEY.trim().length === 0;
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

/* ---------------------------------------------------------------------- SDK */

let sdkPromise: Promise<RevenueCatSdk> | null = null;
let purchasesPromise: Promise<Purchases> | null = null;
let memoryUserId: string | null = null;

export function loadSdk(): Promise<RevenueCatSdk> {
  sdkPromise ??= import("@revenuecat/purchases-js");
  return sdkPromise;
}

/** Stable anonymous RevenueCat id, persisted so purchases survive reloads. */
export function getAppUserId(sdk: RevenueCatSdk): string {
  const stored = readStorage(APP_USER_ID_KEY);
  if (stored) return stored;
  memoryUserId ??= sdk.Purchases.generateRevenueCatAnonymousAppUserId();
  writeStorage(APP_USER_ID_KEY, memoryUserId);
  return memoryUserId;
}

/** Configures the SDK exactly once and returns the shared instance. */
export function getPurchases(): Promise<Purchases> {
  if (isDemoBilling()) {
    return Promise.reject(new Error("RevenueCat API key missing (demo billing mode)."));
  }
  purchasesPromise ??= loadSdk()
    .then((sdk) => {
      const { Purchases: P } = sdk;
      if (P.isConfigured()) return P.getSharedInstance();
      const instance = P.configure({ apiKey: API_KEY, appUserId: getAppUserId(sdk) });
      // Warm up branding/checkout resources so the purchase sheet opens instantly.
      void instance.preload().catch(() => undefined);
      return instance;
    })
    .catch((err: unknown) => {
      purchasesPromise = null; // allow a retry on next call
      throw err;
    });
  return purchasesPromise;
}

/* ------------------------------------------------------------ entitlements */

export interface ProStatus {
  isPro: boolean;
  isTrial: boolean;
  isSandbox: boolean;
  expiresAt: Date | null;
  managementUrl: string | null;
}

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

interface DemoEntitlementRecord {
  packageId: string;
  isTrial: boolean;
  expiresAt: string; // ISO
}

export function readDemoStatus(): ProStatus {
  const none: ProStatus = {
    isPro: false,
    isTrial: false,
    isSandbox: false,
    expiresAt: null,
    managementUrl: null,
  };
  const raw = readStorage(DEMO_ENTITLEMENT_KEY);
  if (!raw) return none;
  try {
    const rec = JSON.parse(raw) as DemoEntitlementRecord;
    const expiresAt = new Date(rec.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      writeStorage(DEMO_ENTITLEMENT_KEY, null);
      return none;
    }
    return { ...none, isPro: true, isTrial: rec.isTrial, expiresAt };
  } catch {
    return none;
  }
}

/** Simulates a checkout and grants a local Pro entitlement (trial where offered). */
export async function demoPurchase(packageId: string): Promise<ProStatus> {
  const pkg = DEMO_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) throw new Error("That plan isn't available.");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const rec: DemoEntitlementRecord = {
    packageId,
    isTrial: Boolean(pkg.trialDays),
    expiresAt: new Date(Date.now() + 7 * DAY_MS).toISOString(),
  };
  writeStorage(DEMO_ENTITLEMENT_KEY, JSON.stringify(rec));
  return readDemoStatus();
}

export function resetDemoStatus(): void {
  writeStorage(DEMO_ENTITLEMENT_KEY, null);
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
