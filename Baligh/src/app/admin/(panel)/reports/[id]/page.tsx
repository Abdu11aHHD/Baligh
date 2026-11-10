import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bot, MessageSquareText, ShieldAlert } from "lucide-react";
import { ReportActions } from "@/components/admin/report-actions";
import { PriorityBadge, SafetyBadge, StatusBadge } from "@/components/ui/badge";
import { isUuid } from "@/lib/admin-api";
import { requireAdminPage } from "@/lib/auth";
import {
  CATEGORY_LABELS,
  DEPARTMENT_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUBCATEGORY_LABELS,
  type Category,
  type Department,
  type Priority,
  type Status,
} from "@/lib/constants";
import { getReportDetail, type ReportEvent } from "@/lib/data/admin-reports";
import { SAFETY_FLAG_LABELS, type SafetyFlag } from "@/lib/safety";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تفاصيل البلاغ", robots: { index: false } };

function describeEvent(e: ReportEvent): string {
  switch (e.event_type) {
    case "created":
      return "أُنشئ البلاغ";
    case "status_changed":
      return `تغيّرت الحالة من «${STATUS_LABELS[e.previous_status as Status] ?? "—"}» إلى «${STATUS_LABELS[e.new_status as Status] ?? "—"}»`;
    case "priority_changed":
      return `تغيّرت الأولوية من «${PRIORITY_LABELS[e.previous_value as Priority] ?? e.previous_value}» إلى «${PRIORITY_LABELS[e.new_value as Priority] ?? e.new_value}»`;
    case "department_changed":
      return `أُحيل من «${DEPARTMENT_LABELS[e.previous_value as Department] ?? e.previous_value}» إلى «${DEPARTMENT_LABELS[e.new_value as Department] ?? e.new_value}»`;
    case "note":
      return "ملاحظة داخلية";
  }
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const detail = await getReportDetail(supabase, id);
  if (!detail) notFound();
  const { report: r, events } = detail;
  const flags = (r.safety_flags ?? []).filter((f): f is SafetyFlag => f in SAFETY_FLAG_LABELS);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowRight className="size-4" aria-hidden />
        كل البلاغات
      </Link>

      <header className="rounded-[var(--radius-card)] border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="ltr-chunk text-sm font-bold text-brand-700">{r.ticket_number}</span>
          <StatusBadge status={r.status} />
          <PriorityBadge priority={r.priority} />
          {flags.map((f) => <SafetyBadge key={f} label={SAFETY_FLAG_LABELS[f]} />)}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">{r.title}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted">الموقع</dt><dd className="font-semibold">{r.locations?.name_ar ?? <>غير مسجّل: {r.location_text}</>}</dd></div>
          <div><dt className="text-muted">التصنيف</dt><dd className="font-semibold">{CATEGORY_LABELS[r.category]}، {SUBCATEGORY_LABELS[r.subcategory]}</dd></div>
          <div><dt className="text-muted">الجهة المسؤولة</dt><dd className="font-semibold">{DEPARTMENT_LABELS[r.assigned_department]}</dd></div>
          <div><dt className="text-muted">تاريخ الإنشاء</dt><dd className="font-semibold">{formatDateTime(r.created_at)}</dd></div>
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-line bg-white p-5" aria-labelledby="orig">
            <h2 id="orig" className="flex items-center gap-2 font-bold"><MessageSquareText className="size-5 text-brand-500" aria-hidden />وصف المتدرب الأصلي</h2>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f7f6fa] p-4 leading-7">{r.raw_description}</p>
            {r.clarifications.length > 0 && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-semibold text-muted">أسئلة التوضيح</p>
                {r.clarifications.map((c, i) => (
                  <div key={i} className="rounded-xl border border-line p-3">
                    <p className="text-brand-700">{c.question}</p>
                    <p className="mt-1">{c.answer}</p>
                  </div>
                ))}
              </div>
            )}
            <h3 className="mt-5 text-sm font-bold">الملخص المعتمد</h3>
            <p className="mt-1 leading-7 text-ink/85">{r.summary}</p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-white p-5" aria-labelledby="ai">
            <h2 id="ai" className="flex items-center gap-2 font-bold"><Bot className="size-5 text-brand-500" aria-hidden />ما اقترحه Llama</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">العنوان المقترح</dt><dd className="font-semibold">{r.ai_title}</dd></div>
              <div><dt className="text-muted">التصنيف المقترح</dt><dd className="font-semibold">{CATEGORY_LABELS[r.ai_category as Category] ?? r.ai_category}</dd></div>
              <div><dt className="text-muted">الأولوية المقترحة</dt><dd><PriorityBadge priority={r.ai_priority} /></dd></div>
              <div><dt className="text-muted">الجهة المقترحة</dt><dd className="font-semibold">{DEPARTMENT_LABELS[r.ai_department] ?? r.ai_department}</dd></div>
            </dl>
            {r.ai_priority_reason && <p className="mt-3 text-sm text-muted">سبب الأولوية: {r.ai_priority_reason}</p>}
            {r.safety_min_priority && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-danger-ink">
                <ShieldAlert className="size-4" aria-hidden />
                قواعد السلامة الثابتة فرضت حدًا أدنى للأولوية: {PRIORITY_LABELS[r.safety_min_priority]}
              </p>
            )}
            <p className="ltr-chunk mt-4 text-start text-xs text-muted">{r.ai_model}</p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-white p-5" aria-labelledby="hist">
            <h2 id="hist" className="font-bold">سجل البلاغ</h2>
            <ol className="mt-4 space-y-4">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${e.is_internal ? "bg-brand-300" : "bg-brand-500"}`} aria-hidden />
                  <div>
                    <p className="font-semibold">
                      {describeEvent(e)}
                      {e.is_internal && <span className="ms-2 rounded bg-[#f3f2f6] px-1.5 py-0.5 text-[0.7rem] font-normal text-muted">داخلي</span>}
                    </p>
                    {e.admin_note && <p className="mt-1 whitespace-pre-wrap rounded-lg bg-brand-50 p-2.5 text-ink/85">{e.admin_note}</p>}
                    <p className="text-xs text-muted">{formatDateTime(e.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <ReportActions id={r.id} status={r.status} priority={r.priority} department={r.assigned_department} />
      </div>
    </div>
  );
}
