import type { Metadata } from "next";
import "./globals.css";
import "./session.css";
import "./documents.css";
import { SessionProvider } from "@/components/session-provider";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Omni-Bridge · Understand the conversation",
  description: "Synthetic trial education and bilingual visit practice. Translate, review, and share in five languages.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SessionProvider liveAvailable={Boolean(process.env.GEMINI_API_KEY?.trim())}><AppShell>{children}</AppShell></SessionProvider></body></html>;
}
