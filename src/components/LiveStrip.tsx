"use client";

import { useEntitlementInternals } from "./EntitlementProvider";
import styles from "./LiveStrip.module.css";

/**
 * Thin full-width safety strip under the nav whenever real payments are on. Not dismissible:
 * in Live every purchase charges a card. Rendered inside the fixed header; layout.module.css
 * grows --nav-h while it's present so it never covers content.
 */
export function LiveStrip() {
  const { env, setEnv, switchingEnv } = useEntitlementInternals();
  if (env !== "live") return null;
  return (
    <div className={styles.strip} data-live-strip role="region" aria-label="Live payments">
      <p className={styles.text}>
        <span className={styles.dot} aria-hidden="true" />
        <strong className={styles.strong}>Live payments</strong>
        <span className={styles.detail}>
          {" "}
          · real charges<span className={styles.via}> via Stripe</span>
        </span>
      </p>
      <button
        type="button"
        className={styles.switch}
        onClick={() => void setEnv("sandbox")}
        disabled={switchingEnv}
      >
        Switch to Sandbox
      </button>
    </div>
  );
}
