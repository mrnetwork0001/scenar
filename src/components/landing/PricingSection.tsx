"use client";

import { IconArrowRight, IconArrowUpRight, IconCheck, IconPro, IconZap } from "@/components/icons";
import { motion, useInView } from "motion/react";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { useEntitlements } from "@/components/EntitlementProvider";
import { EnvironmentSwitch } from "@/components/EnvironmentSwitch";
import { parsePrice } from "@/lib/revenuecat";
import type { PaywallPackage } from "@/lib/types";
import { SectionHeader, sectionStyles } from "./SectionHeader";
import styles from "./PricingSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

const FREE_FEATURES = [
  "2 scenarios: Negotiate Your First Offer and Say No to Your Manager",
  "Live tension meter and turn-by-turn scoring",
  "Report with the hidden truth revealed",
  "Progress tracking across attempts",
];

const PRO_FEATURES = [
  "Everything in Free",
  "All 5 scenarios",
  "Tactical line-by-line rewrites",
  "Voice mode",
  "Custom scenario builder",
];

/** Same comparison the Paywall uses: annual per-month vs monthly. */
function savingsPercent(packages: PaywallPackage[]): number | null {
  const monthly = packages.find((p) => p.kind === "monthly");
  const annual = packages.find((p) => p.kind === "annual");
  if (!monthly || !annual) return null;
  const monthlyPrice = parsePrice(monthly.price);
  const annualPerMonth =
    parsePrice(annual.pricePerMonth) ?? ((parsePrice(annual.price) ?? 0) / 12 || null);
  if (!monthlyPrice || !annualPerMonth) return null;
  const pct = Math.round((1 - annualPerMonth / monthlyPrice) * 100);
  return pct > 0 ? pct : null;
}

/* Floating, monochrome price-tag outlines. Positions are % of the section. */
const TAGS: { x: number; y: number; s: number; r: number; d: number; m?: boolean }[] = [
  { x: 56, y: 15, s: 0.9, r: -16, d: 0 },
  { x: 93, y: 7, s: 0.75, r: 22, d: 3 },
  { x: 3, y: 58, s: 0.8, r: 12, d: 6, m: true },
  { x: 82, y: 94, s: 1, r: -8, d: 1.5, m: true },
  { x: 30, y: 95, s: 0.7, r: 30, d: 4.5, m: true },
  { x: 97.5, y: 66, s: 0.85, r: -28, d: 7.5 },
];

function PriceTag() {
  return (
    <svg viewBox="0 0 64 36" width="64" height="36" fill="none">
      <path d="M14 1.5h42a6.5 6.5 0 0 1 6.5 6.5v20a6.5 6.5 0 0 1-6.5 6.5H14L1.5 18Z" />
      <circle cx="15" cy="18" r="3" />
      <path d="M26 14h24M26 22h14" />
    </svg>
  );
}

function PricingBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.spotWrap}>
        <div className={styles.spot} />
      </div>
      {TAGS.map((t, i) => (
        <span
          key={i}
          className={`${styles.floatTag} ${t.m ? "" : styles.desktopOnly}`}
          style={
            {
              left: `${t.x}%`,
              top: `${t.y}%`,
              "--s": t.s,
              "--r": `${t.r}deg`,
              "--d": `${t.d}s` } as CSSProperties
          }
        >
          <PriceTag />
        </span>
      ))}
    </div>
  );
}

function PlanRow({ pkg, savePct, index }: { pkg: PaywallPackage; savePct: number | null; index: number }) {
  // Only call annual "Best value" when it actually beats 12x the monthly price.
  const best = pkg.kind === "annual" && savePct !== null;
  return (
    <motion.li
      className={styles.plan}
      data-best={best || undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.08 * index }}
    >
      <div className={styles.planMain}>
        <span className={styles.planTitle}>{pkg.title}</span>
        <span className={styles.planBadges}>
          {best ? <span className={styles.bestBadge}>Best value</span> : null}
          {pkg.trialDays ? <span className={styles.trialBadge}>{pkg.trialDays}-day free trial</span> : null}
        </span>
      </div>
      <div className={styles.planPrice}>
        <span className={styles.planAmount}>
          {pkg.price}
          {pkg.periodLabel ? <small>{pkg.periodLabel}</small> : null}
        </span>
        {best && savePct ? (
          <span className={styles.planSub}>
            {pkg.pricePerMonth ? `${pkg.pricePerMonth}/mo · ` : ""}
            <b>Save {savePct}%</b>
          </span>
        ) : pkg.pricePerMonth && pkg.kind !== "monthly" ? (
          <span className={styles.planSub}>{pkg.pricePerMonth}/mo</span>
        ) : pkg.kind === "lifetime" ? (
          <span className={styles.planSub}>One-time purchase</span>
        ) : null}
      </div>
    </motion.li>
  );
}

export function PricingSection() {
  const { ready, isPro, isTrial, demoMode, isSandbox, packages, openPaywall } = useEntitlements();
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { amount: 0.1 });

  const savePct = savingsPercent(packages);
  const hasTrial = packages.some((p) => p.trialDays);
  const ctaLabel = hasTrial ? "Start free trial" : "Go Pro";

  return (
    <section
      ref={rootRef}
      id="pricing"
      className={`${sectionStyles.section} ${styles.section}`}
      aria-labelledby="pricing-title"
      data-anim={(inView && !reduce) || undefined}
    >
      <PricingBackdrop />

      <div className={sectionStyles.inner}>
        <SectionHeader
          id="pricing"
          eyebrow="Pricing"
          title="Start free. Go Pro when it counts."
          sub="Two full scenarios are free, with no sign-up and no card. Pro unlocks every rehearsal tool, billed through RevenueCat."
        />

        <div className={styles.grid}>
          {/* --- Free --- */}
          <motion.article
            className={styles.free}
            aria-labelledby="plan-free"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <header className={styles.cardHead}>
              <h3 id="plan-free" className={styles.cardName}>
                Free
              </h3>
              <span className="tag">No sign-up</span>
            </header>
            <p className={styles.freePrice}>
              <span className={styles.amount}>$0</span>
              <span className={styles.amountNote}>No card needed</span>
            </p>
            <ul className={styles.features}>
              {FREE_FEATURES.map((f) => (
                <li key={f}>
                  <span className={styles.check}>
                    <IconCheck size={10} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/app" className={`btn btn-ghost ${styles.cardCta}`}>
              Start free
              <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </motion.article>

          {/* --- Pro --- */}
          <motion.article
            className={styles.pro}
            aria-labelledby="plan-pro"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.12 }}
          >
            <div className={styles.sheen} aria-hidden="true" />
            <header className={styles.cardHead}>
              <h3 id="plan-pro" className={styles.cardName}>
                Pro
              </h3>
              <span className={styles.entitlement} title="RevenueCat entitlement identifier">
                entitlement · scenar_pro
              </span>
            </header>

            <div className={styles.proBody}>
              <div className={styles.featuresCol}>
                <ul className={`${styles.features} ${styles.featuresInverse}`}>
                  {PRO_FEATURES.map((f) => (
                    <li key={f}>
                      <span className={styles.check}>
                        <IconCheck size={10} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className={styles.unlockNote}>
                  <IconZap size={13} strokeWidth={2} aria-hidden="true" />
                  <span>
                    Unlocks the moment checkout completes. No account needed: access is tied to an
                    anonymous RevenueCat ID.
                  </span>
                </p>
              </div>

              <div className={styles.plansCol}>
                {isPro ? (
                  <div className={styles.proState} role="status">
                    <span className={styles.crown}>
                      <IconPro size={16} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <div>
                      <p className={styles.proStateTitle}>You&apos;re Pro</p>
                      <p className={styles.proStateSub}>
                        {isTrial
                          ? "Your free trial is active. Every scenario and tool is unlocked."
                          : "Every scenario and tool is unlocked."}
                      </p>
                    </div>
                  </div>
                ) : !ready ? (
                  <ul className={styles.skeleton} role="status" aria-label="Loading plans">
                    <li />
                    <li />
                    <li />
                  </ul>
                ) : packages.length === 0 ? (
                  <p className={styles.empty} role="status">
                    Plans are unavailable right now. They load live from RevenueCat, so check back
                    in a moment.
                  </p>
                ) : (
                  <ul className={styles.plans} aria-label="Pro plans">
                    {packages.map((p, i) => (
                      <PlanRow key={p.id} pkg={p} savePct={savePct} index={i} />
                    ))}
                  </ul>
                )}

                {isPro ? (
                  <Link href="/app" className={`btn ${styles.ctaWhite}`}>
                    Keep practicing
                    <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`btn ${styles.ctaWhite}`}
                    onClick={() => openPaywall("manual")}
                    disabled={!ready}
                  >
                    {ctaLabel}
                    <IconArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
                <p className={styles.fine}>Cancel anytime · Secure checkout by RevenueCat Web Billing</p>
              </div>
            </div>
          </motion.article>
        </div>

        <motion.div
          className={styles.envBar}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -5% 0px" }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        >
          <div className={styles.envText}>
            <p className={styles.live}>
              <span className={styles.liveDot} aria-hidden="true" />
              Plans and prices are served live by RevenueCat
              {demoMode ? (
                <span className={`${styles.pill} ${styles.pillDemo}`}>Demo billing</span>
              ) : isSandbox ? (
                <span className={`${styles.pill} ${styles.pillSandbox}`}>Sandbox</span>
              ) : null}
            </p>
            <p className={styles.envCaption}>
              Judges: try everything in Sandbox with test purchases, or switch to Live for real
              payments.
            </p>
          </div>
          <EnvironmentSwitch size="md" className={styles.envSwitch} />
        </motion.div>
      </div>
    </section>
  );
}
