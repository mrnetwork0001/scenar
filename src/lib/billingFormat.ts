// Display helpers shared by the RevenueCat inspector and the /account page.
import type { BillingSnapshot, KeyKind, PaywallReason } from "./types";

export const KEY_KIND_LABEL: Record<KeyKind, string> = {
  demo: "Demo (no key)",
  "test-store": "Test Store",
  "web-billing-sandbox": "Web Billing · sandbox",
  "web-billing-live": "Web Billing · production",
  unknown: "Unknown key",
};

export const PERIOD_TYPE_LABEL: Record<NonNullable<BillingSnapshot["periodType"]>, string> = {
  normal: "Normal",
  trial: "Free trial",
  intro: "Intro offer",
  prepaid: "Prepaid",
};

export const PAYWALL_REASON_LABEL: Record<PaywallReason, string> = {
  "locked-scenario": "Locked scenario",
  "pro-report": "Pro report",
  voice: "Voice mode",
  "custom-builder": "Custom builder",
  manual: "Manual upgrade",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** "30 September 2026" */
export function formatDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}

/** "30 Sept 2026, 14:05" */
export function formatDateTime(d: Date | null | undefined): string {
  return d ? dateTimeFmt.format(d) : "—";
}

/** "14:05:09" */
export function formatTime(d: Date | null | undefined): string {
  return d ? timeFmt.format(d) : "—";
}

/**
 * Precise countdown for the inspector: "6d 4h", "3h 12m", "4m 09s".
 * Returns null once the date has passed.
 */
export function formatCountdown(target: Date | null, now: number): string | null {
  if (!target) return null;
  let s = Math.floor((target.getTime() - now) / 1000);
  if (s <= 0) return null;
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** "just now", "12s ago", "4m ago", "3h ago", "2d ago" */
export function formatAgo(d: Date | null | undefined, now: number): string {
  if (!d) return "never";
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Coerce a JSON date-ish value (Date, ISO string, epoch ms) to a Date. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" || typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
