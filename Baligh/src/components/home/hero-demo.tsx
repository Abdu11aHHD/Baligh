"use client";
import { motion } from "motion/react";
import { QrCode, Sparkles } from "lucide-react";

/**
 * The hero's single orchestrated moment: a printed QR placard, the trainee's
 * message, then the structured ticket Llama prepares from it.
 */
export function HeroDemo({ qrDataUrl }: { qrDataUrl: string | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] pb-6 lg:mx-0" aria-label="مثال توضيحي لطريقة عمل بلّغ" role="img">
      {/* Placard */}
      <motion.div
        initial={{ opacity: 0, rotate: -6, y: 16 }}
        animate={{ opacity: 1, rotate: -3, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative rounded-[1.75rem] border border-brand-200 bg-white p-6 shadow-[var(--shadow-lift)]"
      >
        <p className="text-lg font-bold leading-snug text-brand-900">لاحظت مشكلة في هذا المكان؟</p>
        <p className="mt-1 text-sm text-muted">امسح الرمز وبلّغنا خلال لحظات</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-32 shrink-0 place-items-center rounded-2xl border-2 border-brand-100 bg-white p-1.5">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="" className="size-full" />
            ) : (
              <QrCode className="size-16 text-brand-500" aria-hidden />
            )}
          </div>
          <div className="space-y-2 text-sm">
            <span className="inline-block rounded-full bg-brand-500 px-3 py-1 font-semibold text-white">قاعة 204</span>
            <p className="text-xs leading-5 text-muted">رمز مرتبط بموقع مسجّل، يفتح صفحة البلاغ مباشرة والموقع محدد.</p>
          </div>
        </div>
      </motion.div>

      {/* Trainee message */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.55, duration: 0.45 }}
        className="relative -mt-4 ms-auto me-[-0.5rem] w-[78%] rounded-2xl rounded-tl-md bg-brand-900 px-4 py-3 text-[0.95rem] text-white shadow-lg sm:me-[-1.5rem]"
      >
        المكيف ما يبرد والقاعة حارة مرة
      </motion.div>

      {/* Ticket stub */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="relative mt-3 w-[92%] rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-500">
          <Sparkles className="size-3.5" aria-hidden />
          تحليل Llama
        </div>
        <p className="mt-1.5 font-bold text-ink">تعطل التكييف في قاعة 204</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">الصيانة</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">التكييف</span>
          <span className="rounded-full bg-warning-soft px-2.5 py-1 text-warning-ink">أولوية عالية</span>
        </div>
      </motion.div>
    </div>
  );
}
