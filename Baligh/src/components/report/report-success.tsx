"use client";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { CopyButton } from "@/components/common/copy-button";
import { PriorityBadge } from "@/components/ui/badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { trackingLink, type CreateReportResponse } from "@/lib/api-types";
import { SafetyNotice } from "./ticket-preview";

export function ReportSuccess({ result, title }: { result: CreateReportResponse; title: string }) {
  const link = trackingLink(result.ticketNumber, result.trackingSecret);
  const absolute = typeof window !== "undefined" ? `${window.location.origin}${link}` : link;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
      aria-labelledby="success-title"
    >
      <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-brand-500 px-6 py-9 text-center text-white">
        <div className="bg-grid absolute inset-0 opacity-30 [filter:invert(1)]" aria-hidden />
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}>
          <CheckCircle2 className="relative mx-auto size-14" aria-hidden />
        </motion.div>
        <h1 id="success-title" className="relative mt-3 text-2xl font-bold">
          تم إنشاء بلاغك بنجاح
        </h1>
        <p className="relative mt-1 text-brand-100">{title}</p>
        <p className="relative mt-5 text-sm text-brand-100">رقم البلاغ</p>
        <p className="ltr-chunk relative text-3xl font-bold tracking-wider">{result.ticketNumber}</p>
      </div>

      {result.immediateDanger && <SafetyNotice />}

      <div className="rounded-[var(--radius-card)] border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">رمز المتابعة الخاص بك</h2>
          <PriorityBadge priority={result.priority} />
        </div>
        <p className="mt-1 text-sm text-muted">
          احتفظ بهذا الرمز. لا يمكن عرضه مرة أخرى، ولا يستطيع أحد متابعة بلاغك بدونه. حفظناه أيضًا في هذا المتصفح لتسهيل المتابعة.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 p-3">
          <code className="ltr-chunk min-w-0 flex-1 break-all text-sm text-brand-900">{result.trackingSecret}</code>
          <CopyButton value={result.trackingSecret} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyButton value={`${result.ticketNumber}`} label="نسخ رقم البلاغ" />
          <CopyButton value={absolute} label="نسخ رابط المتابعة" />
        </div>
      </div>

      <p className="text-center text-xs leading-6 text-muted">
        وصل البلاغ إلى لوحة إدارة بلّغ AI التجريبية، وليس إلى الأنظمة الداخلية لأي جهة.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={link} size="lg" className="w-full sm:flex-1">
          متابعة حالة البلاغ
        </ButtonLink>
        {/* Full navigation on purpose: resets the whole reporting flow. */}
        <a href="/report" className={buttonClasses("outline", "lg", "w-full sm:flex-1")}>
          بلاغ جديد
        </a>
      </div>
    </motion.section>
  );
}
