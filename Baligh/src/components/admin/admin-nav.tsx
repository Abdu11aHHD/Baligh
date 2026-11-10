"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Inbox, LogOut, MapPinned, SquareArrowOutUpLeft } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "البلاغات", Icon: Inbox, match: (p: string) => p === "/admin" || p.startsWith("/admin/reports") },
  { href: "/admin/locations", label: "المواقع ورموز QR", Icon: MapPinned, match: (p: string) => p.startsWith("/admin/locations") },
];

export function AdminNav({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  return (
    <nav aria-label="تنقل لوحة الإدارة" className="flex items-center gap-1 lg:mt-8 lg:flex-col lg:items-stretch">
      {LINKS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-brand-500 text-white" : "text-ink/75 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
      <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink/75 hover:bg-brand-50 lg:mt-2">
        <SquareArrowOutUpLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">الموقع العام</span>
      </Link>
      <div className="hidden border-t border-line pt-4 text-xs text-muted lg:mt-6 lg:block">
        <p className="ltr-chunk truncate">{email}</p>
        <p>{role === "admin" ? "مشرف" : "موظف"}</p>
      </div>
      <button
        type="button"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          await getSupabaseBrowser().auth.signOut();
          router.replace("/admin/login");
          router.refresh();
        }}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-danger-ink hover:bg-danger-soft disabled:opacity-60"
      >
        <LogOut className="size-4" aria-hidden />
        <span className="hidden sm:inline">تسجيل الخروج</span>
      </button>
    </nav>
  );
}
