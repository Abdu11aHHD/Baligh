import Link from "next/link";
import { Logo } from "./logo";

export function IndependentNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-6 text-muted ${className}`}>
      بلّغ AI مشروع تجريبي مستقل مستوحى من تجربة أكاديمية طويق الرقمية، وغير مرتبط رسميًا بالأكاديمية ولا يمثّلها،
      ولا يتصل بأنظمتها الداخلية.
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            منصة لتنظيم بلاغات المرافق والخدمات داخل الحرم التدريبي، تعتمد على رموز QR لتحديد المكان ونموذج Meta Llama
            لفهم البلاغ وتنظيمه.
          </p>
          <IndependentNotice />
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">المتدربون</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-brand-700" href="/report">إنشاء بلاغ جديد</Link></li>
            <li><Link className="hover:text-brand-700" href="/track">متابعة بلاغ</Link></li>
            <li><Link className="hover:text-brand-700" href="/#faq">الأسئلة الشائعة</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">فريق المرافق</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-brand-700" href="/admin">لوحة الإدارة</Link></li>
            <li><Link className="hover:text-brand-700" href="/admin/locations">المواقع ورموز QR</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        مشروع جامعي تجريبي، مدعوم بنموذج Meta Llama عبر OpenRouter
      </div>
    </footer>
  );
}
