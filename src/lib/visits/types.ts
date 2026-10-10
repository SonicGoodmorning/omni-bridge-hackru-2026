import { z } from "zod";
import { LOCALES, type Engine, type Locale, type ReviewFlag } from "../types";

export type VisitSpeaker = "clinician" | "participant";

export interface VisitRequest {
  requestId: string;
  locale: Locale;
  engine: Engine;
  speaker: VisitSpeaker;
  text: string;
}

export interface VisitResult {
  requestId: string;
  locale: Locale;
  engine: Engine;
  speaker: VisitSpeaker;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translation: string;
  reverseTranslation: string;
  flags: ReviewFlag[];
  elapsedMs: number;
  canRelease: boolean;
}

export const visitRequestSchema = z.object({
  requestId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  locale: z.enum(LOCALES),
  engine: z.enum(["live", "sample"]),
  speaker: z.enum(["clinician", "participant"]),
  text: z.string().trim().min(1).max(4_000),
}).strict();

export const visitResultSchema = z.object({
  requestId: z.string().min(1).max(100),
  locale: z.enum(LOCALES),
  engine: z.enum(["live", "sample"]),
  speaker: z.enum(["clinician", "participant"]),
  sourceText: z.string().min(1).max(4_000),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
  translation: z.string().trim().min(1).max(20_000),
  reverseTranslation: z.string().trim().min(1).max(20_000),
  flags: z.array(z.object({
    code: z.string().min(1),
    severity: z.enum(["info", "warning", "blocking"]),
    message: z.string().min(1),
    sourceSnippet: z.string().optional(),
  }).strict()).max(40),
  elapsedMs: z.number().finite().nonnegative(),
  canRelease: z.boolean(),
}).strict().superRefine((value, context) => {
  const sourceLanguage = value.speaker === "clinician" ? "en-US" : value.locale;
  const targetLanguage = value.speaker === "clinician" ? value.locale : "en-US";
  if (value.sourceLanguage !== sourceLanguage || value.targetLanguage !== targetLanguage) {
    context.addIssue({ code: "custom", path: ["sourceLanguage"], message: "The language direction must match the speaker." });
  }
  if (value.canRelease && value.flags.some((flag) => flag.severity === "blocking")) {
    context.addIssue({ code: "custom", path: ["canRelease"], message: "Blocking flags cannot be released." });
  }
});

export const visitTranslationSchema = z.object({
  translation: z.string().trim().min(1).max(20_000),
  concerns: z.array(z.object({
    code: z.enum(["AMBIGUOUS_SOURCE", "TRANSLATION_UNCERTAINTY"]),
    message: z.string().trim().min(1).max(600),
  }).strict()).max(8),
}).strict();

export const visitReverseSchema = z.object({
  reverseTranslation: z.string().trim().min(1).max(20_000),
}).strict();

export const visitTranslationJsonSchema = z.toJSONSchema(visitTranslationSchema);
export const visitReverseJsonSchema = z.toJSONSchema(visitReverseSchema);
