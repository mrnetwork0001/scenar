"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBook,
  IconCard,
  IconGrid,
  IconInspect,
  IconKey,
  IconPlus,
  IconPro,
  IconPulse,
  IconTrendUp,
  IconWand,
  type ScenarIcon,
} from "@/components/icons";
import { useHistory } from "@/lib/history";
import { openInspector } from "@/lib/inspector";
import { timeLeft } from "@/lib/revenuecat";
import { EnvironmentSwitch } from "./EnvironmentSwitch";
import { useEntitlementInternals } from "./EntitlementProvider";
import { LogoMark } from "./LogoMark";
import { ScrollLink } from "./ScrollLink";
import { useNow } from "./useNow";
import styles from "./MobileSheet.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;
export const SHEET_ENV_ID = "sheet-billing-env";

interface Row {
  href: string;
  label: string;
  hint: string;
  icon: ScenarIcon;
  pro?: boolean;
  needsHistory?: boolean;
}

const ROWS: Row[] = [
  { href: "/app", label: "Launch app", hint: "Pick a conversation", icon: IconGrid },
  { href: "/custom", label: "Build your own", hint: "Any scenario, your words", icon: IconWand, pro: true },
  { href: "/app#progress", label: "Your progress", hint: "Scores & streak", icon: IconTrendUp, needsHistory: true },
  { href: "/#how", label: "How it works", hint: "See a live demo", icon: IconPulse },
  { href: "/#pricing", label: "Pricing", hint: "Free & Pro plans", icon: IconCard },
  { href: "/#faq", label: "FAQ", hint: "Common questions", icon: IconBook },
  { href: "/account", label: "Account & billing", hint: "Plan, restore, receipts", icon: IconKey },
];

/**
 * Full-screen control centre that the Menu pill opens below 768px: plan, billing environment,
 * navigation and a sticky primary action. Mounted by NavMenu inside AnimatePresence.
 */
export function MobileSheet({
  id,
  reduce,
  onClose,
  onNavigate,
}: {
  id: string;
  reduce: boolean;
  /** Close and hand focus back to the Menu pill. */
  onClose: () => void;
  /** Close without moving focus (a navigation or another surface takes over). */
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const history = useHistory();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const inApp = /^\/(app|play|custom)(\/|$)/.test(pathname);
  const onAppHome = pathname === "/app";
  const rows = ROWS.filter((r) => !r.needsHistory || history.length > 0);

  // Focus the close pill once the sheet is on screen.
  useEffect(() => {
    const raf = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, []);

  function trap(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !sheetRef.current) return;
    const items = Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const rowMotion = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.1 + i * 0.035 } },
        };

  return (
    <motion.div
      ref={sheetRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={styles.sheet}
      onKeyDown={trap}
      initial={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
      animate={
        reduce
          ? { opacity: 1, transition: { duration: 0.2 } }
          : { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.6, ease: EASE } }
      }
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.42, ease: EASE } }
      }
    >
      <h2 id={titleId} className={styles.srOnly}>
        Menu
      </h2>

      {/* Mirrors the nav's left cluster so the Menu pill appears to turn into Close. */}
      <div className={styles.top}>
        <Link href="/" className={styles.brand} aria-label="Scenar home" onClick={onNavigate}>
          <LogoMark size={28} />
        </Link>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose}>
          <span className={styles.closeIcon} aria-hidden="true">
            <IconPlus size={12} strokeWidth={3} />
          </span>
          <span className={styles.closeLabel}>Close</span>
        </button>
      </div>

      <div className={styles.body}>
        <motion.div {...rowMotion(0)}>
          <PlanCard onNavigate={onNavigate} />
        </motion.div>

        <motion.section
          id={SHEET_ENV_ID}
          className={styles.section}
          aria-labelledby={`${SHEET_ENV_ID}-h`}
          {...rowMotion(1)}
        >
          <EnvSection />
        </motion.section>

        <nav aria-label="Site" className={styles.section}>
          <motion.h3 className={styles.heading} {...rowMotion(2)}>
            Go to
          </motion.h3>
          <ul className={styles.list}>
            {rows.map((r, i) => {
              const Icon = r.icon;
              return (
                <motion.li key={r.href} {...rowMotion(3 + i)}>
                  <ScrollLink
                    href={r.href}
                    className={styles.row}
                    aria-current={r.href === pathname ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span className={styles.rowIcon} aria-hidden="true">
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowLabel}>
                        {r.label}
                        {r.pro ? <span className={styles.proTag}>Pro</span> : null}
                      </span>
                      <span className={styles.rowHint}>{r.hint}</span>
                    </span>
                    <span className={styles.chevron} aria-hidden="true">
                      <IconArrowRight size={14} strokeWidth={2} />
                    </span>
                  </ScrollLink>
                </motion.li>
              );
            })}
            <motion.li className={styles.divided} {...rowMotion(3 + rows.length)}>
              <button
                type="button"
                className={styles.row}
                onClick={() => {
                  onNavigate();
                  openInspector("open");
                }}
              >
                <span className={styles.rowIcon} aria-hidden="true">
                  <IconInspect size={16} strokeWidth={2} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowLabel}>RevenueCat inspector</span>
                  <span className={styles.rowHint}>Live SDK state & events</span>
                </span>
                <span className={styles.chevron} aria-hidden="true">
                  <IconArrowRight size={14} strokeWidth={2} />
                </span>
              </button>
            </motion.li>
          </ul>
        </nav>
      </div>

      {onAppHome ? null : (
        <motion.div
          className={styles.footer}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: reduce ? 0 : 0.2 } }}
        >
          <Link href="/app" className={styles.cta} onClick={onNavigate}>
            {inApp ? (
              <>
                <span className={`${styles.ctaIcon} ${styles.ctaIconBack}`} aria-hidden="true">
                  <IconArrowRight size={14} strokeWidth={2.5} />
                </span>
                Back to scenarios
              </>
            ) : (
              <>
                Launch app
                <span className={styles.ctaIcon} aria-hidden="true">
                  <IconArrowUpRight size={14} strokeWidth={2.5} />
                </span>
              </>
            )}
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

/** Black inverse card: current plan plus the one action that matters for it. */
function PlanCard({ onNavigate }: { onNavigate: () => void }) {
  const { ready, isPro, isTrial, expiresAt, env, openPaywall } = useEntitlementInternals();
  // Same helper and cadence as ProBadge so both read identically.
  const now = useNow(30_000, isTrial);
  const left = isTrial ? timeLeft(expiresAt, now) : null;

  const envChip = (
    <a
      href={`#${SHEET_ENV_ID}`}
      className={styles.envChip}
      data-env={env}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(SHEET_ENV_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <span className={styles.envChipDot} aria-hidden="true" />
      {env === "live" ? "Live" : "Sandbox"}
      <span className={styles.srOnly}> billing environment, change it below</span>
    </a>
  );

  if (!ready) {
    return (
      <div className={`${styles.plan} ${styles.planLoading}`} aria-busy="true">
        <div className={styles.planHead}>
          <span className={styles.planEyebrow}>Your plan</span>
          {envChip}
        </div>
        <div className={styles.planRow}>
          <span className={styles.planSkeleton} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.plan}>
      <div className={styles.planHead}>
        <span className={styles.planEyebrow}>Your plan</span>
        {envChip}
      </div>
      <div className={styles.planRow}>
        <div className={styles.planName}>
          <span className={styles.planIcon} aria-hidden="true">
            {isPro ? <IconPro size={14} strokeWidth={2.25} /> : <IconGrid size={14} strokeWidth={2} />}
          </span>
          <span className={styles.planTitle}>
            {isPro ? "Pro" : "Free"}
            {isTrial ? (
              <span className={styles.planMeta}>
                {" "}
                · Trial{left ? ` · ${left.short}` : ""}
              </span>
            ) : null}
          </span>
        </div>
        {isPro ? (
          <Link href="/account" className={styles.planAction} onClick={onNavigate}>
            Manage
          </Link>
        ) : (
          <button
            type="button"
            className={styles.planAction}
            onClick={() => {
              onNavigate();
              openPaywall("manual");
            }}
          >
            Upgrade
          </button>
        )}
      </div>
      <p className={styles.planNote}>
        {isPro
          ? isTrial
            ? left
              ? `Every scenario unlocked. Trial ends in ${left.long}.`
              : "Every scenario unlocked."
            : "Every scenario and the full coaching report."
          : "Starter scenarios. Upgrade for every scenario and the full report."}
      </p>
    </div>
  );
}

function EnvSection() {
  const { env, liveAvailable, demoMode } = useEntitlementInternals();
  const caption =
    env === "live" ? "Real payments through Stripe. Cancel anytime." : "Test purchases, no card, no charge.";
  const liveMissing = env !== "live" && (!liveAvailable || demoMode);
  return (
    <>
      <h3 id={`${SHEET_ENV_ID}-h`} className={styles.heading}>
        Billing environment
      </h3>
      <div className={styles.envWrap}>
        <EnvironmentSwitch size="md" className={styles.envSwitch} />
      </div>
      <p className={styles.caption} data-env={env}>
        {caption}
      </p>
      {liveMissing ? (
        <p className={styles.captionNote}>Live payments aren&apos;t configured on this deployment yet.</p>
      ) : null}
    </>
  );
}
