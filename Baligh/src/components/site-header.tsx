import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { Logo } from "./logo";
import { ButtonLink } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 text-[0.95rem] font-medium text-ink/80 md:flex">
          <Link className="rounded-lg px-3 py-2 hover:bg-brand-50 hover:text-brand-700" href="/#how">
            كيف يعمل
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-brand-50 hover:text-brand-700" href="/#categories">
            أنواع البلاغات
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-brand-50 hover:text-brand-700" href="/#faq">
            الأسئلة الشائعة
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-brand-50 hover:text-brand-700" href="/track">
            متابعة بلاغ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/track" variant="ghost" size="sm" className="md:hidden" aria-label="متابعة بلاغ">
            <ScanSearch className="size-4" aria-hidden />
            متابعة
          </ButtonLink>
          <ButtonLink href="/report" size="sm" className="h-10 px-4">
            إنشاء بلاغ
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
