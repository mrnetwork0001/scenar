import { NextResponse } from "next/server";
import { chatJSON, hasLLM } from "@/lib/llm";
import { rateLimit } from "@/lib/rateLimit";
import { buildReportMessages, buildReportSystemPrompt } from "@/lib/prompts";
import { mockReport, parseMessages, resolveScenario, sanitizeMetrics, toList, toScore, toStatus, toText } from "@/lib/mock";
import type { ReportResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const messages = parseMessages(rawMessages);
  if (!messages) return NextResponse.json({ error: "messages must be a non-empty array of {role, content}" }, { status: 400 });
  const outcome = toStatus(rawOutcome, "ongoing");

  const fallback = mockReport(scenario, messages, outcome);
  if (!hasLLM() || !messages.some((m) => m.role === "user")) return NextResponse.json(fallback);

  try {
    const raw = await chatJSON<Partial<ReportResponse>>(
      buildReportSystemPrompt(scenario, outcome),
      buildReportMessages(scenario, messages),
      { report: true, temperature: 0.4, maxTokens: 1800, timeoutMs: 75_000 },
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
    return NextResponse.json(res);
  } catch (err) {
    console.error("[api/report] LLM failed, using mock:", err);
    return NextResponse.json(fallback);
  }
}
