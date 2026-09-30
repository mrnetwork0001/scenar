"use client";

import {
  ArrowRight,
  ChartNoAxesColumn,
  CircleAlert,
  LayoutGrid,
  Lock,
  Mic,
  PenLine,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { parsePrice } from "@/lib/revenuecat";
import type { PaywallPackage, PaywallReason } from "@/lib/types";
import { useEntitlementInternals } from "./EntitlementProvider";
import styles from "./Paywall.module.css";

type Phase = "idle" | "loading" | "success";

const CLOSE_MS = 280;
const SUCCESS_HOLD_MS = 1400;

const COPY: Record<PaywallReason, { title: ReactNode; sub: string }> = {
  "locked-scenario": {
    title: (
      <>
        Unlock every <span className="grad-text">high-stakes</span> scenario
      </>
    ),
    sub: "Rehearse the conversations that actually keep you up at night — against a counterpart who pushes back.",
  },
  "pro-report": {
    title: (
      <>
        See exactly <span className="grad-text">what to say</span> next time
      </>
    ),
    sub: "Your full coaching report: what worked, what to fix, and a line-by-line rewrite of your toughest moment.",
  },
  voice: {
    title: (
      <>
        Say it <span className="grad-text">out loud</span>
      </>
    ),
    sub: "Voice mode lets you speak your replies and hear the counterpart answer — the closest thing to the real room.",
  },
  "custom-builder": {
    title: (
      <>
        Rehearse <span className="grad-text">your</span> conversation
      </>
    ),
    sub: "Describe the real situation you're facing and Scenar builds a counterpart — with their own hidden agenda — in seconds.",
  },
  manual: {
    title: (
      <>
        Go <span className="grad-text">Pro</span>
      </>
    ),
    sub: "Every scenario, every insight. Walk into the real conversation already rehearsed.",
  },
};

type BenefitKey = "scenarios" | "rewrites" | "report" | "voice";

const BENEFITS: { key: BenefitKey; title: string; body: string; icon: LucideIcon }[] = [
  {
    key: "scenarios",
    title: "All 5 scenarios",
    body: "Including the new-manager and academic high-stakes talks.",
    icon: LayoutGrid,
  },
  {
    key: "rewrites",
    title: "Tactical line-by-line rewrites",
    body: "See the exact words that would have landed better.",
    icon: PenLine,
  },
  {
    key: "report",
    title: "Full coaching report",
    body: "What worked, what to fix, scored across four core skills.",
    icon: ChartNoAxesColumn,
  },
  {
    key: "voice",
    title: "Voice mode & your own scenarios",
    body: "Speak your replies out loud, or build a rehearsal from your real situation.",
    icon: Mic,
  },
];

const HIGHLIGHT: Record<PaywallReason, BenefitKey | null> = {
  "locked-scenario": "scenarios",
  "pro-report": "report",
  voice: "voice",
  "custom-builder": "voice",
  manual: null,
};

// Monochrome confetti: ink and two greys (token values).
const CONFETTI_COLORS = ["var(--fg)", "var(--fg-dim)", "var(--line-bold)"];

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

function defaultPackageId(packages: PaywallPackage[]): string | null {
  return (packages.find((p) => p.kind === "annual") ?? packages[packages.length - 1])?.id ?? null;
}

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Paywall() {
  const {
    ready,
    isPro,
    isTrial,
    isSandbox,
    demoMode,
    packages,
    paywallReason,
    closePaywall,
    purchase,
    error,
    clearError,
    managementUrl,
  } = useEntitlementInternals();

  const reason: PaywallReason = paywallReason ?? "manual";
  const titleId = useId();
  const descId = useId();

  const [phase, setPhase] = useState<Phase>("idle");
  const [closing, setClosing] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());

  const sheetRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const selectedId =
    pickedId && packages.some((p) => p.id === pickedId) ? pickedId : defaultPackageId(packages);
  const selected = packages.find((p) => p.id === selectedId) ?? null;
  const savePct = savingsPercent(packages);
  const alreadyPro = isPro && phase === "idle";

  const requestClose = useCallback(() => {
    if (phaseRef.current === "loading") return;
    setClosing(true);
    timers.current.push(window.setTimeout(closePaywall, CLOSE_MS));
  }, [closePaywall]);

  // Esc to close, lock page scroll, focus the CTA on open.
  useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      (ctaRef.current ?? sheetRef.current)?.focus({ preventScroll: true });
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const pending = timers.current;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      pending.forEach((t) => window.clearTimeout(t));
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [requestClose]);

  // Focus trap-lite: keep Tab cycling inside the sheet.
  function onSheetKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !sheetRef.current) return;
    const focusables = Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function onPurchase() {
    if (!selected || phase !== "idle") return;
    setPhase("loading");
    try {
      const ok = await purchase(selected.id);
      if (!ok) {
        setPhase("idle");
        return;
      }
      setPhase("success");
      timers.current.push(
        window.setTimeout(() => {
          setClosing(true);
          timers.current.push(window.setTimeout(closePaywall, CLOSE_MS));
        }, SUCCESS_HOLD_MS),
      );
    } catch {
      setPhase("idle"); // message is surfaced via context `error`
    }
  }

  function pick(id: string) {
    if (phase !== "idle") return;
    setPickedId(id);
    if (error) clearError();
  }

  function onSegmentKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const idx = packages.findIndex((p) => p.id === selectedId);
    const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
    const next = packages[(idx + dir + packages.length) % packages.length];
    if (next) {
      pick(next.id);
      e.currentTarget.querySelector<HTMLElement>(`[data-id="${CSS.escape(next.id)}"]`)?.focus();
    }
  }

  const copy = COPY[reason];
  const highlight = HIGHLIGHT[reason];
  const trialDays = selected?.trialDays;
  const handoff = phase === "loading" && !demoMode;

  let ctaLabel = trialDays ? "Start free trial" : "Continue";
  if (phase === "loading") ctaLabel = demoMode ? "Activating…" : "Opening secure checkout…";

  return (
    <div className={styles.root} data-closing={closing || undefined} data-handoff={handoff || undefined}>
      <div className={styles.backdrop} onClick={requestClose} aria-hidden="true" />

      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={onSheetKeyDown}
      >
        <div className={styles.inner}>
          <div className={styles.grabber} aria-hidden="true" />

          <div className={styles.topRow}>
            <span className="eyebrow">Scenar Pro</span>
            <div className={styles.topRight}>
              {demoMode ? (
                <span className={`${styles.pill} ${styles.pillDemo}`} title="Set NEXT_PUBLIC_REVENUECAT_API_KEY to use real RevenueCat Web Billing">
                  Demo billing — add RevenueCat key
                </span>
              ) : isSandbox ? (
                <span className={`${styles.pill} ${styles.pillSandbox}`} title="RevenueCat sandbox key — no real charges">
                  Sandbox
                </span>
              ) : null}
              <button
                type="button"
                className={styles.close}
                onClick={requestClose}
                aria-label="Close"
                disabled={phase === "loading"}
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          <h2 id={titleId} className={styles.title}>
            {alreadyPro ? (
              <>
                You&apos;re <span className="grad-text">Pro</span>
              </>
            ) : (
              copy.title
            )}
          </h2>
          <p id={descId} className={styles.sub}>
            {alreadyPro
              ? isTrial
                ? "Your free trial is active — every scenario and the full coaching report are unlocked."
                : "Every scenario and the full coaching report are unlocked. Go practice."
              : copy.sub}
          </p>

          <ul className={styles.benefits}>
            {BENEFITS.map((b, i) => (
              <li
                key={b.key}
                className={styles.benefit}
                data-highlight={highlight === b.key || undefined}
                style={{ "--i": i } as CSSProperties}
              >
                <span className={styles.benefitIcon}>
                  <b.icon size={15} strokeWidth={2} aria-hidden="true" />
                </span>
                <span>
                  <strong>{b.title}</strong>
                  <small>{b.body}</small>
                </span>
              </li>
            ))}
          </ul>

          {alreadyPro ? (
            <div className={styles.actions}>
              {managementUrl ? (
                <a className="btn btn-ghost" href={managementUrl} target="_blank" rel="noreferrer">
                  Manage subscription
                </a>
              ) : null}
              <button ref={ctaRef} type="button" className={`btn btn-primary ${styles.cta}`} onClick={requestClose}>
                Keep practicing
              </button>
            </div>
          ) : (
            <>
              {!ready ? (
                <div className={styles.skeleton} aria-label="Loading plans" role="status">
                  <span />
                  <span />
                  <span />
                </div>
              ) : packages.length === 0 ? (
                <p className={styles.empty} role="status">
                  Plans are unavailable right now. Make sure an offering is marked <b>Current</b> in
                  RevenueCat.
                </p>
              ) : (
                <div
                  className={styles.segment}
                  role="radiogroup"
                  aria-label="Billing period"
                  onKeyDown={onSegmentKeyDown}
                  style={{ "--count": packages.length } as CSSProperties}
                >
                  {packages.map((p) => {
                    const active = p.id === selectedId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        data-id={p.id}
                        data-active={active || undefined}
                        className={styles.option}
                        onClick={() => pick(p.id)}
                        disabled={phase !== "idle"}
                      >
                        {p.kind === "annual" ? <span className={styles.badge}>Best value</span> : null}
                        <span className={styles.optionTitle}>{p.title}</span>
                        <span className={styles.optionPrice}>
                          {p.price}
                          <small>{p.periodLabel}</small>
                        </span>
                        {p.kind === "annual" && savePct ? (
                          <span className={styles.save}>Save {savePct}%</span>
                        ) : p.kind === "weekly" ? (
                          <span className={styles.optionHint}>One big talk</span>
                        ) : p.trialDays ? (
                          <span className={styles.optionHint}>{p.trialDays}-day trial</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {selected ? (
                <div className={styles.summary} key={selected.id}>
                  {trialDays ? (
                    <>
                      <ol className={styles.timeline}>
                        <li data-now>
                          <span className={styles.tlDot} />
                          <b>Today</b>
                          <span>Full Pro access · $0.00</span>
                        </li>
                        <li>
                          <span className={styles.tlDot} />
                          <b>
                            Day {trialDays} · {formatShortDate(openedAt + trialDays * 86_400_000)}
                          </b>
                          <span>
                            {selected.price}
                            {selected.periodLabel} begins
                          </span>
                        </li>
                      </ol>
                      <p className={styles.terms}>
                        Free for {trialDays} days, then {selected.price}
                        {selected.periodLabel} — cancel anytime.
                        {selected.pricePerMonth ? ` That's just ${selected.pricePerMonth}/mo.` : ""}
                      </p>
                    </>
                  ) : (
                    <p className={styles.terms}>
                      {selected.kind === "weekly"
                        ? `Prepping for one big conversation? ${selected.price}${selected.periodLabel}, cancel anytime.`
                        : `${selected.price}${selected.periodLabel}${
                            selected.pricePerMonth ? ` (${selected.pricePerMonth}/mo)` : ""
                          } — cancel anytime.`}
                    </p>
                  )}
                </div>
              ) : null}

              <div className={styles.errorSlot} aria-live="assertive">
                {error ? (
                  <p className={styles.error} role="alert">
                    <CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
                    {error}
                  </p>
                ) : null}
              </div>

              <button
                ref={ctaRef}
                type="button"
                className={`btn btn-primary ${styles.cta}`}
                onClick={onPurchase}
                disabled={!selected || phase !== "idle"}
                aria-busy={phase === "loading"}
              >
                {phase === "loading" ? <span className={styles.spinner} aria-hidden="true" /> : null}
                <span>{ctaLabel}</span>
                {phase === "idle" ? (
                  <ArrowRight className={styles.ctaArrow} size={16} strokeWidth={2} aria-hidden="true" />
                ) : null}
              </button>

              <button
                type="button"
                className={styles.later}
                onClick={requestClose}
                disabled={phase === "loading"}
              >
                Maybe later
              </button>
            </>
          )}

          <p className={styles.fine}>
            <Lock size={11} strokeWidth={2} aria-hidden="true" />
            Payments processed securely by RevenueCat Web Billing
          </p>
        </div>

        {phase === "success" ? (
          <div className={styles.success} role="status" aria-live="polite">
            <div className={styles.burst} aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => (
                <span
                  key={i}
                  style={
                    {
                      "--a": `${i * 15 + (i % 2) * 6}deg`,
                      "--d": `${96 + (i % 4) * 22}px`,
                      "--r": `${(i % 5) * 70 - 140}deg`,
                      "--c": CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                      "--s": `${4 + (i % 3) * 2}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <svg className={styles.check} viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="25" />
              <path d="M16 27l6.5 6.5L37 19" />
            </svg>
            <p className={styles.successTitle}>You&apos;re Pro</p>
            <p className={styles.successSub}>
              {isTrial || trialDays
                ? `Your ${trialDays ?? 7}-day free trial has started.`
                : "Everything is unlocked."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
