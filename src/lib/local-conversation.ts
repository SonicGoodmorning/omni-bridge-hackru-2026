import { z } from "zod";
import { LOCALES } from "./types";
import { patientProfileSchema } from "./patient/profile";
import { savedPlanSchema } from "./action-plan/storage";

export const CONVERSATION_STORAGE_KEY = "omnibridge.conversation.v1";
export const MAX_SAVED_BYTES = 2_000_000;
const turnSchema = z.object({
  id: z.string().min(1).max(200),
  speaker: z.enum(["clinician", "participant"]),
  sourceText: z.string().min(1).max(12_000),
  translation: z.string().min(1).max(12_000),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  engine: z.enum(["live", "sample"]),
  prepared: z.boolean(),
}).strict();
export const savedConversationSchema = z.object({
  version: z.literal(1),
  locale: z.enum(LOCALES),
  engine: z.enum(["live", "sample"]),
  turns: z.array(turnSchema).min(1).max(1000),
}).strict().superRefine((saved, context) => {
  const ids = new Set<string>();
  saved.turns.forEach((turn, index) => {
    if (ids.has(turn.id) || (turn.prepared && turn.engine !== "sample") ||
      turn.sourceLanguage !== (turn.speaker === "clinician" ? "en-US" : saved.locale) ||
      turn.targetLanguage !== (turn.speaker === "clinician" ? saved.locale : "en-US")) {
      context.addIssue({ code: "custom", path: ["turns", index], message: "Invalid saved turn context" });
    }
    ids.add(turn.id);
  });
});
export type SavedConversation = z.infer<typeof savedConversationSchema>;
export function parseSavedConversation(raw: string): SavedConversation {
  if (raw.length > MAX_SAVED_BYTES) throw new Error("Saved conversation is too large");
  return savedConversationSchema.parse(JSON.parse(raw));
}
export function serializeConversation(saved: SavedConversation): string {
  const raw = JSON.stringify(savedConversationSchema.parse(saved));
  if (raw.length > MAX_SAVED_BYTES) throw new Error("Conversation is too large to save");
  return raw;
}

export const LEGACY_HISTORY_STORAGE_KEY = "omnibridge.conversations.v2";
export const HISTORY_STORAGE_KEY = "omnibridge.visits.v3";
export const conversationEntrySchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().trim().min(1).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  conversation: savedConversationSchema,
  patientId: z.string().min(1).max(100).nullable().default(null),
  patient: patientProfileSchema.nullable().default(null),
  plan: savedPlanSchema.nullable().default(null),
}).strict().superRefine((entry, context) => {
  if (entry.patient && entry.patient.recordId !== entry.patientId) context.addIssue({ code: "custom", message: "Patient snapshot does not match visit" });
  if (entry.plan && (!entry.patient || entry.plan.result.locale !== entry.conversation.locale ||
    JSON.stringify(entry.plan.result.sourceTurnIds) !== JSON.stringify(entry.conversation.turns.map((turn) => turn.id)))) {
    context.addIssue({ code: "custom", message: "Plan does not match visit source" });
  }
});
export const conversationLibrarySchema = z.object({
  version: z.literal(3),
  activeId: z.string().nullable(),
  conversations: z.array(conversationEntrySchema).max(100),
}).strict().superRefine((library, context) => {
  const ids = new Set(library.conversations.map((entry) => entry.id));
  if (ids.size !== library.conversations.length || (library.activeId !== null && !ids.has(library.activeId))) {
    context.addIssue({ code: "custom", message: "Invalid conversation library identity" });
  }
});
export type ConversationEntry = z.infer<typeof conversationEntrySchema>;
export type ConversationLibrary = z.infer<typeof conversationLibrarySchema>;
export function emptyConversationLibrary(): ConversationLibrary { return { version: 3, activeId: null, conversations: [] }; }
export function parseConversationLibrary(raw: string): ConversationLibrary {
  if (raw.length > MAX_SAVED_BYTES) throw new Error("Conversation history is too large");
  const value = JSON.parse(raw);
  // v2 records have no known patient. Never infer ownership from the active profile.
  if (value?.version === 2) value.version = 3;
  return conversationLibrarySchema.parse(value);
}
export function serializeConversationLibrary(library: ConversationLibrary): string {
  const raw = JSON.stringify(conversationLibrarySchema.parse(library));
  if (raw.length > MAX_SAVED_BYTES) throw new Error("Conversation history is full");
  return raw;
}
export function migrateConversation(saved: SavedConversation, id: string, now: string): ConversationLibrary {
  return { version: 3, activeId: id, conversations: [{ id, title: "Previous conversation", createdAt: now, updatedAt: now, conversation: saved, patientId: null, patient: null, plan: null }] };
}
