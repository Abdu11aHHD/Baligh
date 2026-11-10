import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import { MotionProvider } from "@/components/motion-provider";

export const metadata: Metadata = {
  title: { default: "بلّغ AI — بلاغات المرافق الذكية", template: "%s | بلّغ AI" },
  description:
    "منصة ذكية لتنظيم بلاغات المرافق والخدمات في الحرم التدريبي، مدعومة بالذكاء الاصطناعي. مشروع تجريبي مستقل.",
  applicationName: "Balligh AI",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#5727c3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
