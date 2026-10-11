import type { PatientContext } from "./patient/profile";
export const LOCALES = ["en-US", "es-419", "zh-CN", "hi-IN", "ar-SA", "fr-FR", "pt-BR", "bn-BD", "ru-RU", "ur-PK", "id-ID", "de-DE", "ja-JP", "ko-KR", "vi-VN", "tr-TR"] as const;
export const SAMPLE_LOCALES = ["en-US", "tr-TR", "es-419", "pt-BR", "hi-IN", "zh-CN"] as const;
export type SampleLocale = (typeof SAMPLE_LOCALES)[number];
export function hasPreparedSamples(locale: Locale): locale is SampleLocale { return (SAMPLE_LOCALES as readonly string[]).includes(locale); }
export function languageDirection(locale: string): "rtl" | "ltr" { return /^(ar|ur)(-|$)/.test(locale) ? "rtl" : "ltr"; }
export function speechLocale(locale: Locale): string { return locale === "es-419" ? "es-MX" : locale; }
export type Locale = (typeof LOCALES)[number];
export type BridgeMode = "consent" | "conversation";
export type Engine = "live" | "sample";
export type Visual = "RANDOMIZATION" | "CALENDAR" | "DOCUMENT" | "NONE";

export const LANGUAGES: { locale: Locale; name: string; nativeName: string; short: string }[] = [
  { locale: "en-US", name: "English", nativeName: "English · plain language", short: "EN" },
  { locale: "es-419", name: "Spanish", nativeName: "Español", short: "ES" },
  { locale: "zh-CN", name: "Mandarin Chinese (Simplified)", nativeName: "中文（简体）", short: "ZH" },
  { locale: "hi-IN", name: "Hindi", nativeName: "हिन्दी", short: "HI" },
  { locale: "ar-SA", name: "Arabic (Modern Standard)", nativeName: "العربية", short: "AR" },
  { locale: "fr-FR", name: "French", nativeName: "Français", short: "FR" },
  { locale: "pt-BR", name: "Portuguese", nativeName: "Português (Brasil)", short: "PT" },
  { locale: "bn-BD", name: "Bengali", nativeName: "বাংলা", short: "BN" },
  { locale: "ru-RU", name: "Russian", nativeName: "Русский", short: "RU" },
  { locale: "ur-PK", name: "Urdu", nativeName: "اردو", short: "UR" },
  { locale: "id-ID", name: "Indonesian", nativeName: "Bahasa Indonesia", short: "ID" },
  { locale: "de-DE", name: "German", nativeName: "Deutsch", short: "DE" },
  { locale: "ja-JP", name: "Japanese", nativeName: "日本語", short: "JA" },
  { locale: "ko-KR", name: "Korean", nativeName: "한국어", short: "KO" },
  { locale: "vi-VN", name: "Vietnamese", nativeName: "Tiếng Việt", short: "VI" },
  { locale: "tr-TR", name: "Turkish", nativeName: "Türkçe", short: "TR" },
];
// Older workspaces retain their authored controls. New languages use explicit English
// controls until their UI copy is localized; generated patient content uses the selected locale.
export function extendLocaleCopy<T>(english: T, authored: Partial<Record<Locale, T>>): Record<Locale, T> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, authored[locale] ?? english])) as Record<Locale, T>;
}

export interface StudySection {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  body: string;
  keyFacts: string[];
  visual: Visual;
}

export interface ReviewFlag {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  sourceSnippet?: string;
}

export interface BridgeRequest {
  requestId: string;
  mode: BridgeMode;
  locale: Locale;
  engine: Engine;
  patientContext?: PatientContext;
  sectionId?: string;
  text?: string;
}

export interface BridgeResult {
  requestId: string;
  mode: BridgeMode;
  locale: Locale;
  engine: Engine;
  studyVersion: string;
  sourceText: string;
  sourceSectionIds: string[];
  translation: string;
  backTranslation: string;
  flags: ReviewFlag[];
  visual: Visual;
  elapsedMs: number;
  canRelease: boolean;
}

export interface BridgeError {
  error: { code: string; message: string; retryable: boolean };
}
