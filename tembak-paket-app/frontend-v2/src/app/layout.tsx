import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/lib/store";
import { DynamicThemeProvider } from "@/lib/themeContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NavigationProgressBar } from "@/components/ui/NavigationProgressBar";
import { PushNotificationBanner } from "@/components/ui/PushNotificationBanner";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "GANTI_DENGAN_GOOGLE_CLIENT_ID_ANDA";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0066cc",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ry-itsolutionts.web.id"),
  title: {
    default: "Ry-ITSolutions - Platform Solusi IT, Otomasi Digital & FinTech",
    template: "%s | Ry-ITSolutions",
  },
  description: "Pusat layanan IT terpadu: Aktivasi sinyal seluler IMEI bergaransi, Payment Gateway GoPay & QRIS SaaS, Cek Database CEIR Kemenperin & Bea Cukai realtime.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ry-ITSolutions",
  },
  openGraph: {
    title: "Ry-ITSolutions - Platform Solusi IT, Otomasi Digital & FinTech",
    description: "Pusat layanan IT terpadu: Aktivasi sinyal seluler IMEI bergaransi, Payment Gateway GoPay & QRIS SaaS, Cek Database CEIR Kemenperin & Bea Cukai realtime.",
    url: "https://ry-itsolutionts.web.id",
    siteName: "Ry-ITSolutions",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ry-ITSolutions - Platform Solusi IT, Otomasi Digital & FinTech",
    description: "Pusat layanan IT terpadu: Aktivasi sinyal seluler IMEI bergaransi, Payment Gateway GoPay & QRIS SaaS, Cek Database CEIR Kemenperin & Bea Cukai realtime.",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} antialiased`}
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-canvas text-ink font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <DynamicThemeProvider>
            <AppProvider>
              {children}
              <PushNotificationBanner />
            </AppProvider>
          </DynamicThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
