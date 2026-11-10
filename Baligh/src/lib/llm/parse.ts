import { z } from "zod";
import {
  CATEGORIES,
  type Category,
  DEFAULT_DEPARTMENT,
  DEPARTMENTS,
  type Department,
  LIMITS,
  PRIORITIES,
  type Priority,
  type Subcategory,
  subcategoryBelongsTo,
} from "../constants";
import { cleanText } from "../schemas";
import { AIError } from "./errors";

/**
 * Extracts the first balanced JSON object from model output. Small models
 * sometimes wrap JSON in fences or add a sentence before it.
 */
export function extractJsonObject(raw: string): unknown {
  const text = raw.replace(/```(?:json)?/gi, "").trim();
  const start = text.indexOf("{");
  if (start === -1) throw new AIError("AI_INVALID_OUTPUT", "No JSON object in model output");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          throw new AIError("AI_INVALID_OUTPUT", "Model output is not valid JSON");
        }
      }
    }
  }
  throw new AIError("AI_INVALID_OUTPUT", "Unterminated JSON object in model output");
}

const optStr = z.union([z.string(), z.null()]).optional();

/** Loose shape: what we accept from the model before normalisation. */
export const rawModelOutputSchema = z.object({
  status: z.string(),
  reply: optStr,
  question: optStr,
  title: optStr,
  summary: optStr,
  category: optStr,
  subcategory: optStr,
  priority: optStr,
  priorityReason: optStr,
  department: optStr,
  location: optStr,
  missingFields: z.array(z.unknown()).nullable().optional(),
});

export interface TicketDraft {
  title: string;
  summary: string;
  category: Category;
  subcategory: Subcategory;
  priority: Priority;
  priorityReason: string;
  department: Department;
}

export interface NormalizedOutput {
  status: "ready" | "needs_clarification";
  reply: string;
  question: string | null;
  draft: TicketDraft | null;
  locationText: string | null;
  missingFields: string[];
  /** Notes on values that had to be coerced — useful for logging/tests. */
  coerced: string[];
}

const DEFAULT_SUBCATEGORY: Record<Category, Subcategory> = {
  maintenance: "general_repairs",
  it_support: "classroom_tech",
  facilities: "shared_spaces",
  safety: "unsafe_condition",
  other: "other",
};

const CATEGORY_ALIASES: Record<string, Category> = {
  it: "it_support",
  "it support": "it_support",
  technical: "it_support",
  tech: "it_support",
  facility: "facilities",
  cleaning: "facilities",
  repair: "maintenance",
  الصيانة: "maintenance",
  صيانة: "maintenance",
  "الدعم التقني": "it_support",
  تقني: "it_support",
  المرافق: "facilities",
  "المرافق والخدمات": "facilities",
  السلامة: "safety",
  "الأمن والسلامة": "safety",
  أخرى: "other",
};

const PRIORITY_ALIASES: Record<string, Priority> = {
  medium: "normal",
  moderate: "normal",
  critical: "urgent",
  emergency: "urgent",
  منخفضة: "low",
  عادية: "normal",
  متوسطة: "normal",
  عالية: "high",
  عاجلة: "urgent",
  طارئة: "urgent",
};

const DEPARTMENT_ALIASES: Record<string, Department> = {
  it_support: "it",
  "it support": "it",
  facilities_management: "facilities",
  other: "general",
  administration: "general",
};

const key = (v: string | null | undefined) => (v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

function normalizeCategory(v: string | null | undefined, coerced: string[]): Category {
  const k = key(v);
  if ((CATEGORIES as readonly string[]).includes(k)) return k as Category;
  const alias = CATEGORY_ALIASES[(v ?? "").trim().toLowerCase()] ?? CATEGORY_ALIASES[k.replace(/_/g, " ")];
  if (alias) return alias;
  // A valid subcategory name used as the category.
  for (const c of CATEGORIES) if (subcategoryBelongsTo(c, k)) return c;
  coerced.push(`category:${v}`);
  return "other";
}

function normalizeSubcategory(category: Category, v: string | null | undefined, coerced: string[]): Subcategory {
  const k = key(v);
  if (subcategoryBelongsTo(category, k)) return k;
  if (k) coerced.push(`subcategory:${v}`);
  return DEFAULT_SUBCATEGORY[category];
}

function normalizePriority(v: string | null | undefined, coerced: string[]): Priority {
  const k = key(v);
  if ((PRIORITIES as readonly string[]).includes(k)) return k as Priority;
  const alias = PRIORITY_ALIASES[(v ?? "").trim()] ?? PRIORITY_ALIASES[k];
  if (alias) return alias;
  coerced.push(`priority:${v}`);
  return "normal";
}

function normalizeDepartment(category: Category, v: string | null | undefined, coerced: string[]): Department {
  const k = key(v);
  if ((DEPARTMENTS as readonly string[]).includes(k)) return k as Department;
  const alias = DEPARTMENT_ALIASES[k] ?? DEPARTMENT_ALIASES[k.replace(/_/g, " ")];
  if (alias) return alias;
  if (k) coerced.push(`department:${v}`);
  return DEFAULT_DEPARTMENT[category];
}

function str(v: string | null | undefined, max: number): string {
  if (!v) return "";
  const t = cleanText(v);
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Validates and normalises a parsed model object into a safe, typed result. */
export function normalizeModelOutput(value: unknown): NormalizedOutput {
  const parsed = rawModelOutputSchema.safeParse(value);
  if (!parsed.success) throw new AIError("AI_INVALID_OUTPUT", "Model JSON has the wrong shape", parsed.error.message);
  const o = parsed.data;
  const coerced: string[] = [];

  const s = key(o.status);
  let status: NormalizedOutput["status"] | null =
    s === "ready" || s === "complete" || s === "done"
      ? "ready"
      : s.includes("clarif") || s === "question" || s === "need_more_info"
        ? "needs_clarification"
        : null;
  if (!status) throw new AIError("AI_INVALID_OUTPUT", `Unknown status: ${o.status}`);

  const title = str(o.title, LIMITS.titleMax);
  const summary = str(o.summary, LIMITS.summaryMax);
  const question = str(o.question, 200) || null;

  let draft: TicketDraft | null = null;
  if (title.length >= 4 && summary.length >= 4) {
    const category = normalizeCategory(o.category, coerced);
    draft = {
      title,
      summary,
      category,
      subcategory: normalizeSubcategory(category, o.subcategory, coerced),
      priority: normalizePriority(o.priority, coerced),
      priorityReason: str(o.priorityReason, 300),
      department: normalizeDepartment(category, o.department, coerced),
    };
  }

  if (status === "ready" && !draft) {
    if (question) status = "needs_clarification";
    else throw new AIError("AI_INVALID_OUTPUT", "Ready result is missing title/summary");
  }
  if (status === "needs_clarification" && !question) {
    if (draft) status = "ready";
    else throw new AIError("AI_INVALID_OUTPUT", "Clarification result is missing a question");
  }

  const missingFields = (o.missingFields ?? [])
    .filter((f): f is string => typeof f === "string")
    .map((f) => str(f, 60))
    .filter(Boolean)
    .slice(0, 5);

  return {
    status,
    reply: str(o.reply, 300) || (status === "ready" ? "جهزت لك تفاصيل البلاغ، راجعها قبل الإرسال." : "أحتاج توضيحًا بسيطًا قبل تجهيز البلاغ."),
    question: status === "needs_clarification" ? question : null,
    draft,
    locationText: str(o.location, LIMITS.locationTextMax) || null,
    missingFields,
    coerced,
  };
}

const LOCATION_QUESTION = /(وين|أين|اين|في أي|فى أي|في اي|أي قاعة|اي قاعة|أي معمل|اي معمل|أي دور|الموقع|المكان|أي مبنى|رقم القاعة)/u;

export function isLocationQuestion(q: string): boolean {
  return LOCATION_QUESTION.test(q);
}

