import { withAdmin } from "@/lib/admin-api";
import { listReports, reportFiltersSchema } from "@/lib/data/admin-reports";
import { apiOk } from "@/lib/http";

export const GET = withAdmin(async (req, { supabase }) => {
  const filters = reportFiltersSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await listReports(supabase, filters);
  return apiOk({ ...result, page: filters.page });
}, "admin-reports-list");
