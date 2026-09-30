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
import type { Offering, Package } from "@revenuecat/purchases-js";
import {
  DEMO_PACKAGES,
  demoPurchase,
  describePurchaseError,
  getPurchases,
  isDemoBilling,
  isUserCancelled,
  loadSdk,
  mapOffering,
  readDemoStatus,
  readProStatus,
  resetDemoStatus,
  type ProStatus,
} from "@/lib/revenuecat";
import type { EntitlementState, PaywallPackage, PaywallReason } from "@/lib/types";
import { Paywall } from "./Paywall";

/** Extra state used by the Paywall / ProBadge, not part of the public contract. */
export interface EntitlementInternals extends EntitlementState {
  error: string | null;
  clearError: () => void;
  managementUrl: string | null;
}

const EntitlementContext = createContext<EntitlementInternals | null>(null);

const EMPTY_STATUS: ProStatus = {
  isPro: false,
  isTrial: false,
  isSandbox: false,
  expiresAt: null,
  managementUrl: null,
};

const FOCUS_REFRESH_MIN_MS = 5000;

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const demoMode = isDemoBilling();

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<ProStatus>(EMPTY_STATUS);
  const [packages, setPackages] = useState<PaywallPackage[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sdkPackages = useRef<Map<string, Package>>(new Map());
  const offeringRef = useRef<Offering | null>(null);
  const reasonRef = useRef<PaywallReason | null>(null);
  const purchasingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  /* ------------------------------------------------------------ loading */

  const refresh = useCallback(async () => {
    lastRefreshRef.current = Date.now();
    if (demoMode) {
      await Promise.resolve();
      setStatus(readDemoStatus());
      return;
    }
    try {
      const purchases = await getPurchases();
      const info = await purchases.getCustomerInfo();
      setStatus(readProStatus(info, purchases.isSandbox()));
    } catch (err) {
      console.warn("[Scenar] RevenueCat refresh failed", err);
    }
  }, [demoMode]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (demoMode) {
        await Promise.resolve();
        if (cancelled) return;
        setStatus(readDemoStatus());
        setPackages(DEMO_PACKAGES);
        setReady(true);
        return;
      }
      try {
        const purchases = await getPurchases();
        const [infoResult, offeringsResult] = await Promise.allSettled([
          purchases.getCustomerInfo(),
          purchases.getOfferings(),
        ]);
        if (cancelled) return;

        if (infoResult.status === "fulfilled") {
          setStatus(readProStatus(infoResult.value, purchases.isSandbox()));
        } else {
          console.warn("[Scenar] getCustomerInfo failed", infoResult.reason);
          setStatus({ ...EMPTY_STATUS, isSandbox: purchases.isSandbox() });
        }

        if (offeringsResult.status === "fulfilled") {
          const current = offeringsResult.value.current;
          offeringRef.current = current;
          const mapped = mapOffering(current);
          sdkPackages.current = mapped.byId;
          setPackages(mapped.packages);
          if (!current) {
            console.warn(
              "[Scenar] No current offering — set an offering as Current in the RevenueCat dashboard.",
            );
          }
        } else {
          console.warn("[Scenar] getOfferings failed", offeringsResult.reason);
        }
      } catch (err) {
        console.warn("[Scenar] RevenueCat configure failed", err);
      } finally {
        lastRefreshRef.current = Date.now();
        if (!cancelled) setReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

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

  /* ------------------------------------------------------------ paywall */

  const openPaywall = useCallback(
    (reason: PaywallReason) => {
      reasonRef.current = reason;
      setPaywallReason(reason);
      setError(null);
      setPaywallOpen(true);
      if (!demoMode) {
        // Attribute this custom paywall impression to the current offering in RevenueCat.
        void getPurchases()
          .then((p) =>
            p.trackCustomPaywallImpression({
              paywallId: `scenar-${reason}`,
              offering: offeringRef.current ?? undefined,
            }),
          )
          .catch(() => undefined);
      }
    },
    [demoMode],
  );

  const closePaywall = useCallback(() => {
    if (purchasingRef.current) return;
    setPaywallOpen(false);
    setPaywallReason(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /* ----------------------------------------------------------- purchase */

  const purchase = useCallback(
    async (packageId: string): Promise<boolean> => {
      if (purchasingRef.current) return false;
      purchasingRef.current = true;
      setError(null);
      try {
        if (demoMode) {
          const next = await demoPurchase(packageId);
          setStatus(next);
          return next.isPro;
        }

        const rcPackage = sdkPackages.current.get(packageId);
        if (!rcPackage) throw new Error("That plan isn't available right now.");
        const [purchases, sdk] = await Promise.all([getPurchases(), loadSdk()]);
        try {
          const { customerInfo } = await purchases.purchase({
            rcPackage,
            skipSuccessPage: true, // our own success moment takes over
            metadata: { paywall_reason: reasonRef.current ?? "manual" },
            brandingAppearanceOverride: {
              color_buttons_primary: "#7c5cff",
              color_accent: "#ff5c8a",
              shapes: "pill",
            },
          });
          const next = readProStatus(customerInfo, purchases.isSandbox());
          setStatus(next);
          lastRefreshRef.current = Date.now();
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
    [demoMode],
  );

  const resetDemo = useCallback(() => {
    if (!demoMode) return;
    resetDemoStatus();
    setStatus(readDemoStatus());
  }, [demoMode]);

  /* -------------------------------------------------------------- value */

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
      error,
      clearError,
      managementUrl: status.managementUrl,
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
      error,
      clearError,
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
