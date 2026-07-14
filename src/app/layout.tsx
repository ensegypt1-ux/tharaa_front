import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

/** Same Arabic UI font file shipped with the Tharaa Flutter customer app. */
const tharaaArabic = localFont({
  src: [
    {
      path: "../fonts/Cairo-VariableFont_slnt_wght.ttf",
      weight: "200 1000",
      style: "normal",
    },
  ],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "لوحة تحكم سوق ثراء",
  description: "لوحة التحكم الإدارية لسوق ثراء",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar-sa" dir="rtl">
      <body className={`${tharaaArabic.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
