import { BrainCircuit, ChevronDown, Cpu, Droplets, QrCode, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { HeroDemo } from "@/components/home/hero-demo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { CATEGORIES, CATEGORY_LABELS, SUBCATEGORIES, SUBCATEGORY_LABELS, type Category } from "@/lib/constants";
import { renderQrDataUrl } from "@/lib/qr";
import { buildReportUrl } from "@/lib/site-url";

async function demoQr(): Promise<string | null> {
  try {
    return await renderQrDataUrl(buildReportUrl("ROOM-204"), 320);
  } catch {
    return null;
  }
}

const STEPS = [
  { title: "امسح الرمز", body: "رمز QR معلّق في المكان يفتح صفحة البلاغ بكاميرا جوالك، بدون تطبيق ولا تسجيل." },
  { title: "اكتب المشكلة بطريقتك", body: "بجملة عادية مثل «النت ما يشتغل» — الموقع معروف من الرمز." },
  { title: "راجع البلاغ", body: "يرتّب Llama العنوان والتصنيف والأولوية، وتعدّل ما تريد قبل الإرسال." },
  { title: "تابع الحالة", body: "تحصل على رقم بلاغ ورمز متابعة خاص تتابع به الحالة في أي وقت." },
];

const CATEGORY_ICONS: Record<Category, typeof Wrench> = {
  maintenance: Wrench,
  it_support: Cpu,
  facilities: Droplets,
  safety: ShieldAlert,
  other: Sparkles,
};

const FAQ = [
  {
    q: "هل أحتاج إلى حساب لإرسال بلاغ؟",
    a: "لا. البلاغ لا يتطلب تسجيل دخول ولا بيانات شخصية. بعد الإرسال تحصل على رقم بلاغ ورمز متابعة خاص بك.",
  },
  {
    q: "هل يثبت رمز QR أنني موجود في المكان؟",
    a: "لا. الرمز يحدد الموقع المسجّل لتسهيل البلاغ فقط، ولا يتحقق من مكانك الفعلي. لا نستخدم GPS أو الخرائط.",
  },
  {
    q: "ما دور الذكاء الاصطناعي بالضبط؟",
    a: "يقرأ نموذج Meta Llama وصفك، ويقترح عنوانًا وتصنيفًا وأولوية والجهة المناسبة، ويسأل سؤالًا قصيرًا عند الحاجة فقط. أنت تراجع النتيجة قبل الإرسال، وفريق المرافق يراجعها بعدك.",
  },
  {
    q: "ماذا لو كان هناك خطر مباشر؟",
    a: "ابتعد عن مصدر الخطر وتواصل فورًا مع أمن المبنى أو فريق السلامة في الموقع. البلاغ عبر المنصة لا يضمن استجابة طارئة فورية.",
  },
  {
    q: "من يرى بلاغي؟",
    a: "مشرفو المرافق المصرح لهم فقط. لا توجد قائمة عامة للبلاغات، ولا يمكن لأحد متابعة بلاغك دون رقم البلاغ ورمز المتابعة معًا.",
  },
  {
    q: "هل المنصة تابعة لأكاديمية طويق؟",
    a: "لا. بلّغ AI مشروع تجريبي مستقل مصمم حول حالة استخدام المرافق في الأكاديمية، ولا يتصل بأنظمتها الداخلية.",
  },
];

export default async function HomePage() {
  const qr = await demoQr();
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="px-3 pt-4 sm:px-6 sm:pt-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[var(--radius-panel)] bg-brand-50">
            <div className="bg-grid bg-grid-fade absolute inset-0" aria-hidden />
            <div className="absolute -top-24 -left-24 size-72 rounded-full bg-brand-100 blur-2xl" aria-hidden />
            <div className="relative grid items-center gap-10 px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-20">
              <div>
                <h1 className="text-[2.35rem] font-bold leading-[1.25] text-brand-900 sm:text-5xl sm:leading-[1.2]">
                  لاحظت مشكلة؟
                  <br />
                  بلّغنا بسهولة
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-ink/75">
                  منصة ذكية لتنظيم بلاغات المرافق والخدمات، مدعومة بالذكاء الاصطناعي لتسهيل الإبلاغ وتحسين متابعة
                  المشكلات.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href="/report" size="lg">
                    إنشاء بلاغ جديد
                  </ButtonLink>
                  <ButtonLink href="/track" size="lg" variant="outline">
                    متابعة بلاغ
                  </ButtonLink>
                </div>
              </div>
              <HeroDemo qrDataUrl={qr} />
            </div>
          </div>
        </section>

        {/* How it works — a real sequence, so numbered */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
          <SectionTitle title="أربع خطوات من الملاحظة إلى المتابعة" description="صُممت الرحلة لتستغرق أقل من دقيقة على الجوال." />
          <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative border-t-2 border-brand-100 pt-5">
                <span className="absolute -top-[1.05rem] start-0 grid size-8 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-7 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* What powers it */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-3">
            <div>
              <QrCode className="size-7 text-brand-500" aria-hidden />
              <h3 className="mt-4 text-xl font-bold">رمز لكل مكان</h3>
              <p className="mt-2 leading-7 text-muted">
                كل موقع مسجّل له رمز QR خاص يحمل رابطًا حقيقيًا. يتحقق الخادم من الرمز قبل استخدامه، والرمز المعطّل أو غير
                المعروف يظهر برسالة واضحة مع إمكانية اختيار الموقع يدويًا.
              </p>
              <p className="ltr-chunk mt-4 inline-block rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
                /report?loc=ROOM-204
              </p>
            </div>
            <div>
              <BrainCircuit className="size-7 text-brand-500" aria-hidden />
              <h3 className="mt-4 text-xl font-bold">يفهم اللهجة السعودية</h3>
              <p className="mt-2 leading-7 text-muted">
                يحوّل نموذج Meta Llama الوصف العفوي إلى بلاغ منظّم: عنوان، تصنيف، أولوية مع سببها، والجهة المقترحة. ولا
                يخترع تفاصيل لم تذكرها.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="rounded-xl bg-[#f3f2f6] px-3 py-2 text-ink">«الشاشة خربانة»</p>
                <p className="rounded-xl bg-brand-50 px-3 py-2 text-brand-700">هل الشاشة لا تعمل نهائيًا، أو تعمل لكن لا تعرض الصورة؟</p>
              </div>
            </div>
            <div>
              <ShieldAlert className="size-7 text-brand-500" aria-hidden />
              <h3 className="mt-4 text-xl font-bold">قواعد سلامة لا تعتمد على النموذج</h3>
              <p className="mt-2 leading-7 text-muted">
                قواعد ثابتة على الخادم ترفع أولوية البلاغات الخطرة مثل الأسلاك المكشوفة أو الماء قرب الكهرباء، مهما كان
                اقتراح النموذج. ويراجع المشرف الأولوية النهائية.
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
          <SectionTitle title="ماذا يمكنك أن تبلّغ عنه؟" description="قائمة تصنيفات ثابتة يلتزم بها النموذج، حتى تصل البلاغات للجهة الصحيحة." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c];
              const isSafety = c === "safety";
              return (
                <div
                  key={c}
                  className={
                    isSafety
                      ? "rounded-[var(--radius-card)] bg-brand-900 p-5 text-white"
                      : "rounded-[var(--radius-card)] border border-line bg-white p-5"
                  }
                >
                  <Icon className={isSafety ? "size-6 text-brand-200" : "size-6 text-brand-500"} aria-hidden />
                  <h3 className="mt-3 font-bold">{CATEGORY_LABELS[c]}</h3>
                  <ul className={`mt-2 space-y-1 text-sm ${isSafety ? "text-brand-100" : "text-muted"}`}>
                    {c === "other" ? (
                      <li>أي مشكلة لا تندرج تحت ما سبق</li>
                    ) : (
                      SUBCATEGORIES[c].map((s) => <li key={s}>{SUBCATEGORY_LABELS[s]}</li>)
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 bg-brand-50/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
            <SectionTitle title="الأسئلة الشائعة" description="إجابات مختصرة عن الخصوصية والسلامة وطريقة العمل." />
            <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 leading-7 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
