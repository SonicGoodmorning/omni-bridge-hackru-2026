import { z } from "zod";
import { LOCALES } from "./types";

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
