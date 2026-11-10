import { apiError, apiOk, getClientIp, internalError, readJson } from "@/lib/http";
import { checkRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { trackRequestSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashTrackingSecret, verifyTrackingSecret } from "@/lib/tracking";

const NOT_FOUND = "رقم البلاغ أو رمز المتابعة غير صحيح.";

export async function POST(req: Request) {
  try {
    if (!(await checkRateLimit("track", getClientIp(req)))) {
      return apiError(429, "RATE_LIMITED", "محاولات كثيرة خلال وقت قصير. انتظر بضع دقائق ثم أعد المحاولة.");
    }
    const body = await readJson(req, trackRequestSchema, 2_000);
    if (!body.ok) return body.response;
    const { ticketNumber, secret } = body.data;

    const admin = getSupabaseAdmin();
    const { data: report, error } = await admin
      .from("reports")
      .select("id, ticket_number, title, summary, category, priority, status, created_at, updated_at, location_text, tracking_hash, locations(name_ar)")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (error) throw error;

    // Same work on the miss path so response timing does not reveal which ticket numbers exist.
    if (!report) {
      hashTrackingSecret(secret);
      return apiError(404, "NOT_FOUND", NOT_FOUND);
    }
    if (!verifyTrackingSecret(secret, report.tracking_hash)) return apiError(404, "NOT_FOUND", NOT_FOUND);

    const { data: events, error: evError } = await admin
      .from("report_events")
      .select("event_type, previous_status, new_status, created_at")
      .eq("report_id", report.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });
    if (evError) throw evError;

    const loc = report.locations as unknown as { name_ar: string } | null;
    return apiOk({
      ticketNumber: report.ticket_number,
      title: report.title,
      summary: report.summary,
      category: report.category,
      priority: report.priority,
      status: report.status,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      location: loc?.name_ar ?? report.location_text,
      history: events ?? [],
    });
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return apiError(503, "RATE_LIMIT_UNAVAILABLE", "الخدمة غير متاحة مؤقتًا. حاول بعد قليل.");
    }
    return internalError(err, "track");
  }
}
