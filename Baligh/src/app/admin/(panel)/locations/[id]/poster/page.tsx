import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PrintButton } from "@/components/admin/print-button";
import { LogoMark } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { isUuid } from "@/lib/admin-api";
import { requireAdminPage } from "@/lib/auth";
import { renderQrSvg } from "@/lib/qr";
import { buildReportUrl, SiteUrlError } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ملصق QR", robots: { index: false } };

export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { data: loc } = await supabase.from("locations").select("code, name_ar, building, floor, is_active").eq("id", id).maybeSingle();
  if (!loc) notFound();

  let url: string;
  try {
    url = buildReportUrl(loc.code);
  } catch (e) {
    return (
      <Alert tone="danger" title="لا يمكن إنشاء الملصق">
        {e instanceof SiteUrlError ? e.message : "تعذّر بناء الرابط"}. اضبط NEXT_PUBLIC_SITE_URL على نطاق النشر الفعلي.
      </Alert>
    );
  }
  const svg = await renderQrSvg(url);
  const qrSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const shortUrl = url.replace(/^https?:\/\//, "");

  return (
    <div>
      <style>{`@page { size: A4 portrait; margin: 0; } @media print { body * { visibility: hidden; } #poster, #poster * { visibility: visible; } #poster { position: fixed; inset: 0; margin: 0; width: 210mm; height: 297mm; border: 0; box-shadow: none; border-radius: 0; } }`}</style>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/locations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          <ArrowRight className="size-4" aria-hidden />
          المواقع
        </Link>
        <PrintButton />
      </div>
      {!loc.is_active && (
        <Alert tone="warning" className="mb-4 print:hidden">هذا الموقع موقوف حاليًا. فعّله قبل تعليق الملصق.</Alert>
      )}

      <div className="overflow-x-auto pb-4">
        <article
          id="poster"
          className="relative mx-auto flex aspect-[210/297] w-[min(100%,560px)] min-w-[360px] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-lift)] print:w-[210mm]"
        >
          <div className="relative bg-brand-50 px-[8%] pb-[16%] pt-[9%] text-center">
            <div className="bg-grid absolute inset-0" aria-hidden />
            <div className="relative">
              <p className="text-[2rem] font-bold leading-tight text-brand-900 print:text-[2.6rem]">لاحظت مشكلة في هذا المكان؟</p>
              <p className="mt-3 text-[1.15rem] text-brand-700 print:text-2xl">امسح الرمز وبلّغنا خلال لحظات</p>
            </div>
          </div>
          <div className="relative -mt-[11%] flex flex-1 flex-col items-center px-[8%]">
            <div className="rounded-[2rem] border-[6px] border-brand-500 bg-white p-4 shadow-[0_20px_40px_-20px_rgb(63_23_143/0.45)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`رمز QR للإبلاغ عن مشكلة في ${loc.name_ar}`} className="aspect-square w-[min(58vw,300px)] print:w-[95mm]" />
            </div>
            <p className="mt-6 rounded-full bg-brand-500 px-6 py-2 text-xl font-bold text-white print:px-9 print:text-3xl">{loc.name_ar}</p>
            {(loc.building || loc.floor) && <p className="mt-2 text-muted">{[loc.building, loc.floor].filter(Boolean).join("، ")}</p>}
            <ol className="mt-6 flex items-center gap-3 text-sm font-semibold text-ink/80 print:mt-10 print:text-lg">
              <li>١. امسح الرمز</li>
              <li aria-hidden className="text-brand-300">←</li>
              <li>٢. اكتب المشكلة</li>
              <li aria-hidden className="text-brand-300">←</li>
              <li>٣. أرسل البلاغ</li>
            </ol>
            <p className="mt-4 text-center text-xs text-muted">
              لا يعمل الرمز؟ افتح:
              <span className="ltr-chunk mt-0.5 block text-[0.8rem] text-brand-700 print:text-base">{shortUrl}</span>
            </p>
          </div>
          <footer className="mt-auto flex items-center justify-between gap-3 border-t border-line px-[8%] py-4">
            <div className="flex items-center gap-2">
              <LogoMark className="size-8" />
              <span className="font-bold text-brand-900">بلّغ AI</span>
            </div>
            <p className="max-w-[60%] text-end text-[0.65rem] leading-4 text-muted">
              في حال وجود خطر مباشر ابتعد عن المكان وتواصل مع أمن المبنى فورًا. مشروع تجريبي مستقل.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
