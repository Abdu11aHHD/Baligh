import type { Metadata } from "next";
import { LocationsManager, type AdminLocation } from "@/components/admin/locations-manager";
import { Alert } from "@/components/ui/alert";
import { requireAdminPage } from "@/lib/auth";
import { getSiteUrl, SiteUrlError } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المواقع ورموز QR", robots: { index: false } };

export default async function LocationsPage() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("locations").select("*").order("created_at", { ascending: true });
  if (error) throw error;

  let siteUrl: string | null = null;
  let siteUrlError: string | null = null;
  try {
    siteUrl = getSiteUrl();
  } catch (e) {
    siteUrlError = e instanceof SiteUrlError ? e.message : "NEXT_PUBLIC_SITE_URL غير صالح";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">المواقع ورموز QR</h1>
        <p className="mt-1 text-muted">كل موقع له رمز QR يفتح صفحة البلاغ والموقع محدد مسبقًا.</p>
      </header>
      {siteUrlError && (
        <Alert tone="danger" title="لا يمكن توليد رموز QR صالحة">
          {siteUrlError}. اضبط NEXT_PUBLIC_SITE_URL على نطاق النشر الفعلي ثم أعد النشر.
        </Alert>
      )}
      <LocationsManager initial={(data ?? []) as AdminLocation[]} siteUrl={siteUrl} />
    </div>
  );
}
