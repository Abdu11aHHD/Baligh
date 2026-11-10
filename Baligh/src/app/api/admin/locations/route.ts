import { withAdmin } from "@/lib/admin-api";
import { apiError, apiOk, readJson } from "@/lib/http";
import { locationInputSchema } from "@/lib/schemas";

export const GET = withAdmin(async (_req, { supabase }) => {
  const { data, error } = await supabase.from("locations").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return apiOk({ locations: data });
}, "admin-locations-list");

export const POST = withAdmin(async (req, { supabase }) => {
  const body = await readJson(req, locationInputSchema, 4_000);
  if (!body.ok) return body.response;
  const { data, error } = await supabase.from("locations").insert(body.data).select("*").single();
  if (error) {
    if (error.code === "23505") return apiError(409, "DUPLICATE_CODE", "رمز الموقع مستخدم مسبقًا. اختر رمزًا آخر.");
    if (error.code === "42501") return apiError(403, "FORBIDDEN", "ليست لديك صلاحية إدارة المواقع.");
    throw error;
  }
  return apiOk({ location: data }, 201);
}, "admin-locations-create");
