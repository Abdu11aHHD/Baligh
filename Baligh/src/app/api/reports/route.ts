import { verifyAnalysisToken } from "@/lib/analysis-token";
import { DEFAULT_DEPARTMENT, subcategoryBelongsTo } from "@/lib/constants";
import { getActiveLocationById } from "@/lib/data/locations";
import { apiError, apiOk, getClientIp, internalError, readJson } from "@/lib/http";
import { checkRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { applySafetyFloor, assessSafety } from "@/lib/safety";
import { createReportSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateTrackingSecret, hashTrackingSecret } from "@/lib/tracking";

export async function POST(req: Request) {
  try {
    if (!(await checkRateLimit("create", getClientIp(req)))) {
      return apiError(429, "RATE_LIMITED", "أرسلت بلاغات كثيرة خلال وقت قصير. انتظر بضع دقائق ثم أعد المحاولة.");
    }
    const body = await readJson(req, createReportSchema);
    if (!body.ok) return body.response;
    const input = body.data;

    const token = verifyAnalysisToken(input.analysisToken, input.description, input.turns);
    if (!token.ok) {
      return apiError(
        400,
        "ANALYSIS_REQUIRED",
        token.reason === "expired"
          ? "انتهت صلاحية التحليل. حلّل البلاغ من جديد ثم أرسله."
          : "تغيّر وصف البلاغ بعد التحليل. حلّل البلاغ من جديد ثم أرسله.",
      );
    }
    const ai = token.payload.ai;

    if (!subcategoryBelongsTo(input.category, input.subcategory)) {
      return apiError(400, "VALIDATION_ERROR", "التصنيف الفرعي لا يتبع التصنيف المختار.");
    }

    // Location: explicit manual choice wins, then the QR location from analysis, then free text.
    const locationId = input.locationId ?? token.payload.loc;
    let resolvedLocationId: string | null = null;
    if (locationId) {
      const loc = await getActiveLocationById(locationId);
      if (!loc) return apiError(400, "INVALID_LOCATION", "الموقع المختار غير متاح. اختر موقعًا آخر.");
      resolvedLocationId = loc.id;
    }
    const locationText = input.locationText && input.locationText.length >= 2 ? input.locationText : null;
    if (!resolvedLocationId && !locationText) {
      return apiError(400, "LOCATION_REQUIRED", "حدّد موقع المشكلة قبل إرسال البلاغ.");
    }

    // Deterministic safety floor is recomputed server-side; client-submitted priority cannot go below it.
    const safety = assessSafety(input.description, ...input.turns.map((t) => t.answer));
    const priority = applySafetyFloor(input.priority, safety);
    let department = input.category === ai.category ? ai.department : DEFAULT_DEPARTMENT[input.category];
    if (safety.immediateDanger) department = "safety";

    const trackingSecret = generateTrackingSecret();
    const { data, error } = await getSupabaseAdmin().rpc("create_report", {
      p: {
        location_id: resolvedLocationId,
        location_text: resolvedLocationId ? null : locationText,
        raw_description: input.description,
        clarifications: input.turns,
        title: input.title,
        summary: input.summary,
        category: input.category,
        subcategory: input.subcategory,
        priority,
        assigned_department: department,
        ai_title: ai.title,
        ai_category: ai.category,
        ai_priority: ai.priority,
        ai_department: ai.department,
        ai_priority_reason: ai.priorityReason,
        ai_model: token.payload.m,
        safety_flags: safety.flags,
        safety_min_priority: safety.minPriority,
        tracking_hash: hashTrackingSecret(trackingSecret),
      },
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { ticket_number: string; created_at: string } | undefined;
    if (!row) throw new Error("create_report returned no row");

    return apiOk(
      {
        ticketNumber: row.ticket_number,
        trackingSecret,
        createdAt: row.created_at,
        priority,
        immediateDanger: safety.immediateDanger,
      },
      201,
    );
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return apiError(503, "RATE_LIMIT_UNAVAILABLE", "الخدمة غير متاحة مؤقتًا. حاول بعد قليل.");
    }
    return internalError(err, "create-report");
  }
}
