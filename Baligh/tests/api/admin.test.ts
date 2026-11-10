import { describe, expect, it, vi } from "vitest";

const getAdminSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getAdminSession }));

const { GET: listReports } = await import("@/app/api/admin/reports/route");
const { PATCH: updateReport } = await import("@/app/api/admin/reports/[id]/route");
const { POST: createLocation } = await import("@/app/api/admin/locations/route");

const ctx = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };
const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/admin/x", { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

describe("admin API authorization", () => {
  it("rejects anonymous users on every admin route", async () => {
    getAdminSession.mockResolvedValue(null);
    expect((await listReports(req("GET"), undefined)).status).toBe(401);
    expect((await updateReport(req("PATCH", { status: "resolved" }), ctx)).status).toBe(401);
    expect((await createLocation(req("POST", { code: "X-1", name_ar: "اختبار" }), undefined)).status).toBe(401);
  });

  it("passes admin updates to the audited RPC and maps DB permission errors", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "not authorized" } });
    getAdminSession.mockResolvedValue({ user: { id: "u" }, role: "admin", supabase: { rpc } });
    const res = await updateReport(req("PATCH", { status: "resolved", note: "تم" }), ctx);
    expect(res.status).toBe(403);
    expect(rpc).toHaveBeenCalledWith("admin_update_report", {
      p_report_id: "11111111-1111-4111-8111-111111111111",
      p_status: "resolved",
      p_priority: null,
      p_department: null,
      p_note: "تم",
    });
  });

  it("validates admin updates", async () => {
    getAdminSession.mockResolvedValue({ user: { id: "u" }, role: "admin", supabase: { rpc: vi.fn() } });
    expect((await updateReport(req("PATCH", { status: "deleted" }), ctx)).status).toBe(400);
    expect((await updateReport(req("PATCH", {}), ctx)).status).toBe(400);
    const bad = { params: Promise.resolve({ id: "not-a-uuid" }) };
    expect((await updateReport(req("PATCH", { status: "resolved" }), bad)).status).toBe(400);
  });
});
