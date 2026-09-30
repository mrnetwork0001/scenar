"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  IconAlert,
  IconAnonymous,
  IconArrowRight,
  IconArrowUpRight,
  IconCard,
  IconCheck,
  IconClock,
  IconDevice,
  IconDoc,
  IconInspect,
  IconKey,
  IconPro,
  IconRetry,
  IconShield,
} from "@/components/icons";
import { EnvironmentSwitch } from "@/components/EnvironmentSwitch";
import { useEntitlements } from "@/components/EntitlementProvider";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";
import { useNow } from "@/components/useNow";
import { CopyButton } from "@/components/billing/CopyButton";
import { useServerEntitlement } from "@/components/billing/useServerChecks";
import { KEY_KIND_LABEL, formatDate, formatCountdown } from "@/lib/billingFormat";
import { openInspector } from "@/lib/inspector";
import { timeLeft } from "@/lib/revenuecat";
import styles from "./account.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

function Card({
  children,
  className,
  delay = 0,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  labelledBy: string;
}) {
  const reduce = useSafeReducedMotion();
  return (
    <motion.section
      aria-labelledby={labelledBy}
      className={`${styles.card} ${className ?? ""}`}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.section>
  );
}

function CardHead({ id, icon, title, aside }: { id: string; icon: ReactNode; title: string; aside?: ReactNode }) {
  return (
    <header className={styles.cardHead}>
      <span className={styles.cardIcon} aria-hidden="true">
        {icon}
      </span>
      <h2 id={id} className={styles.cardTitle}>
        {title}
      </h2>
      {aside ? <span className={styles.cardAside}>{aside}</span> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

function PlanCard() {
  const ent = useEntitlements();
  const { ready, isPro, isTrial, snapshot, packages, openPaywall, refresh, demoMode, env } = ent;
  const now = useNow(30_000);
  const headId = useId();
  const [refreshing, setRefreshing] = useState(false);

  const serverKey = `${snapshot.env}:${snapshot.appUserId ?? ""}:${snapshot.fetchedAt?.getTime() ?? 0}`;
  const { check } = useServerEntitlement(ready && isPro, serverKey);

  const expiresAt = snapshot.expiresAt;
  const lifetime = isPro && !expiresAt;
  const left = timeLeft(expiresAt, now);
  const plan = !ready ? "…" : isPro ? (isTrial ? "Pro · Trial" : "Pro") : "Free";
  const productTitle =
    packages.find((p) => snapshot.productId && p.id.includes(snapshot.productId))?.title ?? null;

  let dateLine: ReactNode = null;
  if (isPro) {
    if (lifetime) {
      dateLine = (
        <>
          <strong>Lifetime</strong> access. It never expires or renews.
        </>
      );
    } else if (isTrial) {
      dateLine = (
        <>
          Free trial ends on <strong>{formatDate(expiresAt)}</strong>
          {left ? <span className={styles.soft}> ({left.long} left)</span> : null}.{" "}
          {snapshot.willRenew === false
            ? "It won't convert, so you won't be charged."
            : "It then converts to the paid plan unless you cancel before."}
        </>
      );
    } else if (snapshot.willRenew === false) {
      dateLine = (
        <>
          Ends on <strong>{formatDate(expiresAt)}</strong>. Renewal is off, so you won&apos;t be charged
          again.
        </>
      );
    } else {
      dateLine = (
        <>
          Renews on <strong>{formatDate(expiresAt)}</strong>
          {left ? <span className={styles.soft}> (in {left.long})</span> : null}.
        </>
      );
    }
  }

  // Why there may be no management link.
  const noManageReason =
    snapshot.keyKind === "test-store" || demoMode
      ? "Test Store purchases have no management page. Sandbox subscriptions end on their own."
      : env === "live"
        ? "Available after your first live purchase."
        : "RevenueCat hasn't returned a management link yet. Refresh to try again.";

  async function doRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const countdown = isTrial ? formatCountdown(expiresAt, now) : null;
  const cheapest = packages.find((p) => p.kind === "monthly") ?? packages[0] ?? null;
  const trialDays = packages.find((p) => p.trialDays)?.trialDays ?? null;

  return (
    <Card labelledBy={headId} className={`${styles.plan} ${isPro ? styles.planPro : ""}`}>
      <div className={styles.planTop}>
        <p id={headId} className={styles.planLabel}>
          Current plan
        </p>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => void doRefresh()}
          disabled={refreshing || !ready}
          aria-label="Refresh status from RevenueCat"
          title="Refresh status from RevenueCat"
        >
          <IconRetry size={14} strokeWidth={2} aria-hidden="true" className={refreshing ? styles.spin : undefined} />
        </button>
      </div>

      <div className={styles.planNameRow}>
        {isPro ? (
          <span className={styles.planMark} aria-hidden="true">
            <IconPro size={20} strokeWidth={2} />
          </span>
        ) : null}
        <p className={styles.planName} aria-live="polite">
          {plan}
        </p>
        {isTrial && countdown ? (
          <span className={styles.trialPill}>
            <IconClock size={12} strokeWidth={2.25} aria-hidden="true" />
            {countdown}
          </span>
        ) : null}
      </div>

      {isPro ? (
        <dl className={styles.planFacts}>
          <div>
            <dt>Product</dt>
            <dd>
              {productTitle ? `${productTitle} · ` : ""}
              <span className={styles.mono}>{snapshot.productId ?? "-"}</span>
            </dd>
          </div>
          <div>
            <dt>Entitlement</dt>
            <dd className={styles.mono}>scenar_pro</dd>
          </div>
          {check.state === "ok" ? (
            <div>
              <dt>Server check</dt>
              <dd className={styles.verify}>
                {check.data.verified && check.data.pro ? (
                  <>
                    <IconCheck size={12} strokeWidth={3} aria-hidden="true" /> Verified with RevenueCat
                  </>
                ) : check.data.mode === "demo" ? (
                  "Demo billing (not verified)"
                ) : (
                  <>
                    <IconAlert size={12} strokeWidth={2.5} aria-hidden="true" /> Not confirmed yet
                  </>
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <>
          <p className={styles.planPitch}>
            Two scenarios, the live tension meter and the hidden-truth reveal are yours for free.
          </p>
          <ul className={styles.proList} aria-label="Pro adds">
            {["All 5 scenarios", "Tactical line-by-line rewrites", "Voice mode", "Custom scenario builder"].map((f) => (
              <li key={f}>
                <span className={styles.proCheck} aria-hidden="true">
                  <IconCheck size={10} strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {cheapest ? (
            <p className={styles.proFrom}>
              Pro from <strong>{cheapest.price}{cheapest.periodLabel}</strong>
              {trialDays ? ` · ${trialDays}-day free trial` : ""} · priced live by RevenueCat
            </p>
          ) : null}
        </>
      )}

      {dateLine ? <p className={styles.dateLine}>{dateLine}</p> : null}

      <div className={styles.planActions}>
        {!isPro ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openPaywall("manual")}
            disabled={!ready}
          >
            Upgrade to Pro
            <IconArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
        {isPro || snapshot.managementUrl ? (
          snapshot.managementUrl ? (
            <a
              href={snapshot.managementUrl}
              target="_blank"
              rel="noreferrer"
              className={`btn ${isPro ? styles.btnWhite : "btn-ghost"}`}
            >
              Manage or cancel subscription
              <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
            </a>
          ) : lifetime ? null : (
            <p className={styles.manageNone}>
              <IconAlert size={14} strokeWidth={2} aria-hidden="true" />
              <span>
                <strong>No management page.</strong> {noManageReason}
              </span>
            </p>
          )
        ) : null}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

function EnvironmentCard() {
  const { env, liveAvailable, snapshot, demoMode } = useEntitlements();
  const headId = useId();
  return (
    <Card labelledBy={headId} delay={0.08} className={styles.env}>
      <CardHead
        id={headId}
        icon={<IconKey size={14} strokeWidth={2} />}
        title="Billing environment"
        aside={<span className={styles.keyKind}>{KEY_KIND_LABEL[snapshot.keyKind]}</span>}
      />
      <div className={styles.envSwitch}>
        <EnvironmentSwitch size="md" />
      </div>
      <ul className={styles.envList}>
        <li className={env === "sandbox" ? styles.envActive : undefined}>
          <span className={styles.envName}>Sandbox</span>
          <span>
            Test purchases through RevenueCat. No card and no charge, and trials last minutes instead of
            days. Ideal for trying every Pro feature.
          </span>
        </li>
        <li className={env === "live" ? styles.envActive : undefined}>
          <span className={styles.envName}>Live</span>
          <span>
            Real payments through RevenueCat Web Billing, processed by Stripe. Cancel anytime.
            {!liveAvailable && !demoMode ? " Not configured on this deployment yet." : ""}
          </span>
        </li>
      </ul>
      <p className={styles.fine}>
        Each environment keeps its own anonymous ID, so a Sandbox purchase never unlocks Live, and vice
        versa.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

type RestoreState = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; id: string } | { kind: "error"; message: string };

function RestoreCard() {
  const { appUserId, changeUser, ready, env, isPro } = useEntitlements();
  const headId = useId();
  const inputId = useId();
  const msgId = useId();
  const [value, setValue] = useState("");
  const [state, setState] = useState<RestoreState>({ kind: "idle" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (!id) {
      setState({ kind: "error", message: "Paste the app user ID from your other device first." });
      return;
    }
    if (id === appUserId) {
      setState({ kind: "error", message: "That's already this device's ID." });
      return;
    }
    setState({ kind: "busy" });
    try {
      const ok = await changeUser(id);
      if (ok) {
        setState({ kind: "ok", id });
        setValue("");
      } else {
        setState({
          kind: "error",
          message: `Couldn't switch to that ID. Check it was copied in full and that both devices use ${env === "live" ? "Live" : "Sandbox"}.`,
        });
      }
    } catch {
      setState({ kind: "error", message: "Something went wrong talking to RevenueCat. Try again in a moment." });
    }
  }

  return (
    <Card labelledBy={headId} delay={0.16} className={styles.restore}>
      <CardHead id={headId} icon={<IconDevice size={14} strokeWidth={2} />} title="Restore access on another device" />
      <p className={styles.lead}>
        There&apos;s no account to sign in to: your access is tied to an anonymous RevenueCat ID stored in
        this browser. To use Pro somewhere else, copy this ID and paste it on the other device.
      </p>

      <div className={styles.restoreGrid}>
        <div className={styles.idBlock}>
          <p className={styles.fieldLabel}>
            <IconAnonymous size={13} strokeWidth={2} aria-hidden="true" />
            This device&apos;s app user ID
          </p>
          <div className={styles.idBox}>
            <code className={styles.idText}>{appUserId ?? (ready ? "Unavailable" : "Loading…")}</code>
            <CopyButton value={appUserId} label="Copy app user ID" />
          </div>
          <p className={styles.fine}>Keep it private. Anyone with this ID can use your subscription.</p>
        </div>

        <form className={styles.idBlock} onSubmit={submit} noValidate>
          <label htmlFor={inputId} className={styles.fieldLabel}>
            <IconArrowRight size={13} strokeWidth={2} aria-hidden="true" />
            Use an ID from another device
          </label>
          <div className={styles.inputRow}>
            <input
              id={inputId}
              className={styles.input}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (state.kind === "error") setState({ kind: "idle" });
              }}
              placeholder="$RCAnonymousID:…"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-describedby={msgId}
              aria-invalid={state.kind === "error" || undefined}
            />
            <button type="submit" className="btn btn-primary" disabled={!ready || state.kind === "busy"}>
              {state.kind === "busy" ? "Restoring…" : "Restore"}
            </button>
          </div>
          <p id={msgId} className={styles.msg} role="status" aria-live="polite">
            {state.kind === "ok" ? (
              <span className={styles.msgOk}>
                <IconCheck size={12} strokeWidth={3} aria-hidden="true" />
                Switched to that ID. {isPro ? "Pro is active on this device." : "No active Pro on it yet; refresh in a moment if you just purchased."}
              </span>
            ) : state.kind === "error" ? (
              <span className={styles.msgErr}>
                <IconAlert size={12} strokeWidth={2.5} aria-hidden="true" />
                {state.message}
              </span>
            ) : (
              <span className={styles.fine}>This replaces the ID on this browser; your current one stays valid.</span>
            )}
          </p>
        </form>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function AccountClient() {
  const reduce = useSafeReducedMotion();
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <motion.header
          className={styles.head}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div>
            <p className="eyebrow">Account</p>
            <h1 className={styles.title}>Account & billing</h1>
          </div>
          <p className={styles.sub}>
            No sign-up needed. Your plan lives with an anonymous RevenueCat ID in this browser.
          </p>
        </motion.header>

        <div className={styles.grid}>
          <PlanCard />
          <EnvironmentCard />
          <RestoreCard />
        </div>

        <nav className={styles.footer} aria-label="Billing and legal">
          <button type="button" className={styles.footLink} onClick={() => openInspector("open")}>
            <IconInspect size={14} strokeWidth={2} aria-hidden="true" />
            RevenueCat inspector
          </button>
          <Link href="/terms" className={styles.footLink}>
            <IconDoc size={14} strokeWidth={2} aria-hidden="true" />
            Terms
          </Link>
          <Link href="/privacy" className={styles.footLink}>
            <IconShield size={14} strokeWidth={2} aria-hidden="true" />
            Privacy
          </Link>
          <Link href="/refunds" className={styles.footLink}>
            <IconCard size={14} strokeWidth={2} aria-hidden="true" />
            Refunds & cancellation
          </Link>
        </nav>
      </div>
    </div>
  );
}
