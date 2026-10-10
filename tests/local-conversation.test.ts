import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_SAVED_BYTES, parseSavedConversation, serializeConversation, type SavedConversation } from "../src/lib/local-conversation";
const saved: SavedConversation = { version: 1, locale: "tr-TR", engine: "sample", turns: [
  { id: "a", speaker: "clinician", sourceText: "Hello", translation: "Merhaba", sourceLanguage: "en-US", targetLanguage: "tr-TR", engine: "sample", prepared: false },
  { id: "b", speaker: "participant", sourceText: "Merhaba", translation: "Hello", sourceLanguage: "tr-TR", targetLanguage: "en-US", engine: "sample", prepared: true },
] };
test("saved conversations round trip with accurate directions and engine labels", () => {
  assert.deepEqual(parseSavedConversation(serializeConversation(saved)), saved);
});
test("invalid storage cannot restore drafts, false directions, duplicated turns or unsupported versions", () => {
  for (const invalid of ["broken", JSON.stringify({ ...saved, version: 2 }), JSON.stringify({ ...saved, drafts: { clinician: "private" } }),
    JSON.stringify({ ...saved, turns: [saved.turns[0], saved.turns[0]] }),
    JSON.stringify({ ...saved, locale: "es-419" }),
    JSON.stringify({ ...saved, turns: [{ ...saved.turns[0], engine: "live", prepared: true }] }), "x".repeat(MAX_SAVED_BYTES + 1)]) {
    assert.throws(() => parseSavedConversation(invalid));
  }
});
