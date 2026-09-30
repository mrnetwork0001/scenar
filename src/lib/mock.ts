// Offline fallback: heuristic scoring + canned replies so the demo never breaks.
import type { ChatMessage, Metrics, ReportResponse, Scenario, TurnResponse, TurnStatus } from "./types";
import { getScenario } from "./scenarios";
import { unsealScenario } from "./seal";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface Heuristic {
  metrics: Metrics;
  tensionDelta: number;
  flags: {
    numbers: boolean;
    hedges: number;
    hostile: boolean;
    boundary: boolean;
    question: boolean;
  };
}

const HEDGES = /\b(just|sorry|maybe|perhaps|i think|kind of|kinda|sort of|i guess|if that'?s ok(ay)?|hopefully|i was hoping)\b/gi;
const INSULTS = /\b(stupid|ridiculous|joke|insult(ing)?|pathetic|idiot|unfair|screw|hate|lowball(ing)?|waste)\b/i;
const ULTIMATUM = /\b(or (else|i('| wi)ll) (walk|quit|leave)|take it or leave|final offer|i('| wi)ll quit|i quit|i'?m leaving)\b/i;
const BOUNDARY = /\b(no|can'?t|cannot|won'?t|instead|trade-?off|priorit\w*|alternative|capacity|not able)\b/i;
const EVIDENCE = /\b(market|data|research|benchmark|glassdoor|levels|record|shipped|delivered|document(ation)?|evidence|example|specifically)\b/i;

export function scoreMessage(text: string): Heuristic {
  const t = text.trim();
  const numbers = /\$?\d[\d,.]*\s*(k|%|hours?|days?)?/i.test(t);
  const hedges = (t.match(HEDGES) ?? []).length;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  const capsRatio = letters.length > 8 ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
  const bangs = (t.match(/!/g) ?? []).length;
  const hostile = capsRatio > 0.6 || bangs >= 2 || INSULTS.test(t) || ULTIMATUM.test(t);
  const boundary = BOUNDARY.test(t);
  const question = t.includes("?");
  const evidence = EVIDENCE.test(t);
  const words = t.split(/\s+/).filter(Boolean).length;

  let assertiveness = 50;
  let regulation = 70;
  let clarity = 50;
  let boundaries = 45;
  let tensionDelta = 0;

  if (numbers) { assertiveness += 18; clarity += 15; tensionDelta -= 8; }
  if (evidence) { clarity += 12; assertiveness += 8; tensionDelta -= 5; }
  assertiveness -= hedges * 9;
  if (hedges >= 2) { regulation -= 8; tensionDelta += 4; }
  if (hostile) { regulation -= 35; assertiveness += 5; tensionDelta += 22; }
  if (capsRatio > 0.6) regulation -= 10;
  if (boundary) { boundaries += 22; assertiveness += 5; }
  if (question) { clarity += 10; tensionDelta -= 3; }
  if (words < 4) { clarity -= 12; tensionDelta += 4; }
  if (words > 90) clarity -= 12;
  if (!numbers && !evidence && !boundary && !question) { clarity -= 8; tensionDelta += 6; }

  return {
    metrics: {
      assertiveness: clamp(assertiveness),
      regulation: clamp(regulation),
      clarity: clamp(clarity),
      boundaries: clamp(boundaries),
    },
    tensionDelta,
    flags: { numbers, hedges, hostile, boundary, question },
  };
}

const avg = (m: Metrics) => (m.assertiveness + m.regulation + m.clarity + m.boundaries) / 4;

function coachFor(h: Heuristic): string {
  if (h.flags.hostile) return "Lower the heat — state your ask calmly and drop the ultimatum.";
  if (h.flags.hedges >= 2) return "Cut the hedges like \"just\" and \"sorry\" — say what you want plainly.";
  if (!h.flags.numbers && h.metrics.clarity < 55) return "Be specific — name a concrete number, date, or request.";
  if (!h.flags.question) return "Ask an open question to uncover what they can actually offer.";
  if (!h.flags.boundary) return "Hold your line — propose a trade-off instead of conceding.";
  return "Strong move — keep it calm, specific, and keep asking what's possible.";
}

export function mockTurn(scenario: Scenario, messages: ChatMessage[]): TurnResponse {
  const userMsgs = messages.filter((m) => m.role === "user");
  const userTurnIndex = Math.max(0, userMsgs.length - 1);
  const replies = scenario.mockReplies.length ? scenario.mockReplies : ["I see. Tell me more."];
  const lastIdx = replies.length - 1;
  const replyIdx = Math.min(userTurnIndex, lastIdx);

  const scored = userMsgs.map((m) => scoreMessage(m.content));
  const last = scored[scored.length - 1] ?? scoreMessage("");
  const runningAvg = scored.length ? scored.reduce((a, h) => a + avg(h.metrics), 0) / scored.length : 50;
  const tension = clamp(55 + scored.reduce((a, h) => a + h.tensionDelta, 0) - userTurnIndex * 4);

  const reachedEnd = replyIdx === lastIdx;
  const lastAvg = avg(last.metrics);
  let status: TurnStatus = "ongoing";
  if (reachedEnd && runningAvg >= 55 && !last.flags.hostile) status = "won";
  else if (scored.filter((h) => h.flags.hostile).length >= 3) status = "lost";

  let progress = ((replyIdx + 1) / (lastIdx + 2)) * 80 + (runningAvg - 50) * 0.4;
  if (status === "won") progress = 100;
  else progress = Math.min(progress, 92);

  const reply =
    status === "lost"
      ? "I don't think this conversation is going anywhere productive. Let's pick it up another time."
      : reachedEnd && status !== "won"
        ? "I hear you, but I'm not quite there yet. What exactly are you proposing?"
        : replies[replyIdx];

  return {
    reply,
    tension: status === "won" ? Math.min(tension, 20) : tension,
    progress: clamp(progress),
    metrics: last.metrics,
    coachNote: lastAvg >= 70 && status === "won" ? "You earned it — calm, specific, and firm. Lock in the details." : coachFor(last),
    status,
    mock: true,
  };
}

export function mockReport(scenario: Scenario, messages: ChatMessage[], outcome: TurnStatus): ReportResponse {
  const userMsgs = messages.filter((m) => m.role === "user" && m.content.trim());
  const scored = userMsgs.map((m) => ({ text: m.content.trim(), h: scoreMessage(m.content) }));
  const n = Math.max(1, scored.length);
  const sum = (k: keyof Metrics) => scored.reduce((a, s) => a + s.h.metrics[k], 0);
  const metrics: Metrics = scored.length
    ? {
        assertiveness: clamp(sum("assertiveness") / n),
        regulation: clamp(sum("regulation") / n),
        clarity: clamp(sum("clarity") / n),
        boundaries: clamp(sum("boundaries") / n),
      }
    : { assertiveness: 40, regulation: 60, clarity: 40, boundaries: 40 };

  const outcomeBonus = outcome === "won" ? 12 : outcome === "lost" ? -12 : 0;
  const overall = clamp(avg(metrics) + outcomeBonus);

  const verdict =
    outcome === "won"
      ? overall >= 75
        ? "Calm, specific, and firm — you got what you came for."
        : "You got the win — now make it look effortless."
      : outcome === "lost"
        ? "The conversation slipped away — but every miss here is a rehearsal for the real one."
        : "Solid start — you left value on the table.";

  const quote = (s: string) => `"${s.length > 90 ? s.slice(0, 87) + "..." : s}"`;
  const best = [...scored].sort((a, b) => avg(b.h.metrics) - avg(a.h.metrics));
  const worst = [...scored].sort((a, b) => avg(a.h.metrics) - avg(b.h.metrics))[0];

  const whatWorked: string[] = [];
  const numMsg = scored.find((s) => s.h.flags.numbers);
  if (numMsg) whatWorked.push(`You got specific: ${quote(numMsg.text)}`);
  const qMsg = scored.find((s) => s.h.flags.question);
  if (qMsg) whatWorked.push(`You asked a question to uncover room: ${quote(qMsg.text)}`);
  const bMsg = scored.find((s) => s.h.flags.boundary);
  if (bMsg) whatWorked.push(`You held a boundary: ${quote(bMsg.text)}`);
  if (!scored.some((s) => s.h.flags.hostile)) whatWorked.push("You kept your composure the whole way through.");
  if (whatWorked.length < 2 && best[0]) whatWorked.push(`Your strongest line: ${quote(best[0].text)}`);
  if (whatWorked.length < 2) whatWorked.push("You showed up and engaged with a hard conversation.");

  const toImprove: string[] = [];
  if (metrics.assertiveness < 65) toImprove.push("Drop hedges like \"just\", \"maybe\" and \"sorry\" — state your ask plainly.");
  if (metrics.clarity < 65) toImprove.push("Anchor with concrete numbers, dates, or evidence instead of general asks.");
  if (metrics.regulation < 65) toImprove.push("Keep the temperature down — ultimatums and caps make the other side dig in.");
  if (metrics.boundaries < 65) toImprove.push("Propose a trade-off instead of conceding; say what you can't do and why.");
  toImprove.push("Ask an open question early to find out what they can actually offer.");

  const original = worst?.text ?? "I was hoping for something a bit better, if that's okay.";
  return {
    overall,
    verdict,
    metrics,
    reveal: `The hidden truth: ${scenario.secret} ${
      outcome === "won"
        ? "You unlocked a good share of it — there may have been even more room."
        : "You didn't reach it this time — specific, calm asks would have gotten you closer."
    }`,
    whatWorked: whatWorked.slice(0, 3),
    toImprove: toImprove.slice(0, 3),
    rewrite: {
      original,
      better: rewriteLine(scenario),
      why: "It's calm, specific, and ties your ask to evidence — which gives them a reason to say yes.",
    },
    mock: true,
  };
}

function rewriteLine(s: Scenario): string {
  switch (s.id) {
    case "salary-offer":
      return "I'm excited about this role. Based on market data for similar positions, I'm looking for $84,000 base — can we get there?";
    case "say-no-manager":
      return "I want Acme to go well, but I'm at capacity on two deliverables. If I take this, which one slips — or could Priya own it?";
    case "professor-extension":
      return "I had a documented family emergency last week. I've finished the core implementation; could I have until Friday to complete testing?";
    case "hard-feedback":
      return "I've noticed three missed deadlines and the standup moment with Sam. That's not like you — what's been going on?";
    case "unfair-review":
      return "I want to understand the rating. What specifically drove it? I delivered every project on time and had no concerns raised all year.";
    default:
      return "Here's specifically what I need, and here's why it's reasonable — can we make that work?";
  }
}

// ---------- Request validation / response sanitizing (shared by API routes) ----------

export const MAX_HISTORY = 40;
export const MAX_CHARS = 1200;

export function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "counterpart") || typeof content !== "string") return null;
    out.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  return out.slice(-MAX_HISTORY);
}

export function toScore(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? clamp(n) : clamp(fallback);
}

export function sanitizeMetrics(raw: unknown, fallback: Metrics): Metrics {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    assertiveness: toScore(r.assertiveness, fallback.assertiveness),
    regulation: toScore(r.regulation, fallback.regulation),
    clarity: toScore(r.clarity, fallback.clarity),
    boundaries: toScore(r.boundaries, fallback.boundaries),
  };
}

export function toStatus(v: unknown, fallback: TurnStatus): TurnStatus {
  return v === "ongoing" || v === "won" || v === "lost" ? v : fallback;
}

export function toText(v: unknown, fallback: string, max = 600): string {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
}

export function toList(v: unknown, fallback: string[]): string[] {
  const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 300)) : [];
  return list.length ? list.slice(0, 3) : fallback;
}

/**
 * Resolves the scenario for /api/turn and /api/report: a sealed custom scenario token wins
 * when present (tampered/invalid tokens are rejected), otherwise the built-in scenarioId.
 */
export function resolveScenario(scenarioId: unknown, sealed: unknown): { scenario: Scenario } | { error: string } {
  if (sealed !== undefined && sealed !== null && sealed !== "") {
    const scenario = typeof sealed === "string" ? unsealScenario(sealed) : null;
    return scenario ? { scenario } : { error: "Invalid or tampered custom scenario" };
  }
  const scenario = typeof scenarioId === "string" ? getScenario(scenarioId) : undefined;
  return scenario ? { scenario } : { error: "Unknown scenarioId" };
}
