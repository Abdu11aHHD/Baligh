import type { Metadata } from "next";
import { ReportFlow } from "@/components/report/report-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert } from "@/components/ui/alert";
import type { LocationOption } from "@/lib/api-types";
import { listActiveLocations, resolveLocationByCode } from "@/lib/data/locations";
import { locationCodeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إنشاء بلاغ" };

type QrState = "none" | "ok" | "invalid" | "inactive";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ loc?: string | string[] }> }) {
  const { loc } = await searchParams;
  const rawCode = Array.isArray(loc) ? loc[0] : loc;

  let locations: LocationOption[] = [];
  let initial: LocationOption | null = null;
  let qrState: QrState = "none";
  let loadError = false;

  try {
    locations = await listActiveLocations();
    if (rawCode) {
      const parsed = locationCodeSchema.safeParse(rawCode);
      if (!parsed.success) qrState = "invalid";
      else {
        const lookup = await resolveLocationByCode(parsed.data);
        if (lookup.status === "ok") {
          initial = lookup.location;
          qrState = "ok";
        } else qrState = lookup.status === "inactive" ? "inactive" : "invalid";
      }
    }
  } catch (e) {
    console.error("[report-page] failed to load locations", e);
    loadError = true;
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="relative flex-1">
        <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-x-0 top-0 h-80" aria-hidden />
        <div className="relative mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
          {loadError ? (
            <Alert tone="danger" title="تعذّر تحميل صفحة البلاغ">
              الخدمة غير متاحة مؤقتًا أو لم تكتمل إعداداتها. حاول بعد قليل.
            </Alert>
          ) : (
            <ReportFlow locations={locations} initialLocation={initial} qrState={qrState} />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
