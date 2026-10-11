import { z } from "zod";
import { patientContextSchema } from "../patient/profile";
import { LOCALES } from "../types";
import { SECTIONS } from "../study";

const sectionIds = SECTIONS.map((section) => section.id);

export const bridgeRequestSchema = z.object({
  requestId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  mode: z.enum(["consent", "conversation"]),
  locale: z.enum(LOCALES),
  engine: z.enum(["live", "sample"]),
  patientContext: patientContextSchema.optional(),
  sectionId: z.string().optional(),
  text: z.string().trim().max(4_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.mode === "consent") {
    if (!value.sectionId || !sectionIds.includes(value.sectionId)) {
      context.addIssue({ code: "custom", path: ["sectionId"], message: "Choose a known study section." });
    }
    if (value.text !== undefined) {
      context.addIssue({ code: "custom", path: ["text"], message: "Consent text is resolved from the fixed study." });
    }
  } else {
    if (!value.text) {
      context.addIssue({ code: "custom", path: ["text"], message: "Review a transcript before sending it." });
    }
    if (value.sectionId !== undefined) {
      context.addIssue({ code: "custom", path: ["sectionId"], message: "Conversation requests use reviewed text." });
    }
  }
});

export const translationSchema = z.object({
  translation: z.string().trim().min(1).max(20_000),
  sourceSectionIds: z.array(z.string().min(1)).max(SECTIONS.length),
  visual: z.enum(["RANDOMIZATION", "CALENDAR", "DOCUMENT", "NONE"]),
  concerns: z.array(z.object({
    code: z.enum(["SOURCE_CONTRADICTION", "OUT_OF_SOURCE", "AMBIGUOUS_SOURCE"]),
    message: z.string().trim().min(1).max(600),
    sourceSnippet: z.string().max(600).optional(),
  }).strict()).max(8),
}).strict();

export const backTranslationSchema = z.object({
  backTranslation: z.string().trim().min(1).max(20_000),
}).strict();

export const bridgeResultSchema = z.object({
  requestId: z.string().min(1).max(100),
  mode: z.enum(["consent", "conversation"]),
  locale: z.enum(LOCALES),
  engine: z.enum(["live", "sample"]),
  studyVersion: z.string().min(1),
  sourceText: z.string().min(1).max(4_000),
  sourceSectionIds: z.array(z.string().min(1)).max(SECTIONS.length),
  translation: z.string().trim().min(1).max(20_000),
  backTranslation: z.string().trim().min(1).max(20_000),
  flags: z.array(z.object({
    code: z.string().min(1),
    severity: z.enum(["info", "warning", "blocking"]),
    message: z.string().min(1),
    sourceSnippet: z.string().optional(),
  }).strict()).max(40),
  visual: z.enum(["RANDOMIZATION", "CALENDAR", "DOCUMENT", "NONE"]),
  elapsedMs: z.number().finite().nonnegative(),
  canRelease: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.sourceSectionIds.some((id) => !sectionIds.includes(id))) {
    context.addIssue({ code: "custom", path: ["sourceSectionIds"], message: "Unknown study reference." });
  }
  if (value.canRelease && value.flags.some((flag) => flag.severity === "blocking")) {
    context.addIssue({ code: "custom", path: ["canRelease"], message: "Blocking flags cannot be released." });
  }
});

export const translationJsonSchema = z.toJSONSchema(translationSchema);
export const backTranslationJsonSchema = z.toJSONSchema(backTranslationSchema);

export type TranslationOutput = z.infer<typeof translationSchema>;
