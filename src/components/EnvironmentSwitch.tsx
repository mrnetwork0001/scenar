"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { IconCard } from "@/components/icons";
import type { BillingEnv } from "@/lib/types";
import { useEntitlementInternals } from "./EntitlementProvider";
import styles from "./EnvironmentSwitch.module.css";

const OPTIONS: { env: BillingEnv; label: string }[] = [
  { env: "sandbox", label: "Sandbox" },
  { env: "live", label: "Live" },
];

const LIVE_DISABLED_TIP = "Live payments not configured yet";
const DIALOG_CLOSE_MS = 200;

/**
 * Sandbox | Live segmented pill. Sandbox is instant; Live asks for confirmation first
 * because it charges real money through Stripe.
 */
export function EnvironmentSwitch({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { env, liveAvailable, setEnv, demoMode, switchingEnv } = useEntitlementInternals();
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  const liveDisabled = !liveAvailable || demoMode;

  const choose = useCallback(
    (next: BillingEnv) => {
      if (next === env || switchingEnv) return;
      if (next === "live") {
        if (liveDisabled) return;
        setConfirming(true);
        return;
      }
      void setEnv("sandbox");
    },
    [env, switchingEnv, liveDisabled, setEnv],
  );

  const dismiss = useCallback((then?: () => void) => {
    setClosing(true);
    window.setTimeout(() => {
      setConfirming(false);
      setClosing(false);
      then?.();
      groupRef.current
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus({ preventScroll: true });
    }, DIALOG_CLOSE_MS);
  }, []);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next: BillingEnv = env === "sandbox" ? "live" : "sandbox";
    if (next === "live" && liveDisabled) return;
    groupRef.current?.querySelector<HTMLElement>(`[data-env="${next}"]`)?.focus();
    choose(next);
  }

  return (
    <>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Billing environment"
        aria-busy={switchingEnv || undefined}
        className={`${styles.group} ${className ?? ""}`}
        data-size={size}
        data-env={env}
        data-switching={switchingEnv || undefined}
        onKeyDown={onKeyDown}
      >
        <span className={styles.thumb} aria-hidden="true" />
        {OPTIONS.map((o) => {
          const checked = o.env === env;
          const disabled = o.env === "live" && liveDisabled;
          return (
            <button
              key={o.env}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={disabled || undefined}
              tabIndex={checked ? 0 : -1}
              data-env={o.env}
              data-checked={checked || undefined}
              data-tip={disabled ? LIVE_DISABLED_TIP : undefined}
              title={disabled ? LIVE_DISABLED_TIP : undefined}
              className={styles.option}
              onClick={() => choose(o.env)}
            >
              {o.env === "live" ? <span className={styles.dot} aria-hidden="true" /> : null}
              {o.label}
              {disabled ? <span className={styles.srOnly}>. {LIVE_DISABLED_TIP}</span> : null}
            </button>
          );
        })}
      </div>

      {confirming ? (
        <LiveConfirm
          closing={closing}
          onStay={() => dismiss()}
          onConfirm={() => dismiss(() => void setEnv("live"))}
        />
      ) : null}
    </>
  );
}

function LiveConfirm({
  closing,
  onStay,
  onConfirm,
}: {
  closing: boolean;
  onStay: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const stayRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The safe choice gets focus.
    const raf = requestAnimationFrame(() => stayRef.current?.focus({ preventScroll: true }));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onStay();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onStay]);

  function trap(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !cardRef.current) return;
    const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>("button"));
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

  return createPortal(
    <div className={styles.dialogRoot} data-closing={closing || undefined}>
      <div className={styles.backdrop} onClick={onStay} aria-hidden="true" />
      <div
        ref={cardRef}
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={trap}
      >
        <span className={styles.cardIcon} aria-hidden="true">
          <IconCard size={18} strokeWidth={2} />
        </span>
        <h2 id={titleId} className={styles.cardTitle}>
          Switch to Live?
        </h2>
        <p id={descId} className={styles.cardBody}>
          Live mode uses real payments. Purchases are charged to your card through Stripe and can be
          cancelled anytime.
        </p>
        <div className={styles.cardActions}>
          <button ref={stayRef} type="button" className="btn btn-ghost" onClick={onStay}>
            Stay in Sandbox
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Switch to Live
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
