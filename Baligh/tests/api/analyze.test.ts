import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completion, jsonRequest, mockFetchSequence, ROOM, setEnv, WC } from "./helpers";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => true),
  RateLimitUnavailableError: class extends Error {},
}));
vi.mock("@/lib/data/locations", () => ({
  resolveLocationByCode: vi.fn(async (code: string) => {
    if (code === "ROOM-204") return { status: "ok", location: ROOM };
    if (code === "WC-F2") return { status: "ok", location: WC };
    if (code === "OLD-1") return { status: "inactive" };
    return { status: "unknown" };
  }),
}));

const { POST } = await import("@/app/api/reports/analyze/route");
const { checkRateLimit } = await import("@/lib/rate-limit");

const READY = {
  status: "ready",
  reply: "تم فهم بلاغك.",
  question: null,
  title: "نقص المناديل في دورة مياه الدور الثاني",
  summary: "لا توجد مناديل في دورة المياه منذ الصباح.",
  category: "facilities",
  subcategory: "supplies",
  priority: "normal",
  priorityReason: "نقص مستلزمات.",
  department: "facilities",
  location: null,
  missingFields: [],
};

beforeEach(setEnv);
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/reports/analyze", () => {
  it("sends a real-shaped request to OpenRouter with the configured Llama model and the QR location", async () => {
    const fetchMock = mockFetchSequence(completion(READY));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "ما فيه مناديل من الصباح", locationCode: "wc-f2" }));
    expect(res.status).toBe(200);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-or-test-key-1234567890");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("meta-llama/llama-3.1-8b-instruct:free");
    expect(body.messages[1].content).toContain("دورة مياه الدور الثاني");
    expect(body.messages[1].content).toContain("ما فيه مناديل من الصباح");
    expect(body).not.toHaveProperty("models"); // no silent model fallback list

    const json = await res.json();
    expect(json.status).toBe("ready");
    expect(json.draft.category).toBe("facilities");
    expect(json.location.name_ar).toBe("دورة مياه الدور الثاني");
    expect(json.analysisToken).toMatch(/\./);
    expect(json.model).toBe("meta-llama/llama-3.1-8b-instruct:free");
  });

  it("returns a clarification question when the location is unknown", async () => {
    mockFetchSequence(
      completion({ ...READY, status: "needs_clarification", question: "في أي قاعة أو معمل تواجه المشكلة؟", title: "انقطاع الإنترنت", summary: "الإنترنت لا يعمل.", category: "it_support", subcategory: "internet_wifi", department: "it" }),
    );
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "النت ما يشتغل" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("needs_clarification");
    expect(json.question).toContain("قاعة");
    expect(json.draft).toBeNull();
    expect(json.analysisToken).toBeNull();
  });

  it("never asks for a location that is already known from the QR code", async () => {
    mockFetchSequence(completion({ ...READY, status: "needs_clarification", question: "في أي قاعة المشكلة؟" }));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "النت ما يشتغل", locationCode: "ROOM-204" }));
    const json = await res.json();
    expect(json.status).toBe("ready");
    expect(json.question).toBeNull();
  });

  it("rejects unknown and inactive QR codes before calling the model", async () => {
    const fetchMock = mockFetchSequence();
    const unknown = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان", locationCode: "NOPE-9" }));
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).error.code).toBe("INVALID_LOCATION");
    const inactive = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان", locationCode: "OLD-1" }));
    expect((await inactive.json()).error.code).toBe("LOCATION_INACTIVE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty reports", async () => {
    const fetchMock = mockFetchSequence();
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "   " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized and malformed bodies", async () => {
    const big = await POST(jsonRequest("/api/reports/analyze", { description: "ا".repeat(20_000) }));
    expect(big.status).toBe(413);
    const bad = await POST(jsonRequest("/api/reports/analyze", "{not json"));
    expect(bad.status).toBe(400);
  });

  it("repairs one malformed model answer, then succeeds", async () => {
    const fetchMock = mockFetchSequence(completion("حسنًا، إليك التحليل بدون JSON"), completion("```json\n" + JSON.stringify(READY) + "\n```"));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "ما فيه مناديل", locationCode: "WC-F2" }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails clearly (no fake result) when the model output stays invalid", async () => {
    mockFetchSequence(completion("لا"), completion("ما زلت لا"));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "ما فيه مناديل" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("AI_INVALID_OUTPUT");
  });

  it.each([
    [404, { error: { message: "No endpoints found for meta-llama/llama-3.1-8b-instruct:free." } }, 503, "AI_MODEL_UNAVAILABLE"],
    [429, { error: { message: "Rate limit exceeded" } }, 429, "AI_RATE_LIMITED"],
    [401, { error: { message: "User not found." } }, 503, "AI_AUTH"],
    [402, { error: { message: "Insufficient credits" } }, 503, "AI_CREDITS"],
    [500, { error: { message: "Internal" } }, 502, "AI_UPSTREAM"],
  ])("maps OpenRouter HTTP %i to %s", async (status, body, expectedStatus, code) => {
    mockFetchSequence(new Response(JSON.stringify(body), { status }));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان" }));
    expect(res.status).toBe(expectedStatus);
    expect((await res.json()).error.code).toBe(code);
  });

  it("handles an error object inside a 200 response", async () => {
    mockFetchSequence(new Response(JSON.stringify({ error: { code: 503, message: "Provider returned error" } }), { status: 200 }));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان" }));
    expect((await res.json()).error.code).toBe("AI_UPSTREAM");
  });

  it("maps timeouts", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    mockFetchSequence(abort);
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان" }));
    expect(res.status).toBe(504);
    expect((await res.json()).error.code).toBe("AI_TIMEOUT");
  });

  it("applies deterministic safety rules on top of a low AI priority", async () => {
    mockFetchSequence(completion({ ...READY, title: "سلك مكشوف", summary: "يوجد سلك مكشوف.", category: "maintenance", subcategory: "electrical", priority: "normal", department: "maintenance" }));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "فيه سلك كهربائي مكشوف عند الباب", locationCode: "ROOM-204" }));
    const json = await res.json();
    expect(json.aiPriority).toBe("normal");
    expect(json.draft.priority).toBe("urgent");
    expect(json.draft.department).toBe("safety");
    expect(json.safety).toMatchObject({ immediateDanger: true, raisedPriority: true, minPriority: "urgent" });
  });

  it("refuses to run with a non-Llama model configured", async () => {
    process.env.OPENROUTER_MODEL = "openai/gpt-4o";
    const fetchMock = mockFetchSequence();
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("AI_CONFIG");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing API key as a configuration error", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان" }));
    expect((await res.json()).error.code).toBe("AI_CONFIG");
  });

  it("enforces the rate limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(false);
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "المكيف خربان" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
  });

  it("forces a ticket after the last allowed clarification", async () => {
    const fetchMock = mockFetchSequence(completion({ ...READY, status: "needs_clarification", question: "سؤال رابع؟" }));
    const turns = [1, 2, 3].map((i) => ({ question: `سؤال ${i}`, answer: `جواب ${i}` }));
    const res = await POST(jsonRequest("/api/reports/analyze", { description: "مشكلة في القاعة", turns, locationCode: "ROOM-204" }));
    const json = await res.json();
    expect(json.status).toBe("ready");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content).toContain("No more questions are allowed");
  });
});
