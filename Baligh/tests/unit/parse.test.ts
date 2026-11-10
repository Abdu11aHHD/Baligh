import { describe, expect, it } from "vitest";
import { AIError } from "@/lib/llm/errors";
import { extractJsonObject, isLocationQuestion, normalizeModelOutput } from "@/lib/llm/parse";

const ready = {
  status: "ready",
  reply: "تم فهم بلاغك.",
  question: null,
  title: "نقص المناديل في دورة مياه الدور الثاني",
  summary: "لا توجد مناديل منذ الصباح.",
  category: "facilities",
  subcategory: "supplies",
  priority: "normal",
  priorityReason: "نقص مستلزمات.",
  department: "facilities",
  location: null,
  missingFields: [],
};

describe("extractJsonObject", () => {
  it("parses a bare object", () => {
    expect(extractJsonObject(JSON.stringify(ready))).toEqual(ready);
  });
  it("strips code fences and surrounding prose", () => {
    const raw = "Here is the JSON:\n```json\n" + JSON.stringify(ready) + "\n```\nThanks!";
    expect(extractJsonObject(raw)).toEqual(ready);
  });
  it("handles braces inside strings", () => {
    const obj = { ...ready, summary: "نص فيه { قوس } داخل" };
    expect(extractJsonObject(`x ${JSON.stringify(obj)} y`)).toEqual(obj);
  });
  it("throws AI_INVALID_OUTPUT when there is no JSON", () => {
    expect(() => extractJsonObject("عذرًا لا أستطيع")).toThrow(AIError);
  });
  it("throws on truncated JSON", () => {
    expect(() => extractJsonObject('{"status":"ready","title":"x"')).toThrow(/Unterminated/);
  });
});

describe("normalizeModelOutput", () => {
  it("accepts a valid ready result", () => {
    const r = normalizeModelOutput(ready);
    expect(r.status).toBe("ready");
    expect(r.draft).toMatchObject({ category: "facilities", subcategory: "supplies", priority: "normal", department: "facilities" });
    expect(r.coerced).toEqual([]);
  });

  it("coerces unknown enums to safe defaults instead of persisting arbitrary strings", () => {
    const r = normalizeModelOutput({ ...ready, category: "plumbing stuff", subcategory: "x", priority: "super", department: "janitors" });
    expect(r.draft).toMatchObject({ category: "other", subcategory: "other", priority: "normal", department: "general" });
    expect(r.coerced.length).toBeGreaterThan(0);
  });

  it("maps common aliases", () => {
    const r = normalizeModelOutput({ ...ready, category: "IT", subcategory: "internet_wifi", priority: "عالية", department: "it_support" });
    expect(r.draft).toMatchObject({ category: "it_support", subcategory: "internet_wifi", priority: "high", department: "it" });
  });

  it("fixes subcategory that does not belong to category", () => {
    const r = normalizeModelOutput({ ...ready, category: "maintenance", subcategory: "supplies" });
    expect(r.draft?.subcategory).toBe("general_repairs");
  });

  it("turns 'ready' without title into a clarification when a question exists", () => {
    const r = normalizeModelOutput({ status: "ready", question: "في أي قاعة؟", title: "", summary: "" });
    expect(r.status).toBe("needs_clarification");
    expect(r.question).toBe("في أي قاعة؟");
  });

  it("rejects clarification without a question and without a draft", () => {
    expect(() => normalizeModelOutput({ status: "needs_clarification" })).toThrow(AIError);
  });

  it("rejects unknown status", () => {
    expect(() => normalizeModelOutput({ ...ready, status: "banana" })).toThrow(/Unknown status/);
  });

  it("strips control characters and truncates long text", () => {
    const r = normalizeModelOutput({ ...ready, title: "عنوان\u0000\u202E طويل ".repeat(30) });
    expect(r.draft!.title.length).toBeLessThanOrEqual(120);
    expect(r.draft!.title).not.toMatch(/[\u0000\u202E]/);
  });

  it("rejects non-object output", () => {
    expect(() => normalizeModelOutput(["ready"])).toThrow(AIError);
  });
});

describe("isLocationQuestion", () => {
  it.each(["في أي قاعة تواجه المشكلة؟", "وين المكان بالضبط؟", "ما رقم القاعة؟"])("detects %s", (q) => {
    expect(isLocationQuestion(q)).toBe(true);
  });
  it("ignores non-location questions", () => {
    expect(isLocationQuestion("هل الشاشة لا تعمل نهائيًا؟")).toBe(false);
  });
});
