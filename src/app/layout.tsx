import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Amiri } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";

const ibmPlex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "حصون — تنظيم حفظ القرآن الكريم",
  description:
    "برنامج تفاعلي لتنظيم حفظ القرآن الكريم بطريقة الحصون الخمسة. بتصميم عصري ملهم.",
  keywords: [
    "حفظ القرآن",
    "الحصون الخمسة",
    "مراجعة القرآن",
    "جدول حفظ",
    "القرآن الكريم",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "حصون",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlex.variable} ${amiri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col selection:bg-primary/20 selection:text-primary">
        <Providers>{children}</Providers>
        <Toaster position="bottom-center" theme="system" richColors />
      </body>
    </html>
  );
}
