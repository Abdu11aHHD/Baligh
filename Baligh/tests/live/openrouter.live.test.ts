/**
 * LIVE integration test — calls the real OpenRouter API with the configured
 * Meta Llama model. Not part of `npm test`. Run with:
 *
 *   npm run test:live
 *
 * Requires OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.local (loaded by the script).
 */
import { describe, expect, it } from "vitest";
import { analyzeReport } from "@/lib/llm/analyze";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";

const hasKey = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);

describe.skipIf(!hasKey)(`live Meta Llama via OpenRouter (${process.env.OPENROUTER_MODEL})`, () => {
  it("analyzes a Saudi-dialect report with a known QR location", async () => {
    const r = await analyzeReport({ description: "ما فيه مناديل من الصباح", turns: [], locationName: "دورة مياه الدور الثاني" });
    console.log("[live] model:", r.model, "\n[live] result:", JSON.stringify(r, null, 2));
    expect(r.model.startsWith("meta-llama/")).toBe(true);
    expect(r.status).toBe("ready");
    expect(CATEGORIES).toContain(r.draft.category);
    expect(PRIORITIES).toContain(r.draft.priority);
    expect(r.draft.title.length).toBeGreaterThan(3);
  });

  it("asks for a location when none is known (or produces a ticket noting it)", async () => {
    const r = await analyzeReport({ description: "النت ما يشتغل", turns: [], locationName: null });
    console.log("[live] clarification:", r.status, r.question);
    expect(["ready", "needs_clarification"]).toContain(r.status);
    if (r.status === "needs_clarification") expect(r.question).toBeTruthy();
  });

  it("keeps hazards urgent regardless of the model", async () => {
    const r = await analyzeReport({ description: "فيه سلك كهربائي مكشوف عند باب القاعة", turns: [], locationName: "قاعة 204" });
    expect(r.draft.priority).toBe("urgent");
    expect(r.safety.immediateDanger).toBe(true);
  });
});
