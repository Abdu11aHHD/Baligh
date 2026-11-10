import { isUuid, withAdmin } from "@/lib/admin-api";
import { getReportDetail } from "@/lib/data/admin-reports";
import { apiError, apiOk, readJson } from "@/lib/http";
import { adminReportUpdateSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAdmin<Ctx>(async (_req, { supabase }, { params }) => {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "INVALID_ID", "معرّف البلاغ غير صالح.");
  const detail = await getReportDetail(supabase, id);
  if (!detail) return apiError(404, "NOT_FOUND", "البلاغ غير موجود.");
  return apiOk(detail);
}, "admin-report-detail");

export const PATCH = withAdmin<Ctx>(async (req, { supabase }, { params }) => {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "INVALID_ID", "معرّف البلاغ غير صالح.");
  const body = await readJson(req, adminReportUpdateSchema, 4_000);
  if (!body.ok) return body.response;
  const { status, priority, department, note } = body.data;

  const { data, error } = await supabase.rpc("admin_update_report", {
    p_report_id: id,
    p_status: status ?? null,
    p_priority: priority ?? null,
    p_department: department ?? null,
    p_note: note && note.length > 0 ? note : null,
  });
  if (error) {
    if (error.code === "42501") return apiError(403, "FORBIDDEN", "ليست لديك صلاحية تعديل البلاغات.");
    if (error.code === "P0002") return apiError(404, "NOT_FOUND", "البلاغ غير موجود.");
    throw error;
  }
  return apiOk({ report: data });
}, "admin-report-update");
