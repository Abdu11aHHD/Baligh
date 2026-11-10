import { resolveLocationByCode } from "@/lib/data/locations";
import { apiError, apiOk, getClientIp, internalError } from "@/lib/http";
import { checkRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { locationCodeSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  try {
    if (!(await checkRateLimit("resolve", getClientIp(req)))) {
      return apiError(429, "RATE_LIMITED", "طلبات كثيرة. حاول بعد دقيقة.");
    }
    const code = locationCodeSchema.safeParse(new URL(req.url).searchParams.get("code") ?? "");
    if (!code.success) return apiError(400, "INVALID_LOCATION", "رمز الموقع غير صالح.");
    const result = await resolveLocationByCode(code.data);
    if (result.status === "unknown") return apiError(404, "INVALID_LOCATION", "رمز الموقع غير معروف.");
    if (result.status === "inactive") return apiError(410, "LOCATION_INACTIVE", "هذا الموقع غير متاح للبلاغات حاليًا.");
    return apiOk({ location: result.location });
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return apiError(503, "RATE_LIMIT_UNAVAILABLE", "الخدمة غير متاحة مؤقتًا. حاول بعد قليل.");
    }
    return internalError(err, "resolve-location");
  }
}
