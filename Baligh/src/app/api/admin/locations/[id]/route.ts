import { isUuid, withAdmin } from "@/lib/admin-api";
import { apiError, apiOk, readJson } from "@/lib/http";
import { locationUpdateSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAdmin<Ctx>(async (req, { supabase }, { params }) => {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "INVALID_ID", "معرّف الموقع غير صالح.");
  const body = await readJson(req, locationUpdateSchema, 4_000);
  if (!body.ok) return body.response;
  if (Object.keys(body.data).length === 0) return apiError(400, "VALIDATION_ERROR", "لا يوجد تعديل لحفظه.");
  const { data, error } = await supabase.from("locations").update(body.data).eq("id", id).select("*").maybeSingle();
  if (error) {
    if (error.code === "23505") return apiError(409, "DUPLICATE_CODE", "رمز الموقع مستخدم مسبقًا. اختر رمزًا آخر.");
    throw error;
  }
  if (!data) return apiError(404, "NOT_FOUND", "الموقع غير موجود.");
  return apiOk({ location: data });
}, "admin-locations-update");
