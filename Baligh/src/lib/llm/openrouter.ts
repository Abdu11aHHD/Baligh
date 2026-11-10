import "server-only";
import { ConfigError, getOpenRouterEnv } from "../env";
import { AIError } from "./errors";

export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  /** Model id reported by OpenRouter for this completion. */
  model: string;
}

function referer(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Calls the configured Meta Llama model. There is deliberately NO model
 * fallback list: if the configured model is unavailable we surface an error
 * instead of silently answering with a different model.
 */
export async function chatCompletion(messages: ChatMessage[], opts: { maxTokens?: number } = {}): Promise<ChatResult> {
  let env;
  try {
    env = getOpenRouterEnv();
  } catch (e) {
    if (e instanceof ConfigError) throw new AIError("AI_CONFIG", "OpenRouter is not configured", e.message);
    throw e;
  }
  if (!env.OPENROUTER_MODEL.startsWith("meta-llama/")) {
    throw new AIError("AI_CONFIG", "OPENROUTER_MODEL must be a Meta Llama model", env.OPENROUTER_MODEL);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.OPENROUTER_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer(),
        "X-Title": "Balligh AI",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: opts.maxTokens ?? 700,
      }),
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") throw new AIError("AI_TIMEOUT", "OpenRouter request timed out");
    throw new AIError("AI_UPSTREAM", "Network error calling OpenRouter", (e as Error).message);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  } finally {
    clearTimeout(timer);
  }

  const errorMessage = extractErrorMessage(body);
  if (!res.ok || errorMessage) {
    throw mapHttpError(res.ok ? extractErrorCode(body) ?? 502 : res.status, errorMessage ?? res.statusText);
  }

  const data = body as { model?: string; choices?: Array<{ message?: { content?: string | null } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new AIError("AI_EMPTY", "Model returned an empty completion");
  }
  return { content, model: typeof data.model === "string" ? data.model : env.OPENROUTER_MODEL };
}

function extractErrorMessage(body: unknown): string | null {
  const err = (body as { error?: { message?: unknown } } | null)?.error;
  if (!err) return null;
  return typeof err.message === "string" ? err.message : "Unknown OpenRouter error";
}

function extractErrorCode(body: unknown): number | null {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  return typeof code === "number" ? code : null;
}

export function mapHttpError(status: number, message: string): AIError {
  const m = message.toLowerCase();
  if (status === 404 || m.includes("no endpoints") || m.includes("not a valid model") || m.includes("model not found")) {
    return new AIError("AI_MODEL_UNAVAILABLE", "Configured model is unavailable on OpenRouter", message);
  }
  if (status === 401 || status === 403) return new AIError("AI_AUTH", "OpenRouter rejected the API key", message);
  if (status === 402) return new AIError("AI_CREDITS", "OpenRouter account has insufficient credits", message);
  if (status === 429) return new AIError("AI_RATE_LIMITED", "OpenRouter rate limit reached", message);
  if (status === 408) return new AIError("AI_TIMEOUT", "Provider timed out", message);
  return new AIError("AI_UPSTREAM", `OpenRouter error ${status}`, message);
}
