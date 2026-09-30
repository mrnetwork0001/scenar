// Server-only: seals custom scenarios (persona / secret / win condition) and the Pro section of
// session reports so neither reaches the browser in readable form. AES-256-GCM, token = base64url(iv | tag | ciphertext).
// Never import this module from client components.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { ProReportSection, Scenario } from "./types";

const IV_LEN = 12;
const TAG_LEN = 16;
const MAX_TOKEN_LEN = 16_000;

const CATEGORIES: readonly Scenario["category"][] = [
  "Career",
  "Workplace",
  "Academic",
  "Management",
  "Personal",
  "Custom",
];

/**
 * Key purposes. Each purpose derives its own AES key so a token sealed for one purpose can never be
 * decrypted as another (a sealed Pro report section is not a valid custom scenario and vice versa).
 * "scenario" keeps the original derivation so previously built custom scenarios stay playable.
 */
type SealPurpose = "scenario" | "pro-report";

function key(purpose: SealPurpose): Buffer {
  const secret = process.env.SCENAR_SEAL_SECRET?.trim() || process.env.LLM_API_KEY?.trim() || "scenar-dev-seal";
  const h = createHash("sha256");
  if (purpose !== "scenario") h.update(`scenar:${purpose}:v1\0`);
  return h.update(secret).digest();
}

function sealJSON(purpose: SealPurpose, value: unknown): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(purpose), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64url");
}

/** Decrypts + authenticates a token; null when malformed or tampered with. */
function unsealJSON(purpose: SealPurpose, token: unknown): unknown {
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LEN || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return null;
  }
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length <= IV_LEN + TAG_LEN) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv("aes-256-gcm", key(purpose), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export function sealScenario(s: Scenario): string {
  return sealJSON("scenario", s);
}

const str = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Returns the scenario, or null when the token is malformed, tampered with, or has an invalid shape. */
export function unsealScenario(token: string): Scenario | null {
  return validate(unsealJSON("scenario", token));
}

/* ------------------------------------------------------------ Pro report section */

/** Sealed Pro sections are redeemable for 24h after the report was generated. */
export const PRO_SEAL_TTL_MS = 24 * 60 * 60 * 1000;

interface SealedProPayload {
  v: 1;
  iat: number; // issued at (ms)
  exp: number; // expires at (ms)
  section: ProReportSection;
}

export function sealProSection(section: ProReportSection, now = Date.now()): string {
  const payload: SealedProPayload = { v: 1, iat: now, exp: now + PRO_SEAL_TTL_MS, section };
  return sealJSON("pro-report", payload);
}

const strList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10 && v.every((x) => typeof x === "string");

/** Returns the section, or an error when the token is tampered with, has an invalid shape, or has expired. */
export function unsealProSection(
  token: unknown,
  now = Date.now(),
): { section: ProReportSection } | { error: "invalid" | "expired" } {
  const raw = unsealJSON("pro-report", token) as Partial<SealedProPayload> | null;
  if (!raw || typeof raw !== "object" || raw.v !== 1 || typeof raw.iat !== "number" || typeof raw.exp !== "number") {
    return { error: "invalid" };
  }
  const s = raw.section as Partial<ProReportSection> | undefined;
  const rw = s?.rewrite as Partial<ProReportSection["rewrite"]> | undefined;
  if (
    !s ||
    !strList(s.whatWorked) ||
    !strList(s.toImprove) ||
    !rw ||
    typeof rw.original !== "string" ||
    typeof rw.better !== "string" ||
    typeof rw.why !== "string"
  ) {
    return { error: "invalid" };
  }
  // Small clock-skew allowance on iat for multi-instance deploys.
  if (now > raw.exp || raw.iat > now + 60_000) return { error: "expired" };
  return {
    section: {
      whatWorked: s.whatWorked,
      toImprove: s.toImprove,
      rewrite: { original: rw.original, better: rw.better, why: rw.why },
    },
  };
}

function validate(raw: unknown): Scenario | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const cp = s.counterpart as Record<string, unknown> | undefined;
  if (
    !str(s.id) ||
    !str(s.title) ||
    !CATEGORIES.includes(s.category as Scenario["category"]) ||
    (s.tier !== "free" && s.tier !== "pro") ||
    (s.difficulty !== 1 && s.difficulty !== 2 && s.difficulty !== 3) ||
    typeof s.minutes !== "number" ||
    !str(s.accent) ||
    !cp ||
    typeof cp !== "object" ||
    !str(cp.name) ||
    !str(cp.role) ||
    !str(cp.initials) ||
    !str(s.brief) ||
    !str(s.goal) ||
    !str(s.opening) ||
    !str(s.persona) ||
    !str(s.secret) ||
    !str(s.winCondition) ||
    !Array.isArray(s.mockReplies) ||
    !s.mockReplies.every((r) => typeof r === "string")
  ) {
    return null;
  }
  return raw as Scenario;
}
