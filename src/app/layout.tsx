import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./session.css";
import "./documents.css";
import "./care.css";
import "./numbers.css";
import "./history.css";
import "./theme.css";
import "./jargon.css";
import { SessionProvider } from "@/components/session-provider";
import { AppShell } from "@/components/app-shell";

const manrope = localFont({ src: "./fonts/Manrope.ttf", variable: "--font-manrope", weight: "200 800", display: "swap", fallback: ["Arial"], adjustFontFallback: "Arial" });
const barlow = localFont({ src: "./fonts/BarlowCondensed-SemiBold.ttf", variable: "--font-barlow", weight: "600", display: "swap", fallback: ["Arial Narrow", "Arial"], adjustFontFallback: "Arial" });

export const metadata: Metadata = {
  title: "SayAhh · Understand the conversation",
  description: "Understand medical jargon in plain English or 15 other languages. Translate, review, and discuss clinical wording.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${manrope.variable} ${barlow.variable}`} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('omni-bridge-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}` }} /></head><body><SessionProvider liveAvailable={Boolean(process.env.GEMINI_API_KEY?.trim())}><AppShell>{children}</AppShell></SessionProvider></body></html>;
}
