// Server-only: seals custom scenarios so their persona / secret / win condition never
// reach the browser in readable form. AES-256-GCM, token = base64url(iv | tag | ciphertext).
// Never import this module from client components.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Scenario } from "./types";

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

function key(): Buffer {
  const secret = process.env.SCENAR_SEAL_SECRET?.trim() || process.env.LLM_API_KEY?.trim() || "scenar-dev-seal";
  return createHash("sha256").update(secret).digest();
}

export function sealScenario(s: Scenario): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(s), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64url");
}

const str = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Returns the scenario, or null when the token is malformed, tampered with, or has an invalid shape. */
export function unsealScenario(token: string): Scenario | null {
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LEN || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return null;
  }
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length <= IV_LEN + TAG_LEN) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    return validate(JSON.parse(json));
  } catch {
    return null;
  }
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
