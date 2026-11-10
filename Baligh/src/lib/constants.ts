/**
 * Controlled vocabularies. Everything persisted or returned by the AI must map
 * onto these lists — arbitrary strings never reach the database.
 */

export const CATEGORIES = ["maintenance", "it_support", "facilities", "safety", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SUBCATEGORIES = {
  maintenance: ["air_conditioning", "electrical", "plumbing", "general_repairs"],
  it_support: ["internet_wifi", "computers", "projectors", "classroom_tech"],
  facilities: ["restrooms", "supplies", "cleaning", "furniture", "shared_spaces"],
  safety: ["exposed_cables", "dangerous_leak", "physical_hazard", "unsafe_condition"],
  other: ["other"],
} as const satisfies Record<Category, readonly string[]>;

export type Subcategory = (typeof SUBCATEGORIES)[Category][number];
export const ALL_SUBCATEGORIES = Object.values(SUBCATEGORIES).flat() as Subcategory[];

export const DEPARTMENTS = ["maintenance", "it", "facilities", "safety", "general"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["new", "in_review", "in_progress", "resolved", "closed"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  maintenance: "الصيانة",
  it_support: "الدعم التقني",
  facilities: "المرافق والخدمات",
  safety: "الأمن والسلامة",
  other: "أخرى",
};

export const SUBCATEGORY_LABELS: Record<Subcategory, string> = {
  air_conditioning: "التكييف",
  electrical: "مشاكل كهربائية",
  plumbing: "السباكة",
  general_repairs: "إصلاحات عامة",
  internet_wifi: "الإنترنت والواي فاي",
  computers: "أجهزة الحاسب",
  projectors: "أجهزة العرض",
  classroom_tech: "تقنيات القاعات",
  restrooms: "دورات المياه",
  supplies: "نقص المستلزمات",
  cleaning: "النظافة",
  furniture: "الأثاث",
  shared_spaces: "المساحات المشتركة",
  exposed_cables: "أسلاك مكشوفة",
  dangerous_leak: "تسرب خطير",
  physical_hazard: "خطر مادي",
  unsafe_condition: "وضع غير آمن",
  other: "أخرى",
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  maintenance: "إدارة الصيانة",
  it: "الدعم التقني",
  facilities: "المرافق والخدمات",
  safety: "الأمن والسلامة",
  general: "الإدارة العامة",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

export const STATUS_LABELS: Record<Status, string> = {
  new: "جديد",
  in_review: "قيد المراجعة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
};

export const PRIORITY_RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2, urgent: 3 };

export const DEFAULT_DEPARTMENT: Record<Category, Department> = {
  maintenance: "maintenance",
  it_support: "it",
  facilities: "facilities",
  safety: "safety",
  other: "general",
};

export function maxPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

export function subcategoryBelongsTo(category: Category, sub: string): sub is Subcategory {
  return (SUBCATEGORIES[category] as readonly string[]).includes(sub);
}

/** Limits shared by client and server so the UI and API agree. */
export const LIMITS = {
  descriptionMin: 4,
  descriptionMax: 1000,
  answerMax: 300,
  maxClarifications: 3,
  titleMax: 120,
  summaryMax: 600,
  requestBytes: 16_000,
  locationTextMax: 120,
} as const;
