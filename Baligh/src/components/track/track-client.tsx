"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, MapPin, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiFetch,
  ApiRequestError,
  loadSavedTickets,
  removeSavedTicket,
  type SavedTicket,
  type TrackResponse,
} from "@/lib/api-types";
import { CATEGORY_LABELS, STATUS_LABELS, type Status } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

const FLOW: Status[] = ["new", "in_review", "in_progress", "resolved"];

export function TrackClient() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState<SavedTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResponse | null>(null);

  const lookup = useCallback(async (num: string, sec: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<TrackResponse>("/api/reports/track", {
        method: "POST",
        body: JSON.stringify({ ticketNumber: num.trim(), secret: sec.trim() }),
        timeoutMs: 20_000,
      });
      setResult(res);
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Hydrate browser-only state (localStorage + URL fragment) after mount.
    const list = loadSavedTickets();
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const m = /^(BLG-\d{6,})\.([A-Za-z0-9_-]{20,64})$/.exec(hash);
    queueMicrotask(() => {
      setSaved(list);
      if (m) {
        setTicketNumber(m[1]);
        setSecret(m[2]);
        void lookup(m[1], m[2]);
      }
    });
  }, [lookup]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-brand-900">متابعة بلاغ</h1>
        <p className="mt-1.5 text-muted">أدخل رقم البلاغ ورمز المتابعة اللذين ظهرا لك بعد الإرسال.</p>
      </header>

      {saved.length > 0 && (
        <section aria-labelledby="saved-title" className="rounded-[var(--radius-card)] border border-line bg-white p-4">
          <h2 id="saved-title" className="mb-2 text-sm font-bold">
            بلاغات أرسلتها من هذا المتصفح
          </h2>
          <ul className="divide-y divide-line">
            {saved.map((t) => (
              <li key={t.ticketNumber} className="flex items-center gap-2 py-2.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => {
                    setTicketNumber(t.ticketNumber);
                    setSecret(t.secret);
                    void lookup(t.ticketNumber, t.secret);
                  }}
                >
                  <span className="ltr-chunk block text-sm font-bold text-brand-700">{t.ticketNumber}</span>
                  <span className="block truncate text-sm text-muted">{t.title}</span>
                </button>
                <button
                  type="button"
                  aria-label={`إزالة ${t.ticketNumber} من هذا المتصفح`}
                  className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger-ink"
                  onClick={() => {
                    removeSavedTicket(t.ticketNumber);
                    setSaved(loadSavedTickets());
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(ticketNumber, secret);
        }}
      >
        <div>
          <Label htmlFor="ticket">رقم البلاغ</Label>
          <Input
            id="ticket"
            dir="ltr"
            className="ltr-chunk text-left"
            placeholder="BLG-000123"
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <Label htmlFor="secret">رمز المتابعة</Label>
          <Input
            id="secret"
            dir="ltr"
            className="ltr-chunk text-left"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
        <Button type="submit" loading={loading} disabled={!ticketNumber || !secret}>
          عرض الحالة
        </Button>
      </form>

      {loading && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-5" role="status" aria-label="جارٍ التحميل">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {result && <TrackResult r={result} />}
    </div>
  );
}

function TrackResult({ r }: { r: TrackResponse }) {
  const currentIndex = r.status === "closed" ? FLOW.length - 1 : FLOW.indexOf(r.status);
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-lift)]" aria-live="polite">
      <div className="border-b border-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="ltr-chunk text-sm font-bold text-brand-700">{r.ticketNumber}</span>
          <div className="flex gap-2">
            <PriorityBadge priority={r.priority} />
            <StatusBadge status={r.status} />
          </div>
        </div>
        <h2 className="mt-2 text-xl font-bold">{r.title}</h2>
        <p className="mt-1 text-muted">{r.summary}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">الموقع</dt>
            <dd className="flex items-center gap-1 font-semibold">
              <MapPin className="size-4 text-brand-500" aria-hidden />
              {r.location ?? "غير محدد"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">التصنيف</dt>
            <dd className="font-semibold">{CATEGORY_LABELS[r.category]}</dd>
          </div>
          <div>
            <dt className="text-muted">تاريخ الإنشاء</dt>
            <dd className="font-semibold">{formatDateTime(r.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="p-5">
        <h3 className="sr-only">مراحل البلاغ</h3>
        <ol className="grid grid-cols-4 gap-1.5">
          {FLOW.map((s, i) => (
            <li key={s} className="text-center">
              <div className={cn("h-1.5 rounded-full", i <= currentIndex ? "bg-brand-500" : "bg-brand-100")} />
              <p className={cn("mt-2 text-xs", i === currentIndex ? "font-bold text-brand-700" : "text-muted")}>{STATUS_LABELS[s]}</p>
            </li>
          ))}
        </ol>
        {r.status === "closed" && <p className="mt-3 text-center text-sm text-muted">تم إغلاق هذا البلاغ.</p>}

        <h3 className="mt-7 text-sm font-bold">سجل الحالة</h3>
        <ol className="mt-3 space-y-0">
          {r.history.map((e, i) => (
            <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
              {i < r.history.length - 1 && <span className="absolute start-[0.69rem] top-6 h-full w-px bg-line" aria-hidden />}
              <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                <Check className="size-3.5" aria-hidden />
              </span>
              <div className="text-sm">
                <p className="font-semibold">
                  {e.event_type === "created" ? "تم استلام البلاغ" : `تغيرت الحالة إلى «${e.new_status ? STATUS_LABELS[e.new_status] : ""}»`}
                </p>
                <p className="text-muted">{formatDateTime(e.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
