import type { Metadata } from "next";
import Link from "next/link";
import { AlertOctagon, CheckCircle2, Hourglass, Inbox, Layers } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { requireAdminPage } from "@/lib/auth";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import { getReportStats, listReports, PAGE_SIZE, reportFiltersSchema, type ReportFilters } from "@/lib/data/admin-reports";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة البلاغات", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

function first(sp: SP) {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

function pageHref(filters: ReportFilters, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page })) if (v !== undefined && v !== "" && !(k === "sort" && v === "newest") && !(k === "page" && v === 1)) params.set(k, String(v));
  const q = params.toString();
  return q ? `/admin?${q}` : "/admin";
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdminPage();
  const filters = reportFiltersSchema.parse(first(await searchParams));

  const [stats, { items, total }, { data: locations }] = await Promise.all([
    getReportStats(supabase),
    listReports(supabase, filters),
    supabase.from("locations").select("id, name_ar").order("name_ar"),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const maxCat = Math.max(1, ...Object.values(stats.by_category ?? {}).map(Number));
  const hasFilters = Boolean(filters.q || filters.status || filters.category || filters.priority || filters.location);

  const cards = [
    { label: "إجمالي البلاغات", value: stats.total, Icon: Layers, tone: "bg-white text-ink" },
    { label: "جديدة", value: stats.new, Icon: Inbox, tone: "bg-brand-500 text-white" },
    { label: "قيد المراجعة والمعالجة", value: stats.in_progress, Icon: Hourglass, tone: "bg-white text-ink" },
    { label: "تم حلها أو إغلاقها", value: stats.resolved, Icon: CheckCircle2, tone: "bg-white text-ink" },
    { label: "عاجلة مفتوحة", value: stats.urgent_open, Icon: AlertOctagon, tone: stats.urgent_open > 0 ? "bg-danger text-white" : "bg-white text-ink" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">لوحة البلاغات</h1>
        <p className="mt-1 text-muted">جميع الأرقام محسوبة مباشرة من قاعدة البيانات.</p>
      </header>

      <section aria-label="ملخص البلاغات" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(({ label, value, Icon, tone }, i) => (
          <div key={label} className={cn("rounded-[var(--radius-card)] border border-line p-4", tone, i === 0 && "col-span-2 md:col-span-1")}>
            <Icon className="size-5 opacity-80" aria-hidden />
            <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
            <p className="text-sm opacity-80">{label}</p>
          </div>
        ))}
      </section>

      {stats.total > 0 && (
        <section aria-labelledby="by-cat" className="rounded-[var(--radius-card)] border border-line bg-white p-5">
          <h2 id="by-cat" className="mb-4 font-bold">التوزيع حسب التصنيف</h2>
          <ul className="space-y-2.5">
            {CATEGORIES.map((c) => {
              const n = Number(stats.by_category?.[c] ?? 0);
              return (
                <li key={c} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="text-ink/80">{CATEGORY_LABELS[c]}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-brand-50">
                    <span className={cn("block h-full rounded-full", c === "safety" ? "bg-danger" : "bg-brand-400")} style={{ width: `${(n / maxCat) * 100}%` }} />
                  </span>
                  <span className="text-end font-semibold tabular-nums">{n}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="tickets-title" className="space-y-4">
        <h2 id="tickets-title" className="font-bold">البلاغات</h2>
        <form method="get" className="grid gap-2.5 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)_auto]">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="رقم البلاغ أو العنوان"
            aria-label="بحث"
            className="h-11 rounded-[var(--radius-control)] border border-line px-3.5 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <Select name="status" defaultValue={filters.status ?? ""} aria-label="الحالة">
            <option value="">كل الحالات</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
          <Select name="category" defaultValue={filters.category ?? ""} aria-label="التصنيف">
            <option value="">كل التصنيفات</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </Select>
          <Select name="priority" defaultValue={filters.priority ?? ""} aria-label="الأولوية">
            <option value="">كل الأولويات</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </Select>
          <Select name="location" defaultValue={filters.location ?? ""} aria-label="الموقع">
            <option value="">كل المواقع</option>
            {(locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name_ar}</option>)}
          </Select>
          <Select name="sort" defaultValue={filters.sort} aria-label="الترتيب">
            <option value="newest">الأحدث أولًا</option>
            <option value="oldest">الأقدم أولًا</option>
          </Select>
          <div className="flex gap-2">
            <button type="submit" className={buttonClasses("primary", "md", "flex-1")}>تطبيق</button>
            {hasFilters && <Link href="/admin" className={buttonClasses("ghost", "md")}>مسح</Link>}
          </div>
        </form>

        {items.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-brand-200 bg-white px-6 py-14 text-center">
            <Inbox className="mx-auto size-10 text-brand-300" aria-hidden />
            <p className="mt-3 font-bold">{hasFilters ? "لا توجد بلاغات تطابق هذه الفلاتر" : "لا توجد بلاغات بعد"}</p>
            <p className="mt-1 text-sm text-muted">
              {hasFilters ? "غيّر الفلاتر أو امسحها لعرض كل البلاغات." : "ستظهر البلاغات هنا فور إرسالها من صفحة البلاغ أو عبر رموز QR."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="bg-[#faf9fc] text-start text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">البلاغ</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">الموقع</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">التصنيف</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">الأولوية</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">الحالة</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/reports/${r.id}`} className="group block">
                          <span className="ltr-chunk text-xs font-bold text-brand-700">{r.ticket_number}</span>
                          <span className="block max-w-[18rem] truncate font-semibold group-hover:text-brand-700">{r.title}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink/80">{r.locations?.name_ar ?? r.location_text ?? "—"}</td>
                      <td className="px-4 py-3 text-ink/80">{CATEGORY_LABELS[r.category]}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
              <span>
                {total} بلاغ، صفحة {filters.page} من {pages}
              </span>
              <div className="flex gap-2">
                {filters.page > 1 && <Link className={buttonClasses("outline", "sm")} href={pageHref(filters, filters.page - 1)}>السابق</Link>}
                {filters.page < pages && <Link className={buttonClasses("outline", "sm")} href={pageHref(filters, filters.page + 1)}>التالي</Link>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
