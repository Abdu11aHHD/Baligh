"use client";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-muted">لم تكتمل العملية. أعد المحاولة، وإن تكرر الخطأ فحاول لاحقًا.</p>
        <Button className="mt-6" onClick={reset}>إعادة المحاولة</Button>
      </div>
    </main>
  );
}
