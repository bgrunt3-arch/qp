import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qp.vercel.app";

const iconVersion = "4";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: "/icon-192.png?v=" + iconVersion, sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=" + iconVersion, sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  title: {
    default: "QuickPercent - 割合を即座に算出",
    template: "%s | QuickPercent",
  },
  description: "全体と成果を入力して割合を即座に算出。逆算モード、履歴保存、コピー機能付き。",
  keywords: ["割合", "パーセント", "計算", "達成率", "進捗"],
  authors: [{ name: "QuickPercent" }],
  openGraph: {
    title: "QuickPercent - 割合を即座に算出",
    description: "全体と成果を入力して割合を即座に算出。逆算モード、履歴保存、コピー機能付き。",
    url: siteUrl,
    siteName: "QuickPercent",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuickPercent - 割合を即座に算出",
    description: "全体と成果を入力して割合を即座に算出。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffbf5" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/icon.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" sizes="512x512" />
        <link rel="manifest" href="/manifest.json" />
        {ADSENSE_CLIENT && (
          <Script
            id="adsense"
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
