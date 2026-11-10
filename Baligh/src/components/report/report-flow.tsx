"use client";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bot, PenLine, Send, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiFetch,
  ApiRequestError,
  saveTicket,
  type AnalyzeResponse,
  type CreateReportResponse,
  type LocationOption,
} from "@/lib/api-types";
import { LIMITS } from "@/lib/constants";
import type { Turn } from "@/lib/schemas";
import { LocationPicker, OTHER_LOCATION } from "./location-picker";
import { TicketPreview, type PreviewValues } from "./ticket-preview";
import { ReportSuccess } from "./report-success";

type Phase = "compose" | "clarify" | "preview" | "done";

const EXAMPLES = ["المكيف ما يبرد", "ما فيه مناديل", "النت ما يشتغل في المعمل", "سلك كهرباء مكشوف عند الباب", "البروجكتر يطفي لحاله"];

const QR_MESSAGES = {
  invalid: "رمز QR الذي استخدمته غير معروف. اختر موقع المشكلة من القائمة وأكمل بلاغك.",
  inactive: "الموقع المرتبط بهذا الرمز موقوف حاليًا عن استقبال البلاغات. اختر موقعًا آخر من القائمة.",
} as const;

export function ReportFlow({
  locations,
  initialLocation,
  qrState,
}: {
  locations: LocationOption[];
  initialLocation: LocationOption | null;
  qrState: "none" | "ok" | "invalid" | "inactive";
}) {
  const [phase, setPhase] = useState<Phase>("compose");
  const [locationId, setLocationId] = useState(initialLocation?.id ?? "");
  const [description, setDescription] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [busy, setBusy] = useState<"analyze" | "submit" | null>(null);
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null);
  const [created, setCreated] = useState<{ res: CreateReportResponse; title: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const registeredLocation = useMemo(
    () => (locationId && locationId !== OTHER_LOCATION ? locations.find((l) => l.id === locationId) ?? null : null),
    [locationId, locations],
  );
  const fromQr = qrState === "ok" && registeredLocation?.id === initialLocation?.id;
  const trimmed = description.trim();
  const descriptionValid = trimmed.length >= LIMITS.descriptionMin && trimmed.length <= LIMITS.descriptionMax;

  async function runAnalysis(nextTurns: Turn[]) {
    setBusy("analyze");
    setError(null);
    try {
      const res = await apiFetch<AnalyzeResponse>("/api/reports/analyze", {
        method: "POST",
        body: JSON.stringify({
          description: trimmed,
          turns: nextTurns,
          locationCode: registeredLocation?.code ?? null,
        }),
      });
      setTurns(nextTurns);
      setAnalysis(res);
      setAnswer("");
      setPhase(res.status === "ready" ? "preview" : "clarify");
    } catch (e) {
      const err = e as ApiRequestError;
      setError({ message: err.message, retry: () => runAnalysis(nextTurns) });
    } finally {
      setBusy(null);
    }
  }

  async function submit(values: PreviewValues) {
    if (!analysis?.analysisToken) return;
    setBusy("submit");
    setError(null);
    try {
      const res = await apiFetch<CreateReportResponse>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          analysisToken: analysis.analysisToken,
          description: trimmed,
          turns,
          locationId: values.locationId && values.locationId !== OTHER_LOCATION ? values.locationId : null,
          locationText: values.locationId === OTHER_LOCATION || !values.locationId ? values.locationText : null,
          title: values.title,
          summary: values.summary,
          category: values.category,
          subcategory: values.subcategory,
          priority: values.priority,
        }),
      });
      saveTicket({ ticketNumber: res.ticketNumber, secret: res.trackingSecret, title: values.title, createdAt: res.createdAt });
      setCreated({ res, title: values.title });
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const err = e as ApiRequestError;
      if (err.code === "ANALYSIS_REQUIRED") {
        setError({ message: err.message, retry: () => runAnalysis(turns) });
      } else {
        setError({ message: err.message, retry: () => submit(values) });
      }
    } finally {
      setBusy(null);
    }
  }

  function backToCompose() {
    setPhase("compose");
    setAnalysis(null);
    setTurns([]);
    setAnswer("");
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  if (phase === "done" && created) {
    return <ReportSuccess result={created.res} title={created.title} />;
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-3xl font-bold text-brand-900">بلاغ جديد</h1>
        <p className="mt-1.5 text-muted">صف المشكلة بكلماتك، ويجهّز Llama البلاغ لتراجعه قبل الإرسال.</p>
      </header>

      {qrState !== "none" && qrState !== "ok" && phase === "compose" && (
        <Alert tone="warning" className="mb-5" title="تعذّر استخدام رمز QR">
          {QR_MESSAGES[qrState]}
        </Alert>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {phase === "compose" && (
          <motion.section
            key="compose"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
            aria-labelledby="compose-title"
          >
            <h2 id="compose-title" className="sr-only">
              وصف المشكلة
            </h2>
            <LocationPicker
              locations={locations}
              value={locationId === OTHER_LOCATION ? "" : locationId}
              onChange={setLocationId}
              fromQr={fromQr}
              disabled={busy !== null}
            />
            {!registeredLocation && (
              <p className="-mt-3 text-xs text-muted">اختيار الموقع اختياري هنا، وإن لم تحدده سيسألك المساعد عنه.</p>
            )}

            <div>
              <Label htmlFor="description" hint={`${trimmed.length} / ${LIMITS.descriptionMax}`}>
                ما المشكلة؟
              </Label>
              <Textarea
                id="description"
                ref={textareaRef}
                rows={5}
                maxLength={LIMITS.descriptionMax}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب المشكلة بطريقتك، مثل: المكيف ما يبرد في قاعة 204"
                disabled={busy !== null}
                className="text-[1.05rem]"
                aria-describedby="description-help"
              />
              <div id="description-help" className="mt-2.5 flex flex-wrap gap-2" aria-label="أمثلة سريعة">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setDescription(ex)}
                    className="rounded-full border border-line bg-white px-3 py-1 text-sm text-ink/80 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {busy === "analyze" ? (
              <AnalyzingCard />
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={!descriptionValid}
                onClick={() => runAnalysis([])}
              >
                <Sparkles className="size-5" aria-hidden />
                تحليل البلاغ بالذكاء الاصطناعي
              </Button>
            )}
            {!descriptionValid && trimmed.length > 0 && trimmed.length < LIMITS.descriptionMin && (
              <p className="text-center text-sm text-muted">اكتب وصفًا أوضح قليلًا ({LIMITS.descriptionMin} أحرف على الأقل).</p>
            )}
          </motion.section>
        )}

        {phase === "clarify" && analysis && (
          <motion.section
            key="clarify"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            aria-label="سؤال توضيحي"
          >
            {registeredLocation && (
              <p className="mb-4 text-sm text-muted">
                الموقع: <span className="font-semibold text-ink">{registeredLocation.name_ar}</span>
              </p>
            )}
            <ol className="space-y-3" aria-live="polite">
              <Bubble from="user">{trimmed}</Bubble>
              {turns.map((t, i) => (
                <li key={i} className="space-y-3">
                  <Bubble from="ai" as="div">{t.question}</Bubble>
                  <Bubble from="user" as="div">{t.answer}</Bubble>
                </li>
              ))}
              <Bubble from="ai">
                {analysis.reply && <span className="block text-muted">{analysis.reply}</span>}
                <span className="mt-1 block font-semibold text-ink">{analysis.question}</span>
              </Bubble>
            </ol>

            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const a = answer.trim();
                if (!a || !analysis.question) return;
                runAnalysis([...turns, { question: analysis.question, answer: a }]);
              }}
            >
              <Label htmlFor="answer" hint={`السؤال ${turns.length + 1} من ${LIMITS.maxClarifications} كحد أقصى`}>
                إجابتك
              </Label>
              <div className="flex gap-2">
                <Textarea
                  id="answer"
                  rows={2}
                  autoFocus
                  maxLength={LIMITS.answerMax}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={busy !== null}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="اكتب إجابة مختصرة"
                />
                <Button type="submit" className="h-auto shrink-0 px-4" loading={busy === "analyze"} disabled={!answer.trim()} aria-label="إرسال الإجابة">
                  {busy !== "analyze" && <Send className="size-5 -scale-x-100" aria-hidden />}
                </Button>
              </div>
              <button type="button" onClick={backToCompose} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50">
                <PenLine className="size-4" aria-hidden />
                تعديل وصف المشكلة
              </button>
            </form>
          </motion.section>
        )}

        {phase === "preview" && analysis?.draft && (
          <motion.section
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            aria-label="مراجعة البلاغ"
          >
            <TicketPreview
              analysis={analysis}
              description={trimmed}
              turns={turns}
              locations={locations}
              initialLocationId={locationId}
              fromQr={fromQr}
              submitting={busy === "submit"}
              onSubmit={submit}
              onEdit={backToCompose}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {error && (
        <Alert
          tone="danger"
          className="mt-5"
          title="لم يكتمل الطلب"
          action={
            error.retry && (
              <Button size="sm" variant="outline" onClick={error.retry} disabled={busy !== null}>
                <ArrowRight className="size-4" aria-hidden />
                إعادة المحاولة
              </Button>
            )
          }
        >
          {error.message}
        </Alert>
      )}
    </div>
  );
}

function Bubble({ from, children, as = "li" }: { from: "user" | "ai"; children: React.ReactNode; as?: "li" | "div" }) {
  const Tag = as;
  return (
    <Tag className={from === "user" ? "flex justify-start" : "flex justify-end"}>
      {from === "user" ? (
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand-900 px-4 py-2.5 text-white">{children}</div>
      ) : (
        <div className="flex max-w-[88%] items-start gap-2">
          <div className="rounded-2xl rounded-tl-md border border-brand-100 bg-white px-4 py-2.5 shadow-[var(--shadow-lift)]">{children}</div>
          <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700" aria-hidden>
            <Bot className="size-4" />
          </span>
        </div>
      )}
    </Tag>
  );
}

function AnalyzingCard() {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-2 font-semibold text-brand-700">
        <Sparkles className="size-5 animate-pulse" aria-hidden />
        يحلل Llama بلاغك الآن…
      </div>
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">قد يستغرق التحليل بضع ثوانٍ.</p>
    </div>
  );
}
