import { NextResponse } from "next/server";
import { chatJSON, hasLLM } from "@/lib/llm";
import { proRequired, verifyPro } from "@/lib/entitlementServer";
import { rateLimit } from "@/lib/rateLimit";
import { buildCustomMessages, buildCustomSystemPrompt, parseCustomInput, sanitizeGenerated, templateScenario } from "@/lib/customPrompt";
import { toPublic } from "@/lib/scenarios";
import { sealScenario } from "@/lib/seal";
import type { Scenario } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(req, "custom");
  if (limited) return limited;

  // The builder is a Pro feature: verify scenar_pro with RevenueCat before spending LLM tokens.
  const v = await verifyPro(req);
  if (!v.pro) return proRequired(v);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseCustomInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { input } = parsed;

  let scenario: Scenario | null = null;
  if (hasLLM()) {
    try {
      const raw = await chatJSON<unknown>(buildCustomSystemPrompt(), buildCustomMessages(input), {
        temperature: 0.8,
        maxTokens: 1400,
        timeoutMs: 50_000,
      });
      scenario = sanitizeGenerated(raw, input);
      if (!scenario) console.error("[api/custom] LLM scenario failed validation, using template");
    } catch (err) {
      console.error("[api/custom] LLM failed, using template:", err);
    }
  }
  const mock = !scenario;
  if (!scenario) scenario = templateScenario(input);

  // Only public fields go back in the clear; persona/secret/winCondition travel sealed.
  return NextResponse.json({ scenario: toPublic(scenario), sealed: sealScenario(scenario), ...(mock ? { mock } : {}) });
}
