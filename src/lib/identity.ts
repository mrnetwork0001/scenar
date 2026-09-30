// Client-side identity for server entitlement checks. EntitlementProvider keeps it current;
// fetch helpers attach it as headers so API routes can verify scenar_pro with RevenueCat.
import { IDENTITY_HEADERS, type BillingEnv } from "./types";

let current: { appUserId: string | null; env: BillingEnv } = { appUserId: null, env: "sandbox" };

export function setIdentity(next: { appUserId: string | null; env: BillingEnv }) {
  current = next;
}

export function getIdentity() {
  return current;
}

/** Headers to spread into fetch() for Pro-gated API routes. */
export function identityHeaders(): Record<string, string> {
  const h: Record<string, string> = { [IDENTITY_HEADERS.env]: current.env };
  if (current.appUserId) h[IDENTITY_HEADERS.user] = current.appUserId;
  return h;
}
