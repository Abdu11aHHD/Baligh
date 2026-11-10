"use client";
import { useState } from "react";
import { Building2, PenLine, ShieldAlert, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { AnalyzeResponse, LocationOption } from "@/lib/api-types";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_DEPARTMENT,
  DEPARTMENT_LABELS,
  LIMITS,
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_RANK,
  SUBCATEGORIES,
  SUBCATEGORY_LABELS,
  type Category,
  type Priority,
  type Subcategory,
} from "@/lib/constants";
import type { Turn } from "@/lib/schemas";
import { LocationPicker, OTHER_LOCATION } from "./location-picker";

export interface PreviewValues {
  title: string;
  summary: string;
  category: Category;
  subcategory: Subcategory;
  priority: Priority;
  locationId: string;
  locationText: string;
}

export function SafetyNotice() {
  return (
    <Alert tone="danger" title="سلامتك أولًا">
      إذا كان هناك خطر مباشر، ابتعد عن المكان فورًا وتواصل مع أمن المبنى أو فريق السلامة في الموقع، وفي الحالات الطارئة اتصل
      بالرقم الموحد للطوارئ 911. إرسال البلاغ عبر المنصة لا يضمن استجابة طارئة فورية.
    </Alert>
  );
}

export function TicketPreview({
  analysis,
  description,
  turns,
  locations,
  initialLocationId,
  fromQr,
  submitting,
  onSubmit,
  onEdit,
}: {
  analysis: AnalyzeResponse;
  description: string;
  turns: Turn[];
  locations: LocationOption[];
  initialLocationId: string;
  fromQr: boolean;
  submitting: boolean;
  onSubmit: (v: PreviewValues) => void;
  onEdit: () => void;
}) {
  const draft = analysis.draft!;
  const lastLocationAnswer = turns.at(-1)?.answer ?? "";
  const [v, setV] = useState<PreviewValues>({
    title: draft.title,
    summary: draft.summary,
    category: draft.category,
    subcategory: draft.subcategory,
    priority: draft.priority,
    locationId: analysis.location?.id ?? (initialLocationId || ""),
    locationText: analysis.locationText ?? (analysis.location ? "" : lastLocationAnswer.slice(0, LIMITS.locationTextMax)),
  });
  const [touched, setTouched] = useState(false);

  const floor = analysis.safety.minPriority;
  const department =
    analysis.safety.immediateDanger ? "safety" : v.category === draft.category ? draft.department : DEFAULT_DEPARTMENT[v.category];

  const needsText = !v.locationId || v.locationId === OTHER_LOCATION;
  const errors = {
    title: v.title.trim().length < 4 ? "اكتب عنوانًا من 4 أحرف على الأقل." : null,
    summary: v.summary.trim().length < 4 ? "اكتب ملخصًا من 4 أحرف على الأقل." : null,
    location: needsText && v.locationText.trim().length < 2 ? "حدّد موقع المشكلة: اختره من القائمة أو اكتب وصفه." : null,
  };
  const valid = !errors.title && !errors.summary && !errors.location;

  const set = <K extends keyof PreviewValues>(k: K, val: PreviewValues[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid) onSubmit({ ...v, title: v.title.trim(), summary: v.summary.trim(), locationText: v.locationText.trim() });
      }}
      className="space-y-5"
    >
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
        <div className="text-sm leading-6">
          <p className="font-semibold text-brand-900">{analysis.reply}</p>
          <p className="text-muted">راجع التفاصيل وعدّل ما تحتاجه، ثم أرسل البلاغ.</p>
        </div>
      </div>

      {analysis.safety.immediateDanger && <SafetyNotice />}

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-lift)]">
        <div className="border-b border-dashed border-line bg-[linear-gradient(180deg,#fff,#fbf9ff)] p-5">
          <Label htmlFor="title">عنوان البلاغ</Label>
          <Input
            id="title"
            value={v.title}
            maxLength={LIMITS.titleMax}
            onChange={(e) => set("title", e.target.value)}
            className="h-12 text-lg font-bold"
            aria-invalid={touched && !!errors.title}
          />
          {touched && errors.title && <p className="mt-1 text-sm text-danger-ink">{errors.title}</p>}
        </div>

        <div className="space-y-5 p-5">
          <div>
            <LocationPicker
              locations={locations}
              value={v.locationId}
              onChange={(id) => set("locationId", id)}
              fromQr={fromQr && v.locationId === analysis.location?.id}
              allowOther
            />
            {needsText && (
              <div className="mt-3">
                <Label htmlFor="locationText">وصف الموقع</Label>
                <Input
                  id="locationText"
                  value={v.locationText}
                  maxLength={LIMITS.locationTextMax}
                  onChange={(e) => set("locationText", e.target.value)}
                  placeholder="مثل: معمل الشبكات، الدور الثالث"
                  aria-invalid={touched && !!errors.location}
                />
              </div>
            )}
            {touched && errors.location && <p className="mt-1 text-sm text-danger-ink">{errors.location}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">التصنيف</Label>
              <Select
                id="category"
                value={v.category}
                onChange={(e) => {
                  const c = e.target.value as Category;
                  setV((p) => ({ ...p, category: c, subcategory: SUBCATEGORIES[c][0] }));
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategory">النوع</Label>
              <Select id="subcategory" value={v.subcategory} onChange={(e) => set("subcategory", e.target.value as Subcategory)}>
                {SUBCATEGORIES[v.category].map((s) => (
                  <option key={s} value={s}>
                    {SUBCATEGORY_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">الأولوية</Label>
              <Select id="priority" value={v.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} disabled={!!floor && PRIORITY_RANK[p] < PRIORITY_RANK[floor]}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">الجهة المقترحة</p>
              <p className="flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-brand-50 px-3.5 text-brand-900">
                <Building2 className="size-4 text-brand-500" aria-hidden />
                {DEPARTMENT_LABELS[department]}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[#f7f6fa] p-3.5 text-sm leading-6">
            <p className="font-semibold">سبب الأولوية المقترحة</p>
            <p className="text-muted">{draft.priorityReason || "لم يذكر النموذج سببًا."}</p>
            {analysis.safety.raisedPriority && (
              <p className="mt-2 flex items-center gap-1.5 font-semibold text-danger-ink">
                <ShieldAlert className="size-4" aria-hidden />
                رفعت قواعد السلامة الأولوية من «{PRIORITY_LABELS[analysis.aiPriority]}» إلى «{PRIORITY_LABELS[draft.priority]}».
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="summary" hint="يمكنك التعديل">
              ملخص البلاغ
            </Label>
            <Textarea
              id="summary"
              rows={3}
              maxLength={LIMITS.summaryMax}
              value={v.summary}
              onChange={(e) => set("summary", e.target.value)}
              aria-invalid={touched && !!errors.summary}
            />
            {touched && errors.summary && <p className="mt-1 text-sm text-danger-ink">{errors.summary}</p>}
          </div>

          <details className="rounded-xl border border-line p-3.5 text-sm">
            <summary className="cursor-pointer font-semibold text-ink/80">وصفك الأصلي</summary>
            <p className="mt-2 whitespace-pre-wrap text-muted">{description}</p>
            {turns.map((t, i) => (
              <p key={i} className="mt-2 text-muted">
                <span className="font-semibold text-ink/80">{t.question}</span> {t.answer}
              </p>
            ))}
          </details>

          <p className="ltr-chunk text-start text-[0.7rem] text-muted/80" title="النموذج الذي حلّل البلاغ">
            {analysis.model}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button type="button" variant="outline" size="lg" onClick={onEdit} disabled={submitting} className="sm:w-auto">
          <PenLine className="size-4" aria-hidden />
          تعديل الوصف
        </Button>
        <Button type="submit" size="lg" className="w-full sm:flex-1" loading={submitting}>
          تأكيد وإرسال البلاغ
        </Button>
      </div>
    </form>
  );
}
