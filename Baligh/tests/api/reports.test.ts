import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { jsonRequest, ROOM, setEnv } from "./helpers";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ rpc, from }) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => true), RateLimitUnavailableError: class extends Error {} }));
vi.mock("@/lib/data/locations", () => ({
  getActiveLocationById: vi.fn(async (id: string) => (id === ROOM.id ? ROOM : null)),
}));

const { POST: create } = await import("@/app/api/reports/route");
const { POST: track } = await import("@/app/api/reports/track/route");
const { signAnalysisToken, hashConversation } = await import("@/lib/analysis-token");

const AI = { title: "سلك مكشوف", category: "maintenance", subcategory: "electrical", priority: "normal", department: "maintenance", priorityReason: "r" } as const;

function token(description: string, loc: string | null = ROOM.id) {
  return signAnalysisToken({ h: hashConversation(description, []), loc, ai: AI, f: [], m: "meta-llama/llama-3.1-8b-instruct:free" });
}

function body(description: string, extra: Record<string, unknown> = {}) {
  return {
    analysisToken: token(description),
    description,
    turns: [],
    title: "سلك كهربائي مكشوف",
    summary: "يوجد سلك مكشوف عند الباب.",
    category: "maintenance",
    subcategory: "electrical",
    priority: "low",
    ...extra,
  };
}

beforeEach(() => {
  setEnv();
  rpc.mockReset();
  from.mockReset();
  rpc.mockResolvedValue({ data: [{ id: "r1", ticket_number: "BLG-000123", created_at: "2026-11-02T10:00:00Z" }], error: null });
});

describe("POST /api/reports", () => {
  it("creates a ticket, enforces the safety floor server-side and stores only the secret hash", async () => {
    const res = await create(jsonRequest("/api/reports", body("فيه سلك كهربائي مكشوف عند الباب")));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ticketNumber).toBe("BLG-000123");
    expect(json.priority).toBe("urgent"); // client asked for "low"
    expect(json.trackingSecret).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const p = rpc.mock.calls[0][1].p;
    expect(rpc.mock.calls[0][0]).toBe("create_report");
    expect(p.priority).toBe("urgent");
    expect(p.ai_priority).toBe("normal");
    expect(p.assigned_department).toBe("safety");
    expect(p.safety_flags).toContain("exposed_wiring");
    expect(p.location_id).toBe(ROOM.id);
    expect(p.tracking_hash).toBe(createHash("sha256").update(json.trackingSecret).digest("hex"));
    expect(JSON.stringify(p)).not.toContain(json.trackingSecret);
  });

  it("refuses tickets whose text changed after analysis", async () => {
    const res = await create(jsonRequest("/api/reports", { ...body("ما فيه مناديل"), description: "نص مختلف تمامًا" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("ANALYSIS_REQUIRED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses forged tokens", async () => {
    const res = await create(jsonRequest("/api/reports", { ...body("ما فيه مناديل"), analysisToken: "eyJ2IjoxfQ.forgedsignature123456" }));
    expect(res.status).toBe(400);
  });

  it("requires a location when neither QR nor manual location is present", async () => {
    const d = "ما فيه مناديل";
    const res = await create(jsonRequest("/api/reports", { ...body(d, { category: "facilities", subcategory: "supplies" }), analysisToken: token(d, null) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("LOCATION_REQUIRED");
  });

  it("accepts a free-text location when no registered one exists", async () => {
    const d = "ما فيه مناديل";
    const res = await create(
      jsonRequest("/api/reports", { ...body(d, { category: "facilities", subcategory: "supplies", locationText: "معمل الشبكات" }), analysisToken: token(d, null) }),
    );
    expect(res.status).toBe(201);
    const p = rpc.mock.calls[0][1].p;
    expect(p.location_id).toBeNull();
    expect(p.location_text).toBe("معمل الشبكات");
    expect(p.assigned_department).toBe("facilities"); // category changed → default department
  });

  it("rejects a disabled/unknown manual location", async () => {
    const res = await create(jsonRequest("/api/reports", body("ما فيه مناديل", { locationId: "33333333-3333-4333-8333-333333333333" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_LOCATION");
  });

  it("rejects subcategories that do not belong to the category", async () => {
    const res = await create(jsonRequest("/api/reports", body("ما فيه مناديل", { category: "facilities", subcategory: "electrical" })));
    expect(res.status).toBe(400);
  });
});

function trackQuery(report: unknown, events: unknown[] = []) {
  const reportsChain = { select: () => reportsChain, eq: () => reportsChain, maybeSingle: async () => ({ data: report, error: null }) };
  const eventsChain = { select: () => eventsChain, eq: () => eventsChain, order: async () => ({ data: events, error: null }) };
  from.mockImplementation((table: string) => (table === "reports" ? reportsChain : eventsChain));
}

describe("POST /api/reports/track", () => {
  const secret = "A".repeat(32);
  const report = {
    id: "r1",
    ticket_number: "BLG-000123",
    title: "t",
    summary: "s",
    category: "facilities",
    priority: "normal",
    status: "in_progress",
    created_at: "2026-11-02T10:00:00Z",
    updated_at: "2026-11-02T11:00:00Z",
    location_text: null,
    tracking_hash: createHash("sha256").update(secret).digest("hex"),
    locations: { name_ar: "قاعة 204" },
  };

  it("returns the ticket with public history only for the correct secret", async () => {
    trackQuery(report, [{ event_type: "created", new_status: "new", previous_status: null, created_at: "x" }]);
    const res = await track(jsonRequest("/api/reports/track", { ticketNumber: "BLG-000123", secret }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ticketNumber: "BLG-000123", status: "in_progress", location: "قاعة 204" });
    expect(json).not.toHaveProperty("tracking_hash");
    expect(json).not.toHaveProperty("raw_description");
  });

  it("returns the same 404 for a wrong secret and an unknown ticket", async () => {
    trackQuery(report);
    const wrong = await track(jsonRequest("/api/reports/track", { ticketNumber: "BLG-000123", secret: "B".repeat(32) }));
    trackQuery(null);
    const missing = await track(jsonRequest("/api/reports/track", { ticketNumber: "BLG-999999", secret }));
    expect(wrong.status).toBe(404);
    expect(missing.status).toBe(404);
    expect((await wrong.json()).error.message).toBe((await missing.json()).error.message);
  });
});
