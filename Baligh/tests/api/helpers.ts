import { vi } from "vitest";

export const ENV = {
  OPENROUTER_API_KEY: "sk-or-test-key-1234567890",
  OPENROUTER_MODEL: "meta-llama/llama-3.1-8b-instruct:free",
  REPORT_SIGNING_SECRET: "test-secret-test-secret-test-secret-123456",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

export function setEnv() {
  Object.assign(process.env, ENV);
}

export function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Builds a fake OpenRouter chat completion response. */
export function completion(content: unknown, model = ENV.OPENROUTER_MODEL) {
  return new Response(
    JSON.stringify({ id: "gen-1", model, choices: [{ message: { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

export function mockFetchSequence(...responses: Array<Response | Error>) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const ROOM = { id: "11111111-1111-4111-8111-111111111111", code: "ROOM-204", name_ar: "قاعة 204", building: "المبنى أ", floor: "الدور الثاني", area: null };
export const WC = { id: "22222222-2222-4222-8222-222222222222", code: "WC-F2", name_ar: "دورة مياه الدور الثاني", building: null, floor: null, area: null };
