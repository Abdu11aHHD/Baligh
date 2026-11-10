import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="relative grid flex-1 place-items-center px-4 py-24 text-center">
        <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <p className="ltr-chunk text-6xl font-bold text-brand-200">404</p>
          <h1 className="mt-3 text-2xl font-bold text-brand-900">الصفحة غير موجودة</h1>
          <p className="mt-2 text-muted">قد يكون الرابط غير صحيح أو أن الصفحة نُقلت.</p>
          <div className="mt-6 flex justify-center gap-3">
            <ButtonLink href="/report">إنشاء بلاغ</ButtonLink>
            <ButtonLink href="/" variant="outline">الصفحة الرئيسية</ButtonLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
