import { signAnalysisToken, hashConversation } from "@/lib/analysis-token";
import { resolveLocationByCode, type PublicLocation } from "@/lib/data/locations";
import { apiError, apiOk, getClientIp, internalError, readJson } from "@/lib/http";
import { analyzeReport } from "@/lib/llm/analyze";
import { AIError, AI_ERROR_RESPONSES } from "@/lib/llm/errors";
import { checkRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { analyzeRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (!(await checkRateLimit("analyze", getClientIp(req)))) {
      return apiError(429, "RATE_LIMITED", "أرسلت طلبات تحليل كثيرة خلال وقت قصير. انتظر بضع دقائق ثم أعد المحاولة.");
    }

    const body = await readJson(req, analyzeRequestSchema);
    if (!body.ok) return body.response;
    const { description, turns, locationCode } = body.data;

    let location: PublicLocation | null = null;
    if (locationCode) {
      const lookup = await resolveLocationByCode(locationCode);
      if (lookup.status !== "ok") {
        return apiError(
          400,
          lookup.status === "inactive" ? "LOCATION_INACTIVE" : "INVALID_LOCATION",
          lookup.status === "inactive"
            ? "هذا الموقع غير متاح للبلاغات حاليًا. اختر موقعًا آخر من القائمة."
            : "رمز الموقع غير معروف. اختر الموقع من القائمة.",
        );
      }
      location = lookup.location;
    }

    const result = await analyzeReport({ description, turns, locationName: location?.name_ar ?? null });

    const analysisToken =
      result.status === "ready"
        ? signAnalysisToken({
            h: hashConversation(description, turns),
            loc: location?.id ?? null,
            ai: {
              title: result.draft.title,
              category: result.draft.category,
              subcategory: result.draft.subcategory,
              priority: result.aiPriority,
              department: result.draft.department,
              priorityReason: result.draft.priorityReason,
            },
            f: result.safety.flags,
            m: result.model,
          })
        : null;

    return apiOk({
      status: result.status,
      reply: result.reply,
      question: result.question,
      draft: result.status === "ready" ? result.draft : null,
      aiPriority: result.aiPriority,
      safety: result.safety,
      location: location ? { id: location.id, code: location.code, name_ar: location.name_ar } : null,
      locationText: result.locationText,
      missingFields: result.missingFields,
      model: result.model,
      analysisToken,
    });
  } catch (err) {
    if (err instanceof AIError) {
      const { status, message } = AI_ERROR_RESPONSES[err.code];
      console.error(`[analyze] ${err.code}: ${err.message}${err.detail ? ` — ${err.detail}` : ""}`);
      return apiError(status, err.code, message);
    }
    if (err instanceof RateLimitUnavailableError) {
      console.error("[analyze] rate limiter unavailable:", err.message);
      return apiError(503, "RATE_LIMIT_UNAVAILABLE", "الخدمة غير متاحة مؤقتًا. حاول بعد قليل.");
    }
    return internalError(err, "analyze");
  }
}
