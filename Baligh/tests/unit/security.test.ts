import { beforeAll, describe, expect, it } from "vitest";
import { hashConversation, signAnalysisToken, verifyAnalysisToken } from "@/lib/analysis-token";
import { analyzeRequestSchema, createReportSchema, trackRequestSchema, cleanText } from "@/lib/schemas";
import { buildReportUrl, getSiteUrl } from "@/lib/site-url";
import { generateTrackingSecret, hashTrackingSecret, verifyTrackingSecret } from "@/lib/tracking";

beforeAll(() => {
  process.env.REPORT_SIGNING_SECRET = "test-secret-test-secret-test-secret-123456";
});

describe("tracking secrets", () => {
  it("are high-entropy, url-safe and unique", () => {
    const a = generateTrackingSecret();
    const b = generateTrackingSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });
  it("verify only the right secret against the stored hash", () => {
    const s = generateTrackingSecret();
    const h = hashTrackingSecret(s);
    expect(h).toHaveLength(64);
    expect(verifyTrackingSecret(s, h)).toBe(true);
    expect(verifyTrackingSecret(generateTrackingSecret(), h)).toBe(false);
  });
});

describe("analysis token", () => {
  const ai = { title: "t", category: "facilities", subcategory: "supplies", priority: "normal", department: "facilities", priorityReason: "r" } as const;
  const make = (desc: string, now = Date.now()) =>
    signAnalysisToken({ h: hashConversation(desc, []), loc: null, ai, f: [], m: "meta-llama/x" }, now);

  it("round-trips for the same conversation", () => {
    const t = make("ما فيه مناديل");
    const r = verifyAnalysisToken(t, "ما فيه مناديل", []);
    expect(r.ok).toBe(true);
  });
  it("rejects a different description", () => {
    expect(verifyAnalysisToken(make("أ"), "ب", [])).toEqual({ ok: false, reason: "mismatch" });
  });
  it("rejects tampered payloads", () => {
    const [body, mac] = make("x").split(".");
    const forged = Buffer.from(JSON.parse(Buffer.from(body, "base64url").toString()) && JSON.stringify({ v: 1, h: hashConversation("x", []), loc: null, ai: { ...ai, priority: "low" }, f: [], m: "z", iat: Date.now() })).toString("base64url");
    expect(verifyAnalysisToken(`${forged}.${mac}`, "x", []).ok).toBe(false);
  });
  it("expires", () => {
    const t = make("x", Date.now() - 60 * 60 * 1000);
    expect(verifyAnalysisToken(t, "x", [])).toEqual({ ok: false, reason: "expired" });
  });
  it("rejects garbage", () => {
    expect(verifyAnalysisToken("abc", "x", []).ok).toBe(false);
  });
});

describe("input schemas", () => {
  it("rejects empty and whitespace-only descriptions", () => {
    expect(analyzeRequestSchema.safeParse({ description: "" }).success).toBe(false);
    expect(analyzeRequestSchema.safeParse({ description: "    \n  " }).success).toBe(false);
  });
  it("rejects over-long descriptions", () => {
    expect(analyzeRequestSchema.safeParse({ description: "ا".repeat(1001) }).success).toBe(false);
  });
  it("normalises location codes and rejects injection-y ones", () => {
    expect(analyzeRequestSchema.parse({ description: "المكيف خربان", locationCode: "room-204" }).locationCode).toBe("ROOM-204");
    expect(analyzeRequestSchema.safeParse({ description: "المكيف خربان", locationCode: "x' or 1=1" }).success).toBe(false);
  });
  it("caps clarification turns", () => {
    const turn = { question: "س", answer: "ج" };
    expect(analyzeRequestSchema.safeParse({ description: "النت خربان", turns: [turn, turn, turn, turn] }).success).toBe(false);
  });
  it("only accepts controlled categories when creating", () => {
    const base = { analysisToken: "x".repeat(30), description: "نص البلاغ", title: "عنوان", summary: "ملخص", category: "facilities", subcategory: "supplies", priority: "normal" };
    expect(createReportSchema.safeParse(base).success).toBe(true);
    expect(createReportSchema.safeParse({ ...base, category: "hacking" }).success).toBe(false);
    expect(createReportSchema.safeParse({ ...base, priority: "critical" }).success).toBe(false);
  });
  it("validates tracking credentials format", () => {
    expect(trackRequestSchema.safeParse({ ticketNumber: "blg-000123", secret: "a".repeat(32) }).success).toBe(true);
    expect(trackRequestSchema.safeParse({ ticketNumber: "BLG-1", secret: "a".repeat(32) }).success).toBe(false);
    expect(trackRequestSchema.safeParse({ ticketNumber: "BLG-000123", secret: "short" }).success).toBe(false);
  });
  it("cleanText removes bidi overrides and control chars", () => {
    expect(cleanText(" a\u202Eb\u0007c  ")).toBe("abc");
  });
});

describe("site URL for QR codes", () => {
  it("builds report URLs on the configured origin", () => {
    expect(buildReportUrl("ROOM-204", "https://balligh.example.com")).toBe("https://balligh.example.com/report?loc=ROOM-204");
  });
  it("refuses localhost in production", () => {
    expect(() => getSiteUrl("http://localhost:3000", "production")).toThrow(/localhost/);
    expect(() => getSiteUrl("http://balligh.example.com", "production")).toThrow(/https/);
  });
  it("allows localhost in development", () => {
    expect(getSiteUrl("http://localhost:3000/", "development")).toBe("http://localhost:3000");
  });
});
