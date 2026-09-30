import { NextResponse } from "next/server";
import { chatJSON, hasLLM } from "@/lib/llm";
import { proRequired, verifyPro, type ProVerification } from "@/lib/entitlementServer";
import { rateLimit } from "@/lib/rateLimit";
import { buildReportMessages, buildReportSystemPrompt } from "@/lib/prompts";
import { mockReport, parseMessages, resolveScenario, sanitizeMetrics, toList, toScore, toStatus, toText } from "@/lib/mock";
import { sealProSection } from "@/lib/seal";
import type { ReportResponse } from "@/lib/types";

export const runtime = "nodejs";
// LLM calls take 5-20s (report LLM timeout is 50s); raise the serverless limit on Vercel.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Verified Pro callers get the whole report. Everyone else gets the scores + reveal with the Pro
 * coaching section removed and carried only as an AES-256-GCM sealed token (24h), redeemable via
 * POST /api/report/unlock once RevenueCat confirms scenar_pro.
 */
function gate(report: ReportResponse, v: ProVerification): Response {
  const headers = { "Cache-Control": "no-store" };
  if (v.pro) return NextResponse.json({ ...report, locked: false } satisfies ReportResponse, { headers });
  const { whatWorked, toImprove, rewrite, ...rest } = report;
  const locked: ReportResponse = {
    ...rest,
    whatWorked: [],
    toImprove: [],
    rewrite: { original: "", better: "", why: "" },
    locked: true,
    proSealed: sealProSection({ whatWorked, toImprove, rewrite }),
  };
  return NextResponse.json(locked, { headers });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "report");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { scenarioId, sealed, messages: rawMessages, outcome: rawOutcome } = (body ?? {}) as {
    scenarioId?: unknown;
    sealed?: unknown;
    messages?: unknown;
    outcome?: unknown;
  };

  const resolved = resolveScenario(scenarioId, sealed);
  if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });
  const { scenario } = resolved;

  // Pro scenarios need Pro for the whole report; free scenarios only gate the coaching section.
  // Start the RevenueCat check now so it overlaps the LLM call.
  const verification = verifyPro(req);
  if (scenario.tier === "pro") {
    const v = await verification;
    if (!v.pro) return proRequired(v);
  }

  const messages = parseMessages(rawMessages);
  if (!messages) return NextResponse.json({ error: "messages must be a non-empty array of {role, content}" }, { status: 400 });
  const outcome = toStatus(rawOutcome, "ongoing");

  const fallback = mockReport(scenario, messages, outcome);
  if (!hasLLM() || !messages.some((m) => m.role === "user")) return gate(fallback, await verification);

  try {
    const raw = await chatJSON<Partial<ReportResponse>>(
      buildReportSystemPrompt(scenario, outcome),
      buildReportMessages(scenario, messages),
      { report: true, temperature: 0.4, maxTokens: 1800, timeoutMs: 50_000 },
    );
    const rw = (raw.rewrite && typeof raw.rewrite === "object" ? raw.rewrite : {}) as Partial<ReportResponse["rewrite"]>;
    const res: ReportResponse = {
      overall: toScore(raw.overall, fallback.overall),
      verdict: toText(raw.verdict, fallback.verdict, 200),
      metrics: sanitizeMetrics(raw.metrics, fallback.metrics),
      reveal: toText(raw.reveal, fallback.reveal, 700),
      whatWorked: toList(raw.whatWorked, fallback.whatWorked),
      toImprove: toList(raw.toImprove, fallback.toImprove),
      rewrite: {
        original: toText(rw.original, fallback.rewrite.original, 600),
        better: toText(rw.better, fallback.rewrite.better, 600),
        why: toText(rw.why, fallback.rewrite.why, 300),
      },
    };
    return gate(res, await verification);
  } catch (err) {
    console.error("[api/report] LLM failed, using mock:", err);
    return gate(fallback, await verification);
  }
}
