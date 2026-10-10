export const LOCALES = ["tr-TR", "es-419", "pt-BR", "hi-IN", "zh-CN"] as const;
export type Locale = (typeof LOCALES)[number];
export type BridgeMode = "consent" | "conversation";
export type Engine = "live" | "sample";
export type Visual = "RANDOMIZATION" | "CALENDAR" | "DOCUMENT" | "NONE";

export const LANGUAGES: { locale: Locale; name: string; nativeName: string; short: string }[] = [
  { locale: "tr-TR", name: "Turkish", nativeName: "Türkçe", short: "TR" },
  { locale: "es-419", name: "Spanish", nativeName: "Español", short: "ES" },
  { locale: "pt-BR", name: "Portuguese", nativeName: "Português (Brasil)", short: "PT" },
  { locale: "hi-IN", name: "Hindi", nativeName: "हिन्दी", short: "HI" },
  { locale: "zh-CN", name: "Mandarin", nativeName: "中文（简体）", short: "ZH" },
];

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
