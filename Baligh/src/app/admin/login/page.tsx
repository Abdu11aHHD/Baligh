import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/logo";
import { IndependentNotice } from "@/components/site-footer";
import { Alert } from "@/components/ui/alert";
import { getAdminSession } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دخول المشرفين", robots: { index: false } };

export default async function AdminLoginPage() {
  let configured = true;
  let signedInNonAdmin: string | null = null;
  let isAdmin = false;
  try {
    isAdmin = (await getAdminSession()) !== null;
    if (!isAdmin) {
      const { data } = await (await getSupabaseServer()).auth.getUser();
      if (data.user) signedInNonAdmin = data.user.email ?? "";
    }
  } catch {
    configured = false;
  }
  if (isAdmin) redirect("/admin");

  return (
    <main className="relative grid min-h-screen place-items-center bg-brand-50 px-4 py-10">
      <div className="bg-grid bg-grid-fade absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-[var(--radius-panel)] border border-line bg-white p-7 shadow-[var(--shadow-lift)]">
          <h1 className="text-2xl font-bold text-brand-900">دخول فريق المرافق</h1>
          <p className="mt-1 text-sm text-muted">لوحة إدارة البلاغات مخصصة للمشرفين المصرح لهم فقط.</p>
          <div className="mt-6">
            {!configured ? (
              <Alert tone="danger" title="المصادقة غير مهيأة">
                لم تكتمل إعدادات Supabase على الخادم. راجع ملف README لإعداد المتغيرات.
              </Alert>
            ) : (
              <LoginForm signedInNonAdmin={signedInNonAdmin} />
            )}
          </div>
        </div>
        <IndependentNotice className="mt-6 text-center" />
      </div>
    </main>
  );
}
