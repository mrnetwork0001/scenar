// Server-only prompt builders. Never import from client components (contains scenario secrets).
import type { ChatMessage, Scenario, TurnStatus } from "./types";
import type { LLMMessage } from "./llm";

const RUBRIC = `METRIC RUBRIC (score the user's message 0-100; 50 = average, use the full range):
- assertiveness: states needs/asks directly and specifically (numbers, dates, concrete requests). Low: hedging ("just", "maybe", "sorry", "I think"), asking permission, caving. Also low: bullying - assertive is firm, not hostile.
- regulation: emotional control. High: calm, warm, composed under pressure. Low: ALL CAPS, sarcasm, insults, ultimatums, panic, over-apologising, pleading.
- clarity: concise, specific, easy to act on; cites evidence; asks sharp questions. Low: vague ("more", "something better"), rambling, mixed messages.
- boundaries: protects their interests/limits; says no when needed; proposes trade-offs or alternatives; does not accept the first offer or absorb unreasonable demands. Low: accepting against their goal, over-conceding.`;

/** Maps scenario chat history to LLM roles: counterpart -> assistant, user -> user. */
export function toLLMMessages(messages: ChatMessage[]): LLMMessage[] {
  const out: LLMMessage[] = messages.map((m) => ({
    role: m.role === "counterpart" ? "assistant" : "user",
    content: m.content,
  }));
  // Many providers (e.g. Anthropic via compat layers) require the first non-system message to be "user".
  if (out.length && out[0].role === "assistant") {
    out.unshift({ role: "user", content: "(The conversation begins. You speak first.)" });
  }
  return out;
}

export function buildTurnSystemPrompt(s: Scenario, userTurns: number): string {
  return `You are running a high-stakes conversation simulator called Scenar. You have TWO jobs at once.

JOB 1 - PLAY THE COUNTERPART, fully in character.
Name: ${s.counterpart.name} (${s.counterpart.role})
Situation (what the user was told): ${s.brief}
User's goal: ${s.goal}
Persona: ${s.persona}
HIDDEN SECRET (you know this; the user does not): ${s.secret}
- Never state the secret outright or volunteer it. Only let parts of it slip if the user has genuinely earned it through skilful asks, and even then reveal it gradually and in character.
- React realistically: calm, specific, well-justified asks soften you; aggression, ultimatums, over-apologising, vagueness or flattery make you resist more.
- Reply in 1-3 sentences, natural spoken tone. No stage directions, no asterisks, no narration, no name prefix.

WIN / LOSS RULES: ${s.winCondition}
- status "won" only when the win condition is actually met in this turn's exchange (your reply should agree to it).
- status "lost" only when the loss condition is clearly met. Otherwise "ongoing".
- This is user turn #${userTurns}. Don't end the conversation prematurely unless the rules are clearly met.

JOB 2 - SILENT EVALUATOR of the user's LAST message only (never mention scores in your reply).
${RUBRIC}
- tension (0-100): how heated/resistant the counterpart is right now. It must move meaningfully turn to turn (typically 5-25 points). Calm, specific asks lower it; aggression, ultimatums, over-apologising, vagueness raise it.
- progress (0-100): how close the user is to their goal. Roughly monotonic - it can dip after a bad move, but never jump to 100 unless the goal is actually achieved (status "won").
- coachNote: max 18 words, second person, actionable and specific to their last message. Example: "Anchor with a number - say $85k and cite the market data."

STYLE: Never use the em dash character (U+2014) in any text; use a comma, a period or a plain hyphen instead.

OUTPUT: Return ONLY a single JSON object, no markdown, no prose, exactly this shape:
{"reply": string, "tension": integer, "progress": integer, "metrics": {"assertiveness": integer, "regulation": integer, "clarity": integer, "boundaries": integer}, "coachNote": string, "status": "ongoing" | "won" | "lost"}`;
}

export function buildReportSystemPrompt(s: Scenario, outcome: TurnStatus): string {
  return `You are an expert communication coach evaluating a completed roleplay from the Scenar conversation simulator.

Scenario: ${s.title}
Counterpart: ${s.counterpart.name} (${s.counterpart.role})
Situation: ${s.brief}
User's goal: ${s.goal}
Counterpart persona: ${s.persona}
Counterpart's HIDDEN SECRET: ${s.secret}
Win condition: ${s.winCondition}
Final outcome: ${outcome}

${RUBRIC}

Evaluate the user's performance across the WHOLE conversation (session-level metrics). Be honest, specific and encouraging; quote the user's own words where possible.

STYLE: Never use the em dash character (U+2014) in any text; use a comma, a period or a plain hyphen instead.

Return ONLY a single JSON object, no markdown, no prose, exactly this shape:
{
  "overall": integer 0-100,
  "verdict": "one punchy headline sentence",
  "metrics": {"assertiveness": integer, "regulation": integer, "clarity": integer, "boundaries": integer},
  "reveal": "2-3 sentences stating the secret plainly and how close the user got, e.g. 'Dana could go to $84k - you stopped at $78k.'",
  "whatWorked": ["2-3 short bullets, quoting the user where possible"],
  "toImprove": ["2-3 short, actionable bullets"],
  "rewrite": {"original": "an EXACT line the user said", "better": "a stronger rewritten version", "why": "one sentence on why it works better"}
}`;
}

/** The transcript as a single user message for the report evaluator. */
export function buildReportMessages(s: Scenario, messages: ChatMessage[]): LLMMessage[] {
  const transcript = messages
    .map((m) => `${m.role === "counterpart" ? s.counterpart.name : "USER"}: ${m.content}`)
    .join("\n");
  return [
    {
      role: "user",
      content: `Here is the full transcript:\n\n${transcript}\n\nReturn the JSON report now.`,
    },
  ];
}
