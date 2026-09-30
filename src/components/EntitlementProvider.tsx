"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CustomerInfo, Offering, Package, Purchases } from "@revenuecat/purchases-js";
import {
  configurePurchases,
  DEMO_PACKAGES,
  DEMO_PRODUCT_IDS,
  demoPurchase,
  describePurchaseError,
  EMPTY_STATUS,
  getDemoAppUserId,
  getPurchases,
  isDemoBilling,
  isLiveAvailable,
  isUserCancelled,
  keyForEnv,
  keyKindOf,
  loadSdk,
  mapOffering,
  maskKey,
  readDemoStatus,
  readLastPurchase,
  readProStatus,
  readStoredEnv,
  resetDemoStatus,
  storeAppUserId,
  validateAppUserId,
  writeLastPurchase,
  writeStoredEnv,
  type LastPurchase,
  type ProStatus,
} from "@/lib/revenuecat";
import { setIdentity } from "@/lib/identity";
import {
  PAYWALL_PLACEMENTS,
  type BillingEnv,
  type BillingSnapshot,
  type EntitlementState,
  type PaywallPackage,
  type PaywallReason,
} from "@/lib/types";
import { Paywall } from "./Paywall";

/** Extra state used by the Paywall / ProBadge / EnvironmentSwitch, not part of the public contract. */
export interface EntitlementInternals extends EntitlementState {
  error: string | null;
  clearError: () => void;
  managementUrl: string | null;
  /** True while an environment switch is in flight (ready is false during it too). */
  switchingEnv: boolean;
}

const EntitlementContext = createContext<EntitlementInternals | null>(null);

const FOCUS_REFRESH_MIN_MS = 5000;

type Mapped = ReturnType<typeof mapOffering>;
const EMPTY_MAPPED: Mapped = { packages: [], byId: new Map<string, Package>() };

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const demoMode = isDemoBilling();
  const liveAvailable = isLiveAvailable();

  const [ready, setReady] = useState(false);
  const [env, setEnvState] = useState<BillingEnv>("sandbox");
  const [switchingEnv, setSwitchingEnv] = useState(false);
  const [status, setStatus] = useState<ProStatus>(EMPTY_STATUS);
  const [packages, setPackages] = useState<PaywallPackage[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [offeringMeta, setOfferingMeta] = useState<{
    offeringId: string | null;
    placementId: string | null;
  }>({ offeringId: null, placementId: null });
  const [lastPurchase, setLastPurchase] = useState<LastPurchase | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  /** Bumped on every environment (re)load; async work from an older run is discarded. */
  const runRef = useRef(0);
  /** Bumped on every paywall open/close; stale placement lookups are discarded. */
  const paywallRunRef = useRef(0);
  const envRef = useRef<BillingEnv>("sandbox");
  const currentMappedRef = useRef<Mapped>(EMPTY_MAPPED); // default (current) offering
  const currentOfferingRef = useRef<Offering | null>(null);
  const sdkPackages = useRef<Map<string, Package>>(new Map()); // packages currently shown
  const shownOfferingRef = useRef<Offering | null>(null);
  const placementRef = useRef<string | null>(null);
  const reasonRef = useRef<PaywallReason | null>(null);
  const paywallOpenRef = useRef(false);
  const purchasingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  /* ------------------------------------------------------------ helpers */

  const applyInfo = useCallback((info: CustomerInfo, purchases: Purchases, forEnv: BillingEnv) => {
    const id = purchases.getAppUserId();
    setStatus(readProStatus(info, purchases.isSandbox()));
    setAppUserId(id);
    setFetchedAt(new Date());
    setIdentity({ appUserId: id, env: forEnv });
    lastRefreshRef.current = Date.now();
  }, []);

  const showMapped = useCallback((mapped: Mapped, offering: Offering | null) => {
    sdkPackages.current = mapped.byId;
    shownOfferingRef.current = offering;
    setPackages(mapped.packages);
  }, []);

  /** Resolves the offering for a paywall moment: its placement first, else the current offering. */
  const loadPaywallOffering = useCallback(
    async (reason: PaywallReason) => {
      const token = ++paywallRunRef.current;
      const run = runRef.current;
      const placementId = PAYWALL_PLACEMENTS[reason];
      let purchases: Purchases;
      try {
        purchases = await getPurchases();
      } catch {
        return;
      }
      let offering: Offering | null = null;
      try {
        offering = await purchases.getCurrentOfferingForPlacement(placementId);
      } catch (err) {
        console.warn(`[Scenar] Placement "${placementId}" lookup failed; using current offering`, err);
      }
      let mapped = offering ? mapOffering(offering) : null;
      let usedPlacement: string | null = placementId;
      if (!offering || !mapped || mapped.packages.length === 0) {
        offering = currentOfferingRef.current;
        mapped = currentMappedRef.current;
        usedPlacement = null;
      }
      if (token !== paywallRunRef.current || run !== runRef.current) return;

      placementRef.current = usedPlacement;
      showMapped(mapped, offering);
      setOfferingMeta({ offeringId: offering?.identifier ?? null, placementId: usedPlacement });
      // Attribute this custom paywall impression to the offering (and placement) actually shown.
      try {
        purchases.trackCustomPaywallImpression({
          paywallId: `scenar-${reason}`,
          offering: offering ?? undefined,
        });
      } catch {
        /* analytics only */
      }
    },
    [showMapped],
  );

  /** Configures `target`, then loads customer info + the current offering for it. */
  const loadEnv = useCallback(
    async (target: BillingEnv, run: number) => {
      try {
        const purchases = await configurePurchases(target);
        if (run !== runRef.current) return;
        const [infoResult, offeringsResult] = await Promise.allSettled([
          purchases.getCustomerInfo(),
          purchases.getOfferings(),
        ]);
        if (run !== runRef.current) return;

        setLastPurchase(readLastPurchase(target));
        if (infoResult.status === "fulfilled") {
          applyInfo(infoResult.value, purchases, target);
        } else {
          console.warn("[Scenar] getCustomerInfo failed", infoResult.reason);
          const id = purchases.getAppUserId();
          setStatus({ ...EMPTY_STATUS, isSandbox: purchases.isSandbox() });
          setAppUserId(id);
          setIdentity({ appUserId: id, env: target });
        }

        if (offeringsResult.status === "fulfilled") {
          const current = offeringsResult.value.current;
          currentOfferingRef.current = current;
          currentMappedRef.current = mapOffering(current);
          if (!current) {
            console.warn(
              "[Scenar] No current offering - set an offering as Current in the RevenueCat dashboard.",
            );
          }
        } else {
          console.warn("[Scenar] getOfferings failed", offeringsResult.reason);
          currentOfferingRef.current = null;
          currentMappedRef.current = EMPTY_MAPPED;
        }
        placementRef.current = null;
        showMapped(currentMappedRef.current, currentOfferingRef.current);
        setOfferingMeta({ offeringId: currentOfferingRef.current?.identifier ?? null, placementId: null });

        // A paywall opened before (or during) the load gets its placement offering now.
        if (paywallOpenRef.current && reasonRef.current) {
          void loadPaywallOffering(reasonRef.current);
        }
      } catch (err) {
        console.warn("[Scenar] RevenueCat configure failed", err);
      } finally {
        lastRefreshRef.current = Date.now();
        if (run === runRef.current) {
          setReady(true);
          setSwitchingEnv(false);
        }
      }
    },
    [applyInfo, showMapped, loadPaywallOffering],
  );

  /* ------------------------------------------------------------ loading */

  const refresh = useCallback(async () => {
    lastRefreshRef.current = Date.now();
    if (demoMode) {
      await Promise.resolve();
      setStatus(readDemoStatus());
      setFetchedAt(new Date());
      return;
    }
    const run = runRef.current;
    const target = envRef.current;
    try {
      const purchases = await getPurchases();
      const info = await purchases.getCustomerInfo();
      if (run !== runRef.current) return;
      applyInfo(info, purchases, target);
    } catch (err) {
      console.warn("[Scenar] RevenueCat refresh failed", err);
    }
  }, [demoMode, applyInfo]);

  useEffect(() => {
    const run = ++runRef.current;

    async function init() {
      await Promise.resolve();
      if (run !== runRef.current) return;
      if (demoMode) {
        const id = getDemoAppUserId();
        setStatus(readDemoStatus());
        setPackages(DEMO_PACKAGES);
        setAppUserId(id);
        setLastPurchase(readLastPurchase("demo"));
        setFetchedAt(new Date());
        setOfferingMeta({ offeringId: "demo", placementId: null });
        // No RevenueCat customer exists in demo mode, so the server gets no user to verify.
        setIdentity({ appUserId: null, env: "sandbox" });
        setReady(true);
        return;
      }
      const target = readStoredEnv();
      envRef.current = target;
      setEnvState(target);
      setIdentity({ appUserId: null, env: target });
      await loadEnv(target, run);
    }

    void init();
    const runs = runRef; // a counter, not a DOM node: bump it so this run's async work is dropped
    return () => {
      runs.current++;
    };
  }, [demoMode, loadEnv]);

  // Re-check entitlements when the tab regains focus (e.g. after managing the
  // subscription in another tab or finishing a checkout redirect).
  useEffect(() => {
    function onFocus() {
      if (purchasingRef.current) return;
      if (Date.now() - lastRefreshRef.current < FOCUS_REFRESH_MIN_MS) return;
      void refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  /* -------------------------------------------------------- environment */

  const setEnv = useCallback(
    async (next: BillingEnv) => {
      if (demoMode) return;
      if (next === "live" && !liveAvailable) {
        console.warn("[Scenar] Live payments are not configured (NEXT_PUBLIC_REVENUECAT_LIVE_API_KEY).");
        return;
      }
      if (purchasingRef.current) return; // never swap keys under an open checkout
      if (next === envRef.current) return;

      const run = ++runRef.current;
      paywallRunRef.current++;
      envRef.current = next;
      writeStoredEnv(next);
      setEnvState(next);
      setSwitchingEnv(true);
      setReady(false);
      setError(null);
      // Drop the other environment's entitlement immediately so Pro never "leaks" across.
      setStatus({ ...EMPTY_STATUS, isSandbox: next === "sandbox" });
      setAppUserId(null);
      setFetchedAt(null);
      setLastPurchase(null);
      setIdentity({ appUserId: null, env: next });
      await loadEnv(next, run);
    },
    [demoMode, liveAvailable, loadEnv],
  );

  /* ------------------------------------------------------------ account */

  const changeUser = useCallback(
    async (raw: string): Promise<boolean> => {
      const id = raw.trim();
      const invalid = validateAppUserId(id);
      if (invalid) throw new Error(invalid);
      if (demoMode) {
        throw new Error("Demo billing is local to this browser - add a RevenueCat key to restore access.");
      }
      if (purchasingRef.current) throw new Error("Finish the current checkout first.");

      const run = runRef.current;
      const target = envRef.current;
      const purchases = await getPurchases();
      let info: CustomerInfo;
      try {
        info = await purchases.changeUser(id);
      } catch (err) {
        const sdk = await loadSdk();
        throw new Error(describePurchaseError(sdk, err), { cause: err });
      }
      const next = readProStatus(info, purchases.isSandbox());
      if (run !== runRef.current) return next.isPro; // environment changed meanwhile

      storeAppUserId(target, id);
      // The last purchase recorded in this browser belonged to the previous user.
      writeLastPurchase(target, null);
      setLastPurchase(null);
      applyInfo(info, purchases, target);

      // Offerings can be targeted per customer: reload the default offering for the new user.
      try {
        const offerings = await purchases.getOfferings();
        if (run === runRef.current) {
          currentOfferingRef.current = offerings.current;
          currentMappedRef.current = mapOffering(offerings.current);
          if (!paywallOpenRef.current) {
            showMapped(currentMappedRef.current, offerings.current);
            setOfferingMeta({ offeringId: offerings.current?.identifier ?? null, placementId: null });
          }
        }
      } catch (err) {
        console.warn("[Scenar] getOfferings after changeUser failed", err);
      }
      return next.isPro;
    },
    [demoMode, applyInfo, showMapped],
  );

  /* ------------------------------------------------------------ paywall */

  const openPaywall = useCallback(
    (reason: PaywallReason) => {
      reasonRef.current = reason;
      paywallOpenRef.current = true;
      setPaywallReason(reason);
      setError(null);
      setPaywallOpen(true);
      if (!demoMode) void loadPaywallOffering(reason);
    },
    [demoMode, loadPaywallOffering],
  );

  const closePaywall = useCallback(() => {
    if (purchasingRef.current) return;
    paywallOpenRef.current = false;
    paywallRunRef.current++;
    setPaywallOpen(false);
    setPaywallReason(null);
    setError(null);
    // Outside the paywall, `packages` reflects the default (current) offering again.
    if (!demoMode) {
      placementRef.current = null;
      showMapped(currentMappedRef.current, currentOfferingRef.current);
    }
  }, [demoMode, showMapped]);

  const clearError = useCallback(() => setError(null), []);

  /* ----------------------------------------------------------- purchase */

  const purchase = useCallback(
    async (packageId: string): Promise<boolean> => {
      if (purchasingRef.current) return false;
      purchasingRef.current = true;
      setError(null);
      const reason = reasonRef.current ?? "manual";
      try {
        if (demoMode) {
          const next = await demoPurchase(packageId);
          const rec: LastPurchase = {
            productId: DEMO_PRODUCT_IDS[packageId] ?? packageId,
            paywallReason: reason,
            at: new Date(),
          };
          writeLastPurchase("demo", rec);
          setLastPurchase(rec);
          setStatus(next);
          setFetchedAt(new Date());
          return next.isPro;
        }

        const rcPackage = sdkPackages.current.get(packageId);
        if (!rcPackage) throw new Error("That plan isn't available right now.");
        const target = envRef.current;
        const [purchases, sdk] = await Promise.all([getPurchases(), loadSdk()]);
        try {
          const { customerInfo } = await purchases.purchase({
            rcPackage,
            skipSuccessPage: true, // our own success moment takes over
            metadata: {
              paywall_reason: reason,
              placement_id: placementRef.current,
              offering_id: shownOfferingRef.current?.identifier ?? null,
              billing_env: target,
            },
            // Match Scenar's monochrome design system in RevenueCat's checkout.
            brandingAppearanceOverride: {
              color_buttons_primary: "#0a0a0a",
              color_accent: "#0a0a0a",
              shapes: "pill",
            },
          });
          const rec: LastPurchase = {
            productId: rcPackage.product.identifier,
            paywallReason: reason,
            at: new Date(),
          };
          writeLastPurchase(target, rec);
          setLastPurchase(rec);
          applyInfo(customerInfo, purchases, target);
          const next = readProStatus(customerInfo, purchases.isSandbox());
          if (!next.isPro) {
            throw new Error(
              "Payment went through, but Pro isn't active yet. Check that the product is attached to the scenar_pro entitlement.",
            );
          }
          return true;
        } catch (err) {
          if (isUserCancelled(sdk, err)) return false;
          throw new Error(describePurchaseError(sdk, err), { cause: err });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        throw err;
      } finally {
        purchasingRef.current = false;
      }
    },
    [demoMode, applyInfo],
  );

  const resetDemo = useCallback(() => {
    if (!demoMode) return;
    resetDemoStatus();
    setStatus(readDemoStatus());
    setLastPurchase(null);
  }, [demoMode]);

  /* -------------------------------------------------------------- value */

  const snapshot = useMemo<BillingSnapshot>(() => {
    const key = demoMode ? "" : keyForEnv(env);
    return {
      env: demoMode ? "sandbox" : env,
      keyKind: demoMode ? "demo" : keyKindOf(key),
      maskedKey: maskKey(key),
      appUserId,
      offeringId: offeringMeta.offeringId,
      placementId: offeringMeta.placementId,
      activeEntitlements: status.activeEntitlements,
      productId: status.productId,
      periodType: status.periodType,
      willRenew: status.willRenew,
      purchaseDate: status.purchaseDate,
      expiresAt: status.expiresAt,
      managementUrl: status.managementUrl,
      lastPurchase,
      fetchedAt,
    };
  }, [demoMode, env, appUserId, offeringMeta, status, lastPurchase, fetchedAt]);

  const value = useMemo<EntitlementInternals>(
    () => ({
      ready,
      isPro: status.isPro,
      isTrial: status.isTrial,
      isSandbox: status.isSandbox,
      demoMode,
      expiresAt: status.expiresAt,
      packages,
      paywallOpen,
      paywallReason,
      openPaywall,
      closePaywall,
      purchase,
      refresh,
      resetDemo,
      env: demoMode ? "sandbox" : env,
      liveAvailable,
      setEnv,
      appUserId,
      snapshot,
      changeUser,
      error,
      clearError,
      managementUrl: status.managementUrl,
      switchingEnv,
    }),
    [
      ready,
      status,
      demoMode,
      packages,
      paywallOpen,
      paywallReason,
      openPaywall,
      closePaywall,
      purchase,
      refresh,
      resetDemo,
      env,
      liveAvailable,
      setEnv,
      appUserId,
      snapshot,
      changeUser,
      error,
      clearError,
      switchingEnv,
    ],
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
      {paywallOpen ? <Paywall /> : null}
    </EntitlementContext.Provider>
  );
}

function useInternals(): EntitlementInternals {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error("useEntitlements must be used inside <EntitlementProvider>.");
  return ctx;
}

/** Live RevenueCat entitlement state + paywall controls. */
export function useEntitlements(): EntitlementState {
  return useInternals();
}

/** Internal: exposes error + management URL to the Paywall and ProBadge. */
export function useEntitlementInternals(): EntitlementInternals {
  return useInternals();
}
