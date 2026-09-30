// Server-only LLM client (OpenAI Chat Completions or Anthropic Messages format, via fetch).
// Never import this module from client components.

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Use LLM_REPORT_MODEL (falls back to LLM_MODEL). */
  report?: boolean;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 45_000;

export function hasLLM(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_API_KEY.trim());
}

function config(report?: boolean) {
  const baseUrl = (process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  const reportModel = process.env.LLM_REPORT_MODEL?.trim() || model;
  return {
    baseUrl,
    apiKey: process.env.LLM_API_KEY?.trim() ?? "",
    model: report ? reportModel : model,
  };
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown } }[];
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  // Some providers return an array of content parts.
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === "string" ? p : typeof p?.text === "string" ? p.text : ""))
      .join("");
  }
  return "";
}

interface AnthropicResponse {
  content?: unknown;
}

/**
 * Routers like 0G serve Claude models only on the Anthropic Messages format.
 * LLM_API_FORMAT=openai|anthropic overrides; otherwise "claude-*" models use Anthropic.
 */
function isAnthropicFormat(model: string): boolean {
  const forced = process.env.LLM_API_FORMAT?.trim().toLowerCase();
  if (forced === "anthropic") return true;
  if (forced === "openai") return false;
  return /^claude/i.test(model);
}

function buildRequest(cfg: ReturnType<typeof config>, model: string, system: string, messages: LLMMessage[], opts: ChatOptions) {
  const maxTokens = opts.maxTokens ?? 800;
  if (isAnthropicFormat(model)) {
    return {
      url: `${cfg.baseUrl}/messages`,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        Authorization: `Bearer ${cfg.apiKey}`,
        "anthropic-version": "2023-06-01",
      },
      // No temperature: newer Claude models reject it.
      body: { model, system, messages: messages.filter((m) => m.role !== "system"), max_tokens: maxTokens },
      anthropic: true,
    };
  }
  return {
    url: `${cfg.baseUrl}/chat/completions`,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: {
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: opts.temperature ?? 0.7,
      max_tokens: maxTokens,
    },
    anthropic: false,
  };
}

async function chatRaw(system: string, messages: LLMMessage[], opts: ChatOptions): Promise<string> {
  const cfg = config(opts.report);
  if (!cfg.apiKey) throw new Error("LLM_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const req = buildRequest(cfg, opts.model ?? cfg.model, system, messages, opts);

  try {
    const res = await fetch(req.url, {
      method: "POST",
      headers: req.headers as Record<string, string>,
      body: JSON.stringify(req.body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LLM request failed: HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
    }

    const text = req.anthropic
      ? contentToString(((await res.json()) as AnthropicResponse).content)
      : contentToString(((await res.json()) as ChatCompletionResponse).choices?.[0]?.message?.content);
    if (!text.trim()) throw new Error("LLM returned an empty response");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`LLM request timed out after ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Extracts the first JSON object from a model reply (tolerates ``` fences and prose). */
export function extractJSON<T>(text: string): T {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in LLM reply");
  return JSON.parse(s.slice(start, end + 1)) as T;
}

/**
 * Calls the chat model and parses a JSON object from its reply.
 * On parse failure, retries once with an explicit "Return ONLY valid JSON" nudge.
 */
export async function chatJSON<T>(system: string, messages: LLMMessage[], opts: ChatOptions = {}): Promise<T> {
  const first = await chatRaw(system, messages, opts);
  try {
    return extractJSON<T>(first);
  } catch {
    const retryMessages: LLMMessage[] = [
      ...messages,
      { role: "assistant", content: first.slice(0, 2000) },
      {
        role: "user",
        content:
          "Your previous reply was not valid JSON. Return ONLY valid JSON matching the required schema — no prose, no markdown fences.",
      },
    ];
    const second = await chatRaw(system, retryMessages, { ...opts, temperature: 0.2 });
    try {
      return extractJSON<T>(second);
    } catch (err) {
      throw new Error(
        `LLM reply was not valid JSON after retry: ${(err as Error).message}. Snippet: ${second.slice(0, 200)}`,
      );
    }
  }
}
