import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10", className)} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#5727C3" />
      <path d="M17 17h30a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5H30l-9 8v-8h-4a5 5 0 0 1-5-5V22a5 5 0 0 1 5-5z" fill="#fff" />
      <rect x="21" y="24" width="7" height="7" rx="1.5" fill="#5727C3" />
      <rect x="36" y="24" width="7" height="7" rx="1.5" fill="#5727C3" />
      <rect x="21" y="33" width="7" height="4" rx="1.5" fill="#7545DE" />
      <circle cx="39.5" cy="35" r="2.5" fill="#7545DE" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="بلّغ AI — الصفحة الرئيسية">
      <LogoMark />
      <span className="flex items-baseline gap-1.5">
        <span className="text-[1.4rem] font-bold leading-none text-brand-900">بلّغ</span>
        <span className="ltr-chunk rounded-md bg-brand-100 px-1.5 py-0.5 text-[0.7rem] font-bold leading-none text-brand-700">AI</span>
      </span>
    </Link>
  );
}
