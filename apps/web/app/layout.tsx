import { getSiteOrigin } from "@/src/lib/site-url";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "./_components/SiteHeader";
import SiteFooter from "./_components/SiteFooter";
import SiteNavigation from "./_components/SiteNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteOrigin()
    ? new URL(getSiteOrigin()!)
    : undefined,
  title: "خانه‌یار | خرید، فروش و اجاره ملک",
  description: "جست‌وجو، خرید، فروش و اجاره ملک و ثبت آگهی در خانه‌یار.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" dir="rtl">
        <Suspense fallback={<div aria-hidden="true" style={{ minHeight: 80 }} />}>
        <SiteHeader />
        </Suspense>
        <div className="site-content">{children}</div>
        <Suspense fallback={null}><SiteNavigation /></Suspense>
        <SiteFooter />
      </body>
    </html>
  );
}
