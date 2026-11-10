import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { LIMITS } from "./constants";
import { ConfigError } from "./env";

export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string, string> } };

export function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, ...(fields ? { fields } : {}) } }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** Reads a JSON body with a hard size cap, then validates it with Zod. */
export async function readJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
  maxBytes: number = LIMITS.requestBytes,
): Promise<ParseResult<z.infer<S>>> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, response: apiError(413, "PAYLOAD_TOO_LARGE", "حجم الطلب أكبر من المسموح.") };
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return { ok: false, response: apiError(415, "UNSUPPORTED_MEDIA_TYPE", "صيغة الطلب غير مدعومة.") };
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { ok: false, response: apiError(413, "PAYLOAD_TOO_LARGE", "حجم الطلب أكبر من المسموح.") };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: apiError(400, "INVALID_JSON", "تعذّر قراءة الطلب.") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fields[k] ??= issue.message;
    }
    const first = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
    return { ok: false, response: apiError(400, "VALIDATION_ERROR", first, fields) };
  }
  return { ok: true, data: parsed.data };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Converts unexpected server errors into a safe response without leaking internals. */
export function internalError(err: unknown, context: string) {
  if (err instanceof ConfigError) {
    console.error(`[${context}] configuration error:`, err.message);
    return apiError(503, "SERVICE_NOT_CONFIGURED", "الخدمة غير مهيأة بالكامل حاليًا. تواصل مع مسؤول المنصة.");
  }
  console.error(`[${context}]`, err);
  return apiError(500, "INTERNAL_ERROR", "حدث خطأ غير متوقع. حاول مرة أخرى.");
}
