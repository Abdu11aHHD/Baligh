export type AIErrorCode =
  | "AI_CONFIG"
  | "AI_AUTH"
  | "AI_CREDITS"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_UPSTREAM"
  | "AI_EMPTY"
  | "AI_INVALID_OUTPUT"
  | "AI_INCOMPLETE";

export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

/** Trainee-facing Arabic messages + HTTP status for each failure mode. */
export const AI_ERROR_RESPONSES: Record<AIErrorCode, { status: number; message: string }> = {
  AI_CONFIG: { status: 503, message: "خدمة التحليل الذكي غير مهيأة حاليًا. تواصل مع مسؤول المنصة." },
  AI_AUTH: { status: 503, message: "تعذّر الاتصال بخدمة التحليل الذكي بسبب إعدادات المصادقة. تواصل مع مسؤول المنصة." },
  AI_CREDITS: { status: 503, message: "رصيد خدمة التحليل الذكي غير كافٍ حاليًا. حاول لاحقًا." },
  AI_MODEL_UNAVAILABLE: { status: 503, message: "نموذج Llama المحدد غير متاح حاليًا. حاول بعد قليل." },
  AI_RATE_LIMITED: { status: 429, message: "خدمة التحليل مشغولة الآن. انتظر دقيقة ثم أعد المحاولة." },
  AI_TIMEOUT: { status: 504, message: "استغرق التحليل وقتًا أطول من المتوقع. أعد المحاولة." },
  AI_UPSTREAM: { status: 502, message: "حدث خلل مؤقت في خدمة التحليل. أعد المحاولة." },
  AI_EMPTY: { status: 502, message: "لم يرجع النموذج أي نتيجة. أعد المحاولة." },
  AI_INVALID_OUTPUT: { status: 502, message: "لم نتمكن من قراءة نتيجة التحليل. أعد المحاولة أو أعد صياغة الوصف." },
  AI_INCOMPLETE: { status: 422, message: "ما زالت بعض التفاصيل غير واضحة. أعد كتابة الوصف بتفاصيل أكثر ثم حلّل من جديد." },
};
