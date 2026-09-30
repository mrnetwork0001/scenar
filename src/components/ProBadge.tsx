"use client";

import { useState } from "react";
import { IconPro, IconRetry } from "@/components/icons";
import { daysUntil } from "@/lib/revenuecat";
import { useEntitlementInternals } from "./EntitlementProvider";
import styles from "./ProBadge.module.css";

/** Live entitlement status for the header: grey pill, black icon circle, label (hidden on mobile). */
export function ProBadge({ className }: { className?: string }) {
  const { ready, isPro, isTrial, demoMode, expiresAt, openPaywall, resetDemo } =
    useEntitlementInternals();
  const [now] = useState(() => Date.now());

  if (!ready) {
    return (
      <span className={`${styles.wrap} ${className ?? ""}`} aria-hidden="true">
        <span className={`${styles.badge} ${styles.loading}`}>
          <span className={styles.icon} />
        </span>
      </span>
    );
  }

  const daysLeft = isTrial ? daysUntil(expiresAt, now) : null;
  const statusText = isPro
    ? isTrial
      ? `Scenar Pro trial${daysLeft !== null ? `, ${daysLeft} days left` : ""}`
      : "Scenar Pro active"
    : "Free plan. Upgrade to Scenar Pro";

  return (
    <span className={`${styles.wrap} ${className ?? ""}`}>
      {demoMode && isPro ? (
        <button
          type="button"
          className={styles.reset}
          onClick={resetDemo}
          title="Reset demo purchase"
          aria-label="Reset demo purchase"
        >
          <IconRetry size={12} strokeWidth={2.5} aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className={`${styles.badge} ${isPro ? styles.pro : ""}`}
        onClick={() => openPaywall("manual")}
        title={statusText}
        aria-label={statusText}
      >
        <span className={styles.icon} aria-hidden="true">
          {isPro ? <IconPro size={13} strokeWidth={2.25} /> : <GridGlyph />}
        </span>
        <span className={styles.label} aria-hidden="true">
          {isPro ? (
            <>
              Pro
              {isTrial ? (
                <span className={styles.muted}>
                  {" "}
                  · Trial{daysLeft !== null ? ` · ${daysLeft}d` : ""}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className={styles.muted}>Free ·</span> Upgrade
            </>
          )}
        </span>
      </button>
    </span>
  );
}

/** 2×2 dot grid used for the free tier. */
function GridGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="3" cy="3" r="1.6" />
      <circle cx="9" cy="3" r="1.6" />
      <circle cx="3" cy="9" r="1.6" />
      <circle cx="9" cy="9" r="1.6" />
    </svg>
  );
}
