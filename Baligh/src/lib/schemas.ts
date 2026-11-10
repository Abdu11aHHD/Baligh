import { z } from "zod";
import { CATEGORIES, DEPARTMENTS, LIMITS, PRIORITIES, STATUSES, ALL_SUBCATEGORIES } from "./constants";

/** Removes control characters (keeps newlines/tabs), collapses runs of blank space, trims. */
export function cleanText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (min: number, max: number, msg: string) =>
  z.string().transform(cleanText).pipe(z.string().min(min, msg).max(max, msg));

export const locationCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,31}$/, "رمز الموقع غير صالح");

export const turnSchema = z.object({
  question: text(1, 300, "سؤال التوضيح غير صالح"),
  answer: text(1, LIMITS.answerMax, `الإجابة يجب أن تكون بين 1 و ${LIMITS.answerMax} حرفًا`),
});
export type Turn = z.infer<typeof turnSchema>;

export const descriptionSchema = text(
  LIMITS.descriptionMin,
  LIMITS.descriptionMax,
  `وصف المشكلة يجب أن يكون بين ${LIMITS.descriptionMin} و ${LIMITS.descriptionMax} حرفًا`,
);

export const analyzeRequestSchema = z.object({
  locationCode: locationCodeSchema.optional().nullable(),
  description: descriptionSchema,
  turns: z.array(turnSchema).max(LIMITS.maxClarifications).default([]),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const createReportSchema = z.object({
  analysisToken: z.string().min(20).max(4000),
  description: descriptionSchema,
  turns: z.array(turnSchema).max(LIMITS.maxClarifications).default([]),
  locationId: z.uuid().optional().nullable(),
  locationText: text(0, LIMITS.locationTextMax, "وصف الموقع طويل جدًا").optional().nullable(),
  title: text(4, LIMITS.titleMax, `العنوان يجب أن يكون بين 4 و ${LIMITS.titleMax} حرفًا`),
  summary: text(4, LIMITS.summaryMax, `الملخص يجب أن يكون بين 4 و ${LIMITS.summaryMax} حرفًا`),
  category: z.enum(CATEGORIES),
  subcategory: z.enum(ALL_SUBCATEGORIES as [string, ...string[]]),
  priority: z.enum(PRIORITIES),
});
export type CreateReportRequest = z.infer<typeof createReportSchema>;

export const ticketNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^BLG-\d{6,}$/, "رقم البلاغ غير صالح");

export const trackRequestSchema = z.object({
  ticketNumber: ticketNumberSchema,
  secret: z.string().trim().regex(/^[A-Za-z0-9_-]{20,64}$/, "رمز المتابعة غير صالح"),
});

export const adminReportUpdateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    department: z.enum(DEPARTMENTS).optional(),
    note: text(0, 1000, "الملاحظة طويلة جدًا").optional(),
  })
  .refine((v) => v.status || v.priority || v.department || (v.note && v.note.length > 0), {
    message: "لا يوجد تعديل لحفظه",
  });

export const locationInputSchema = z.object({
  code: locationCodeSchema,
  name_ar: text(2, 80, "اسم الموقع يجب أن يكون بين 2 و 80 حرفًا"),
  building: text(0, 60, "اسم المبنى طويل جدًا").optional().nullable(),
  floor: text(0, 30, "الدور طويل جدًا").optional().nullable(),
  area: text(0, 60, "المنطقة طويلة جدًا").optional().nullable(),
  is_active: z.boolean().default(true),
});
export const locationUpdateSchema = locationInputSchema.partial();
