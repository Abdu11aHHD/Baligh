import { type Priority, maxPriority } from "./constants";
import { normalizeArabic } from "./utils";

/**
 * Deterministic, server-side hazard rules. They run independently of the LLM
 * and can only RAISE priority — never lower it. The AI suggestion and the
 * rule-based floor are stored separately so the source of a priority is auditable.
 *
 * Design choice: rules favour false positives ("ما فيه دخان" still matches
 * "دخان"). A wrongly escalated ticket costs an admin a few seconds; a missed
 * electrical hazard does not.
 */

export const SAFETY_FLAGS = [
  "fire_smoke",
  "gas",
  "electric_shock",
  "exposed_wiring",
  "water_near_electricity",
  "major_leak",
  "structural",
  "injury",
  "trapped_elevator",
] as const;
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

export const SAFETY_FLAG_LABELS: Record<SafetyFlag, string> = {
  fire_smoke: "دخان أو حريق",
  gas: "رائحة غاز",
  electric_shock: "تماس أو صعق كهربائي",
  exposed_wiring: "أسلاك كهربائية مكشوفة",
  water_near_electricity: "مياه قرب الكهرباء",
  major_leak: "تسرب مياه كبير",
  structural: "خطر إنشائي",
  injury: "إصابة",
  trapped_elevator: "احتجاز في المصعد",
};

// Arabic letters block; used to emulate word boundaries (\b does not work for Arabic).
const AR = "\\u0600-\\u06FF";
const PREFIX = "(?:و|ف|ب|ل|ال|وال|بال|فال|لل)?";

/** Matches a stem as the start of a word (allows common prefixes and any suffix). */
function stem(...words: string[]): RegExp {
  return new RegExp(`(?:^|[^${AR}])${PREFIX}(?:${words.join("|")})`, "u");
}

/** Matches whole words only (allows common prefixes, no suffix). */
function word(...words: string[]): RegExp {
  return new RegExp(`(?:^|[^${AR}])${PREFIX}(?:${words.join("|")})(?=$|[^${AR}])`, "u");
}

const ELECTRIC_THINGS = stem("سلك", "اسلاك", "كيبل", "كيابل", "كابل", "كابلات", "توصيل", "فيش", "افياش", "كهرب", "مقبس", "ابريز");
const WATER = stem("تسرب", "تسريب", "يسرب", "يخر", "موي", "ماء", "مياه", "غرق", "مغرق", "طافح", "طفح", "فيضان");
const DEVICES = stem("اجهزه", "جهاز", "لابتوب", "بروجكتر", "شاشه", "طابعه", "سيرفر");

interface Rule {
  flag: SafetyFlag;
  min: Priority;
  immediate: boolean;
  test: (t: string) => boolean;
}

const RULES: Rule[] = [
  {
    flag: "fire_smoke",
    min: "urgent",
    immediate: true,
    test: (t) =>
      word("نار", "النار") .test(t) ||
      stem("حريق", "دخان", "يدخن", "يحترق", "احترق", "محترق", "شرار", "يشرر", "لهب").test(t) ||
      /ريحه (?:احتراق|حريق|شي محروق|محروق)/u.test(t),
  },
  { flag: "gas", min: "urgent", immediate: true, test: (t) => stem("غاز").test(t) },
  {
    flag: "electric_shock",
    min: "urgent",
    immediate: true,
    test: (t) =>
      stem("التماس", "ماس كهرب", "تماس كهرب", "صعق", "كهربني", "كهربتني", "تكهرب", "مكهرب").test(t),
  },
  {
    flag: "exposed_wiring",
    min: "urgent",
    immediate: true,
    test: (t) =>
      ELECTRIC_THINGS.test(t) && stem("مكشوف", "عاري", "مقطوع", "مفتوح", "طالع", "بارز", "متدلي", "ذايب", "ذايبه").test(t),
  },
  {
    flag: "water_near_electricity",
    min: "urgent",
    immediate: true,
    test: (t) => WATER.test(t) && (ELECTRIC_THINGS.test(t) || DEVICES.test(t)),
  },
  {
    flag: "major_leak",
    min: "high",
    immediate: false,
    test: (t) => WATER.test(t) && stem("كبير", "قوي", "بقوه", "كثير", "مغرق", "غرقت", "فيضان").test(t),
  },
  {
    flag: "structural",
    min: "high",
    immediate: false,
    test: (t) =>
      stem("سقف", "جدار", "زجاج", "قزاز", "درج", "سلالم").test(t) &&
      stem("طايح", "طاح", "يطيح", "سقط", "ساقط", "متشقق", "تشقق", "ينهار", "انهار", "مكسور", "منكسر", "متكسر").test(t),
  },
  {
    flag: "injury",
    min: "urgent",
    immediate: true,
    test: (t) => stem("اصابه", "انصاب", "مصاب", "انجرح", "مجروح", "نزيف", "ينزف", "اغمي", "اغماء", "مغمى").test(t),
  },
  {
    flag: "trapped_elevator",
    min: "urgent",
    immediate: true,
    test: (t) => stem("مصعد", "اسانسير", "الاسانسير").test(t) && stem("عالق", "علق", "محبوس", "انحبس", "محتجز").test(t),
  },
];

export interface SafetyAssessment {
  flags: SafetyFlag[];
  /** Lowest priority the ticket may carry, or null when no rule matched. */
  minPriority: Priority | null;
  immediateDanger: boolean;
}

export function assessSafety(...texts: string[]): SafetyAssessment {
  const text = ` ${normalizeArabic(texts.join(" \n "))} `;
  const matched = RULES.filter((r) => r.test(text));
  let minPriority: Priority | null = null;
  for (const r of matched) minPriority = minPriority ? maxPriority(minPriority, r.min) : r.min;
  return {
    flags: matched.map((r) => r.flag),
    minPriority,
    immediateDanger: matched.some((r) => r.immediate),
  };
}

/** Applies the deterministic floor on top of a suggested priority. */
export function applySafetyFloor(suggested: Priority, assessment: SafetyAssessment): Priority {
  return assessment.minPriority ? maxPriority(suggested, assessment.minPriority) : suggested;
}
