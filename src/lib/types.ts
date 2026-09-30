// Shared contracts between the AI backend, RevenueCat layer and UI.

export type Tier = "free" | "pro";

export type MetricKey = "assertiveness" | "regulation" | "clarity" | "boundaries";

export const METRIC_LABELS: Record<MetricKey, string> = {
  assertiveness: "Assertiveness",
  regulation: "Emotional Regulation",
  clarity: "Clarity",
  boundaries: "Boundary Setting",
};

export type Metrics = Record<MetricKey, number>; // each 0-100

export interface Scenario {
  id: string;
  title: string;
  category: "Career" | "Workplace" | "Academic" | "Management" | "Personal" | "Custom";
  tier: Tier;
  difficulty: 1 | 2 | 3;
  minutes: number;
  accent: string; // hex color used for the card glow
  counterpart: { name: string; role: string; initials: string };
  /** User-facing situation, shown before starting. */
  brief: string;
  /** What the user is trying to achieve, shown during play. */
  goal: string;
  /** First line the counterpart says. */
  opening: string;
  /** Private persona instructions for the AI (never shown to the user until the reveal). */
  persona: string;
  /** Hidden state the user must uncover or work around. Revealed in the report. */
  secret: string;
  /** How the AI should decide status "won". */
  winCondition: string;
  /** Canned counterpart lines used when no LLM key is configured. */
  mockReplies: string[];
}

export interface ChatMessage {
  role: "user" | "counterpart";
  content: string;
}

// POST /api/turn
export interface TurnRequest {
  scenarioId: string;
  messages: ChatMessage[]; // full history incl. the opening line and the new user message last
  /** Sealed custom scenario token (Pro builder). When present, the server resolves the scenario from it. */
  sealed?: string;
}

export type TurnStatus = "ongoing" | "won" | "lost";

export interface TurnResponse {
  reply: string; // counterpart's in-character reply
  tension: number; // 0-100, how heated / resistant the counterpart is right now
  progress: number; // 0-100, how close the user is to their goal
  metrics: Metrics; // scores for the user's LAST message
  coachNote: string; // one short, actionable tip about the user's last message
  status: TurnStatus;
  mock?: boolean; // true when served by the offline fallback
}

// POST /api/report
export interface ReportRequest {
  scenarioId: string;
  messages: ChatMessage[];
  outcome: TurnStatus;
  /** Sealed custom scenario token (Pro builder). */
  sealed?: string;
}

export interface ReportResponse {
  overall: number; // 0-100
  verdict: string; // one punchy headline sentence
  metrics: Metrics; // session-level scores
  reveal: string; // explains the counterpart's secret and how close the user got
  whatWorked: string[]; // 2-3 items  (Pro)
  toImprove: string[]; // 2-3 items   (Pro)
  rewrite: { original: string; better: string; why: string }; // best tactical rewrite of one user line (Pro)
  mock?: boolean;
}

// RevenueCat layer (implemented in src/components/EntitlementProvider.tsx)
export const PRO_ENTITLEMENT = "scenar_pro";
export const STARTER_ENTITLEMENT = "starter_scenarios";

export interface PaywallPackage {
  id: string;
  kind: "weekly" | "monthly" | "annual" | "lifetime" | "other";
  title: string; // e.g. "Monthly"
  price: string; // formatted, e.g. "$9.99"
  periodLabel: string; // e.g. "/month", "" for lifetime
  pricePerMonth?: string; // formatted, for comparison badges
  trialDays?: number;
}

export type PaywallReason = "locked-scenario" | "pro-report" | "voice" | "custom-builder" | "manual";

export interface EntitlementState {
  ready: boolean;
  isPro: boolean;
  isTrial: boolean;
  isSandbox: boolean;
  demoMode: boolean; // true when NEXT_PUBLIC_REVENUECAT_API_KEY is missing
  expiresAt: Date | null;
  packages: PaywallPackage[];
  paywallOpen: boolean;
  paywallReason: PaywallReason | null;
  openPaywall: (reason: PaywallReason) => void;
  closePaywall: () => void;
  purchase: (packageId: string) => Promise<boolean>; // resolves true on success, false on cancel
  refresh: () => Promise<void>;
  resetDemo: () => void; // demo mode only: drops the fake Pro entitlement
}
