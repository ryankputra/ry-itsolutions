import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/lib/store";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NavigationProgressBar } from "@/components/ui/NavigationProgressBar";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ry-ITSolutions",
  },
  formatDetection: {
    telephone: false,
  },
};

import { Suspense } from "react";

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
      <body className="min-h-screen bg-canvas text-ink font-sans" suppressHydrationWarning>
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
