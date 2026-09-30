"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  IconAlert,
  IconArrowUpRight,
  IconCard,
  IconCheck,
  IconClock,
  IconClose,
  IconGrid,
  IconKey,
  IconPro,
  IconRetry,
  IconServer,
  IconAnonymous,
  IconWebhook,
  type ScenarIcon,
} from "@/components/icons";
import { EnvironmentSwitch } from "@/components/EnvironmentSwitch";
import { useEntitlements } from "@/components/EntitlementProvider";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";
import { useNow } from "@/components/useNow";
import { CopyButton } from "@/components/billing/CopyButton";
import { useServerEntitlement, useWebhookEvents } from "@/components/billing/useServerChecks";
import {
  KEY_KIND_LABEL,
  PAYWALL_REASON_LABEL,
  PERIOD_TYPE_LABEL,
  formatAgo,
  formatCountdown,
  formatDateTime,
  formatTime,
} from "@/lib/billingFormat";
import { INSPECTOR_EVENT, openInspector, type InspectorCommand } from "@/lib/inspector";
import { PRO_ENTITLEMENT } from "@/lib/types";
import styles from "./BillingInspector.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True when another modal (paywall, env confirm, RC checkout) is on screen above the inspector. */
function otherModalOpen(panel: HTMLElement | null): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]')).some(
    (el) => el !== panel && !panel?.contains(el) && el.getClientRects().length > 0,
  );
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: ScenarIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <header className={styles.sectionHead}>
        <span className={styles.sectionIcon} aria-hidden="true">
          <Icon size={13} strokeWidth={2} />
        </span>
        <h3 id={id} className={styles.sectionTitle}>
          {title}
        </h3>
        {action ? <span className={styles.sectionAction}>{action}</span> : null}
      </header>
      {children}
    </section>
  );
}

function Row({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd className={`${styles.rowValue} ${mono ? styles.mono : ""}`}>{children}</dd>
    </div>
  );
}

function Null() {
  return <span className={styles.null}>null</span>;
}

function Bool({ value }: { value: boolean | null }) {
  if (value === null) return <Null />;
  return <span className={value ? styles.true : styles.false}>{String(value)}</span>;
}

function Status({ tone, icon: Icon, children }: { tone: "good" | "warn" | "bad" | "muted"; icon?: ScenarIcon; children: ReactNode }) {
  return (
    <span className={`${styles.status} ${styles[tone]}`}>
      {Icon ? <Icon size={12} strokeWidth={2.5} aria-hidden="true" /> : <span className={styles.statusDot} aria-hidden="true" />}
      {children}
    </span>
  );
}

function SmallButton({
  onClick,
  busy,
  label,
}: {
  onClick: () => void;
  busy?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.smallBtn} ${busy ? styles.spinning : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={busy}
    >
      <IconRetry size={12} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

function InspectorPanel({ onClose, panelRef }: { onClose: () => void; panelRef: RefObject<HTMLDivElement | null> }) {
  const ent = useEntitlements();
  const reduce = useSafeReducedMotion();
  const { snapshot, packages, isPro, isTrial, demoMode, liveAvailable, ready } = ent;
  const now = useNow(1000);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const identityKey = `${snapshot.env}:${snapshot.appUserId ?? ""}:${snapshot.fetchedAt?.getTime() ?? 0}`;
  const { check, loading: checking, recheck } = useServerEntitlement(ready, identityKey);
  const { events, loading: eventsLoading, reload } = useWebhookEvents(ready, snapshot.appUserId, identityKey);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  async function refreshAll() {
    setRefreshing(true);
    try {
      await ent.refresh();
    } finally {
      setRefreshing(false);
    }
    void recheck(true);
    void reload();
  }

  const proActive = snapshot.activeEntitlements.includes(PRO_ENTITLEMENT) || isPro;
  const countdown = formatCountdown(snapshot.expiresAt, now);

  // Server verification verdict (icons, never glyphs).
  const server = check.state === "ok" ? check.data : null;
  let verdict: ReactNode;
  if (check.state === "error") {
    verdict = (
      <Status tone="bad" icon={IconAlert}>
        Unreachable
      </Status>
    );
  } else if (!server) {
    verdict = <Status tone="muted">Checking…</Status>;
  } else if (server.mode === "demo") {
    verdict = <Status tone="warn">Demo billing · not verified</Status>;
  } else if (!server.verified) {
    verdict = (
      <Status tone="warn" icon={IconAlert}>
        Unverifiable
      </Status>
    );
  } else if (server.pro) {
    verdict = (
      <Status tone="good" icon={IconCheck}>
        Server agrees: Pro
      </Status>
    );
  } else {
    verdict = (
      <Status tone="muted" icon={IconClose}>
        Not Pro
      </Status>
    );
  }
  const mismatch = !!server && server.verified && server.pro !== proActive && ready;

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={styles.panel}
      initial={reduce ? { opacity: 0 } : { x: "100%" }}
      animate={reduce ? { opacity: 1 } : { x: 0 }}
      exit={reduce ? { opacity: 0 } : { x: "100%" }}
      transition={{ duration: reduce ? 0.15 : 0.55, ease: EASE }}
      onKeyDown={(e) => {
        if (e.key !== "Tab" || !panelRef.current) return;
        const f = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.getClientRects().length > 0);
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <header className={styles.head}>
        <span className={styles.mark} aria-hidden="true">
          RC
        </span>
        <div className={styles.headText}>
          <h2 id={titleId} className={styles.title}>
            RevenueCat inspector
          </h2>
          <p className={styles.sub}>
            Live SDK state for this browser <kbd className={styles.kbd}>⇧ I</kbd>
          </p>
        </div>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close inspector">
          <IconClose size={14} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.body}>
        {/* Environment */}
        <Section icon={IconKey} title="Environment">
          <div className={styles.envSwitch}>
            <EnvironmentSwitch size="md" />
          </div>
          <dl className={styles.rows}>
            <Row label="env">{snapshot.env}</Row>
            <Row label="key type">{KEY_KIND_LABEL[snapshot.keyKind]}</Row>
            <Row label="api key">{snapshot.maskedKey ?? <Null />}</Row>
            <Row label="live key">
              <Bool value={liveAvailable} />
            </Row>
          </dl>
          {demoMode ? (
            <p className={styles.note}>
              No RevenueCat key is configured, so purchases are simulated locally.
            </p>
          ) : null}
        </Section>

        {/* Customer */}
        <Section icon={IconAnonymous} title="Customer">
          <dl className={styles.rows}>
            <Row label="app user id">
              <span className={styles.idWrap}>
                <span className={styles.id} title={snapshot.appUserId ?? undefined}>
                  {snapshot.appUserId ?? <Null />}
                </span>
                <CopyButton value={snapshot.appUserId} label="Copy app user ID" />
              </span>
            </Row>
            <Row label="entitlements">
              {snapshot.activeEntitlements.length ? snapshot.activeEntitlements.join(", ") : <span className={styles.null}>[]</span>}
            </Row>
            <Row label="fetched">
              {snapshot.fetchedAt ? (
                <span title={formatDateTime(snapshot.fetchedAt)}>
                  {formatTime(snapshot.fetchedAt)} <span className={styles.dim}>· {formatAgo(snapshot.fetchedAt, now)}</span>
                </span>
              ) : (
                <Null />
              )}
            </Row>
          </dl>
        </Section>

        {/* Entitlement */}
        <Section
          icon={IconPro}
          title={`Entitlement · ${PRO_ENTITLEMENT}`}
          action={
            proActive ? (
              <Status tone="good">{isTrial ? "Active · trial" : "Active"}</Status>
            ) : (
              <Status tone="muted">Inactive</Status>
            )
          }
        >
          <dl className={styles.rows}>
            <Row label="periodType">{snapshot.periodType ? PERIOD_TYPE_LABEL[snapshot.periodType] : <Null />}</Row>
            <Row label="productId">{snapshot.productId ?? <Null />}</Row>
            <Row label="willRenew">
              <Bool value={snapshot.willRenew} />
            </Row>
            <Row label="purchaseDate">{snapshot.purchaseDate ? formatDateTime(snapshot.purchaseDate) : <Null />}</Row>
            <Row label="expiresAt">
              {snapshot.expiresAt ? (
                formatDateTime(snapshot.expiresAt)
              ) : proActive ? (
                "never (lifetime)"
              ) : (
                <Null />
              )}
            </Row>
          </dl>
          {snapshot.expiresAt ? (
            <div className={styles.countdown} role="timer" aria-live="off">
              <IconClock size={14} strokeWidth={2} aria-hidden="true" />
              <span className={styles.countdownLabel}>
                {snapshot.periodType === "trial" ? "Trial ends in" : snapshot.willRenew ? "Renews in" : "Expires in"}
              </span>
              <span className={styles.countdownValue}>{countdown ?? "expired"}</span>
            </div>
          ) : null}
        </Section>

        {/* Offering */}
        <Section icon={IconGrid} title="Offering">
          <dl className={styles.rows}>
            <Row label="offeringId">{snapshot.offeringId ?? <span className={styles.null}>current</span>}</Row>
            <Row label="placement">{snapshot.placementId ?? <span className={styles.null}>none yet</span>}</Row>
          </dl>
          {packages.length ? (
            <ul className={styles.packages}>
              {packages.map((p) => (
                <li key={p.id} className={styles.pkg}>
                  <span className={styles.pkgId}>{p.id}</span>
                  <span className={styles.pkgPrice}>
                    {p.price}
                    <span className={styles.dim}>{p.periodLabel}</span>
                  </span>
                  {p.trialDays ? <span className={styles.pkgTrial}>{p.trialDays}d trial</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.note}>{ready ? "No packages returned for this offering." : "Loading offering…"}</p>
          )}
        </Section>

        {/* Last purchase */}
        <Section icon={IconCard} title="Last purchase">
          {snapshot.lastPurchase ? (
            <dl className={styles.rows}>
              <Row label="productId">{snapshot.lastPurchase.productId}</Row>
              <Row label="paywall_reason">
                {snapshot.lastPurchase.paywallReason}{" "}
                <span className={styles.dim}>· {PAYWALL_REASON_LABEL[snapshot.lastPurchase.paywallReason]}</span>
              </Row>
              <Row label="at">
                {formatTime(snapshot.lastPurchase.at)} <span className={styles.dim}>· {formatAgo(snapshot.lastPurchase.at, now)}</span>
              </Row>
            </dl>
          ) : (
            <p className={styles.note}>No purchase in this session yet. The paywall reason is attached as purchase metadata.</p>
          )}
        </Section>

        {/* Server verification */}
        <Section
          icon={IconServer}
          title="Server verification"
          action={<SmallButton onClick={() => void recheck(true)} busy={checking} label="Re-check with server" />}
        >
          <div className={styles.verdict}>
            {verdict}
            {check.state === "ok" || check.state === "error" ? (
              <span className={styles.dim}>{formatAgo(check.at, now)}</span>
            ) : null}
          </div>
          {check.state === "ok" ? (
            <dl className={styles.rows}>
              <Row label="mode">{check.data.mode ?? <Null />}</Row>
              <Row label="env">{check.data.env ?? <Null />}</Row>
              {check.data.productId ? <Row label="productId">{check.data.productId}</Row> : null}
              {check.data.expiresAt ? <Row label="expiresAt">{formatDateTime(check.data.expiresAt)}</Row> : null}
              {check.data.reason ? <Row label="reason">{check.data.reason}</Row> : null}
            </dl>
          ) : check.state === "error" ? (
            <p className={styles.note}>GET /api/entitlement failed: {check.message}</p>
          ) : null}
          {mismatch ? (
            <p className={`${styles.note} ${styles.noteWarn}`}>
              The browser and the server disagree. Refresh from RevenueCat; if it persists the server may be
              caching or using a different environment.
            </p>
          ) : null}
          <p className={styles.note}>
            Pro-only API routes ask RevenueCat directly with a secret key, so unlocking in the browser alone
            is never enough.
          </p>
        </Section>

        {/* Webhook events */}
        <Section
          icon={IconWebhook}
          title="Webhook events"
          action={
            <SmallButton
              onClick={() => void reload()}
              busy={eventsLoading}
              label="Reload webhook events"
            />
          }
        >
          {events.state === "ok" && events.events.length > 0 ? (
            <ol className={styles.events}>
              {events.events.slice(0, 12).map((e) => (
                <li key={e.id} className={styles.event}>
                  <span className={styles.eventType}>{e.type}</span>
                  <span className={styles.eventMeta}>
                    {e.productId ?? "—"}
                    {e.environment ? ` · ${e.environment.toLowerCase()}` : ""}
                  </span>
                  <span className={styles.eventTime} title={formatDateTime(e.at)}>
                    {e.at ? formatAgo(e.at, now) : "—"}
                  </span>
                </li>
              ))}
            </ol>
          ) : events.state === "error" && events.status !== 404 ? (
            <p className={styles.note}>Could not load events ({events.message}).</p>
          ) : (
            <p className={styles.note}>
              {events.state === "loading" || events.state === "idle"
                ? "Loading…"
                : "No webhook events for this user yet. RevenueCat posts INITIAL_PURCHASE, RENEWAL, CANCELLATION and EXPIRATION events to the deployed URL, so they appear here a few seconds after a purchase on the live site (not on localhost)."}
            </p>
          )}
        </Section>
      </div>

      <footer className={styles.foot}>
        <button
          type="button"
          className={`btn btn-primary ${styles.footBtn}`}
          onClick={() => void refreshAll()}
          disabled={refreshing || !ready}
        >
          <IconRetry size={14} strokeWidth={2} aria-hidden="true" className={refreshing ? styles.spin : undefined} />
          {refreshing ? "Refreshing…" : "Refresh from RevenueCat"}
        </button>
        <Link href="/account" className={`btn btn-ghost ${styles.footBtn}`} onClick={onClose}>
          Account & billing
          <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </footer>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating chip                                                       */
/* ------------------------------------------------------------------ */

function InspectorChip({ hidden }: { hidden: boolean }) {
  const { env, isPro, ready } = useEntitlements();
  if (hidden) return null;
  return (
    <button
      type="button"
      className={styles.chip}
      onClick={() => openInspector("toggle")}
      aria-label="Open RevenueCat inspector (Shift+I)"
      title="RevenueCat inspector (Shift+I)"
    >
      <span className={styles.chipMark} aria-hidden="true">
        RC
      </span>
      <span className={styles.chipLabel}>
        <span className={`${styles.chipDot} ${ready && isPro ? styles.chipDotPro : ""}`} aria-hidden="true" />
        {env === "live" ? "Live" : "Sandbox"}
      </span>
      <kbd className={styles.chipKbd} aria-hidden="true">
        ⇧I
      </kbd>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

/** RevenueCat inspector: a right-hand drawer (Shift+I, the RC chip or Menu → RevenueCat inspector). */
export function BillingInspector() {
  const [open, setOpen] = useState(false);
  const { paywallOpen } = useEntitlements();
  const reduce = useSafeReducedMotion();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close on navigation (e.g. the "Account & billing" link).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const apply = useCallback((cmd: InspectorCommand) => {
    setOpen((o) => {
      const next = cmd === "toggle" ? !o : cmd === "open";
      if (next && !o) returnFocus.current = document.activeElement as HTMLElement | null;
      return next;
    });
  }, []);

  useEffect(() => {
    function onCommand(e: Event) {
      apply((e as CustomEvent<InspectorCommand>).detail ?? "toggle");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        if (e.defaultPrevented || otherModalOpen(panelRef.current)) return;
        setOpen(false);
        return;
      }
      if (
        e.shiftKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (e.key === "I" || e.key === "i") &&
        !e.repeat &&
        !isTypingTarget(e.target)
      ) {
        if (paywallOpen || otherModalOpen(panelRef.current)) return;
        e.preventDefault();
        apply("toggle");
      }
    }
    window.addEventListener(INSPECTOR_EVENT, onCommand);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(INSPECTOR_EVENT, onCommand);
      window.removeEventListener("keydown", onKey);
    };
  }, [apply, open, paywallOpen]);

  // Lock page scroll while open; hand focus back on close.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const back = returnFocus.current;
    return () => {
      html.style.overflow = prev;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, [open]);

  // The paywall takes over if it opens (e.g. "Upgrade" from elsewhere).
  if (paywallOpen && open) setOpen(false);

  const chipHidden = /^\/play(\/|$)/.test(pathname);

  return (
    <>
      <InspectorChip hidden={chipHidden} />
      <AnimatePresence>
        {open ? (
          <div className={styles.layer} key="inspector">
            <motion.div
              className={styles.backdrop}
              onClick={() => setOpen(false)}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.01 : 0.35, ease: EASE }}
            />
            <InspectorPanel onClose={() => setOpen(false)} panelRef={panelRef} />
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
