import { z } from "zod";
import { LOCALES, type Engine, type Locale, type ReviewFlag } from "../types";
import { resolveDocumentSource } from "./source";

export type DocumentInput = { kind: "fixture"; id: "visit-summary" } | { kind: "paste"; text: string; acknowledged: true };
export interface DocumentRequest { requestId: string; locale: Locale; engine: Engine; source: DocumentInput }
export interface DocumentParagraph { id: string; title: string; text: string }
export interface DocumentSource { id: string; revision: string; title: string; provenance: "fictional-fixture" | "synthetic-paste"; paragraphs: DocumentParagraph[] }
export interface DocumentBlock { id: string; sourceParagraphIds: string[]; translation: string; backTranslation: string }
export interface DocumentResult {
  requestId: string; locale: Locale; engine: Engine; source: DocumentSource;
  blocks: DocumentBlock[]; flags: ReviewFlag[]; elapsedMs: number; canRelease: boolean;
}

const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const documentInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixture"), id: z.literal("visit-summary") }).strict(),
  z.object({ kind: z.literal("paste"), text: z.string().trim().min(1).max(4_000), acknowledged: z.literal(true) }).strict(),
]);
export const documentRequestSchema = z.object({
  requestId: identifier, locale: z.enum(LOCALES), engine: z.enum(["live", "sample"]), source: documentInputSchema,
}).strict();
export const documentSourceSchema = z.object({
  id: identifier, revision: identifier, title: z.string().min(1).max(200),
  provenance: z.enum(["fictional-fixture", "synthetic-paste"]),
  paragraphs: z.array(z.object({ id: identifier, title: z.string().min(1).max(200), text: z.string().min(1).max(4_000) }).strict()).min(1).max(20),
}).strict().superRefine((value, context) => {
  if (new Set(value.paragraphs.map((p) => p.id)).size !== value.paragraphs.length) context.addIssue({ code: "custom", message: "Source paragraph IDs must be unique." });
});
export const documentResultSchema = z.object({
  requestId: identifier, locale: z.enum(LOCALES), engine: z.enum(["live", "sample"]), source: documentSourceSchema,
  blocks: z.array(z.object({ id: identifier, sourceParagraphIds: z.array(identifier).length(1), translation: z.string().trim().min(1).max(8_000), backTranslation: z.string().trim().min(1).max(8_000) }).strict()).min(1).max(20),
  flags: z.array(z.object({ code: z.string().min(1), severity: z.enum(["info", "warning", "blocking"]), message: z.string().min(1), sourceSnippet: z.string().optional() }).strict()).max(100),
  elapsedMs: z.number().finite().nonnegative(), canRelease: z.boolean(),
}).strict().superRefine((value, context) => {
  const ids = new Set(value.source.paragraphs.map((p) => p.id));
  const seen = new Set<string>();
  for (const block of value.blocks) {
    if (!ids.has(block.id) || seen.has(block.id) || block.sourceParagraphIds[0] !== block.id) context.addIssue({ code: "custom", path: ["blocks"], message: "Each explanation must reference exactly its own source paragraph once." });
    seen.add(block.id);
  }
  if (seen.size !== ids.size) context.addIssue({ code: "custom", path: ["blocks"], message: "Every source paragraph must be explained." });
  if (value.canRelease && value.flags.some((f) => f.severity === "blocking")) context.addIssue({ code: "custom", path: ["canRelease"], message: "Blocking drafts cannot be shared." });
});

export function matchesDocumentRequest(result: DocumentResult, request: DocumentRequest) {
  return result.requestId === request.requestId && result.locale === request.locale && result.engine === request.engine
    && JSON.stringify(result.source) === JSON.stringify(resolveDocumentSource(request.source));
}

export const documentTranslationSchema = z.object({
  blocks: z.array(z.object({ id: identifier, sourceParagraphIds: z.array(identifier).length(1), translation: z.string().trim().min(1).max(8_000) }).strict()).min(1).max(20),
  concerns: z.array(z.object({ code: z.enum(["AMBIGUOUS_SOURCE", "TRANSLATION_UNCERTAINTY"]), message: z.string().trim().min(1).max(600) }).strict()).max(8),
}).strict();
export const documentReverseSchema = z.object({ blocks: z.array(z.object({ id: identifier, backTranslation: z.string().trim().min(1).max(8_000) }).strict()).min(1).max(20) }).strict();
export const documentTranslationJsonSchema = z.toJSONSchema(documentTranslationSchema);
export const documentReverseJsonSchema = z.toJSONSchema(documentReverseSchema);
