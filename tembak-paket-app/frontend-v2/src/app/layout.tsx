import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/lib/store";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NavigationProgressBar } from "@/components/ui/NavigationProgressBar";
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
  title: "Ry-ITSolutions",
  description: "Cepat. Ringkas. Beli paket dalam hitungan detik.",
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
          <AppProvider>
            {children}
          </AppProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
