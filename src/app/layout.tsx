import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala } from "next/font/google";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getT, getTheme } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Sinhala glyphs (Geist has none); used as the fallback in the font stack.
const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: "DigiMemo", description: t("meta.description") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSinhala.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
