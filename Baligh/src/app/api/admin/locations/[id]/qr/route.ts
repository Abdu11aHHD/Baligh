import { isUuid, withAdmin } from "@/lib/admin-api";
import { apiError } from "@/lib/http";
import { renderQrPng, renderQrSvg } from "@/lib/qr";
import { buildReportUrl, SiteUrlError } from "@/lib/site-url";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAdmin<Ctx>(async (req, { supabase }, { params }) => {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "INVALID_ID", "معرّف الموقع غير صالح.");
  const search = new URL(req.url).searchParams;
  const format = search.get("format") === "svg" ? "svg" : "png";
  const download = search.get("download") === "1";

  const { data: loc, error } = await supabase.from("locations").select("code").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!loc) return apiError(404, "NOT_FOUND", "الموقع غير موجود.");

  let url: string;
  try {
    url = buildReportUrl(loc.code);
  } catch (e) {
    if (e instanceof SiteUrlError) return apiError(503, "SITE_URL_INVALID", `لا يمكن توليد رمز QR: ${e.message}`);
    throw e;
  }

  const filename = `balligh-qr-${loc.code}.${format}`;
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
  };
  if (format === "svg") {
    return new Response(await renderQrSvg(url), { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" } });
  }
  return new Response(new Uint8Array(await renderQrPng(url)), { headers: { ...headers, "Content-Type": "image/png" } });
}, "admin-location-qr");
