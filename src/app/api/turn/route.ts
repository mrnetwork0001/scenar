import { NextResponse } from "next/server";
import { chatJSON, hasLLM } from "@/lib/llm";
import { proRequired, verifyPro } from "@/lib/entitlementServer";
import { rateLimit } from "@/lib/rateLimit";
import { buildTurnSystemPrompt, toLLMMessages } from "@/lib/prompts";
import { mockTurn, parseMessages, resolveScenario, sanitizeMetrics, toScore, toStatus, toText } from "@/lib/mock";
import type { TurnResponse } from "@/lib/types";

export const runtime = "nodejs";
// LLM calls take 5-20s (report LLM timeout is 50s); raise the serverless limit on Vercel.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(req, "turn");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { scenarioId, sealed, messages: rawMessages } = (body ?? {}) as {
    scenarioId?: unknown;
    sealed?: unknown;
    messages?: unknown;
  };

  const resolved = resolveScenario(scenarioId, sealed);
  if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });
  const { scenario } = resolved;

  // Pro scenarios (built-in Pro + sealed custom ones) are enforced here, not just in the UI.
  if (scenario.tier === "pro") {
    const v = await verifyPro(req);
    if (!v.pro) return proRequired(v);
  }

  const messages = parseMessages(rawMessages);
  if (!messages) return NextResponse.json({ error: "messages must be a non-empty array of {role, content}" }, { status: 400 });
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return NextResponse.json({ error: "Last message must be a non-empty user message" }, { status: 400 });
  }

  const fallback = mockTurn(scenario, messages);
  if (!hasLLM()) return NextResponse.json(fallback);

  try {
    const userTurns = messages.filter((m) => m.role === "user").length;
    const raw = await chatJSON<Partial<TurnResponse>>(
      buildTurnSystemPrompt(scenario, userTurns),
      toLLMMessages(messages),
      { temperature: 0.7, maxTokens: 600 },
    );
    const status = toStatus(raw.status, "ongoing");
    const reply = toText(raw.reply, "", 700);
    if (!reply) throw new Error("LLM turn response missing reply");
    let progress = toScore(raw.progress, fallback.progress);
    if (status === "won") progress = 100;
    else progress = Math.min(progress, 95);

    const res: TurnResponse = {
      reply,
      tension: toScore(raw.tension, fallback.tension),
      progress,
      metrics: sanitizeMetrics(raw.metrics, fallback.metrics),
      coachNote: toText(raw.coachNote, fallback.coachNote, 160),
      status,
    };
    return NextResponse.json(res);
  } catch (err) {
    console.error("[api/turn] LLM failed, using mock:", err);
    return NextResponse.json(fallback);
  }
}
