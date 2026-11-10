import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackClient } from "@/components/track/track-client";

export const metadata: Metadata = { title: "متابعة بلاغ" };

export default function TrackPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative flex-1">
        <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-x-0 top-0 h-80" aria-hidden />
        <div className="relative mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
          <TrackClient />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
