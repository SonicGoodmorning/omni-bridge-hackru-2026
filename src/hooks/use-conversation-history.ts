"use client";

import { useEffect, useRef, useState } from "react";
import { CONVERSATION_STORAGE_KEY, HISTORY_STORAGE_KEY, emptyConversationLibrary,
  parseSavedConversation, parseConversationLibrary, serializeConversationLibrary, migrateConversation,
  type ConversationLibrary, type SavedConversation } from "@/lib/local-conversation";

export function useConversationHistory(snapshot: SavedConversation, restore: (saved: SavedConversation) => void) {
  const [library, setLibrary] = useState<ConversationLibrary>(emptyConversationLibrary);
  const current = useRef(library);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Loading saved conversations…");
  const loaded = useRef(false);
  const readFailed = useRef(false);
  const lastWriteSucceeded = useRef(true);
  function commit(next: ConversationLibrary) {
    current.current = next; setLibrary(next);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, serializeConversationLibrary(next));
      // Remove the legacy copy only after its replacement has been written successfully.
      localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      readFailed.current = false; lastWriteSucceeded.current = true;
      setMessage(next.activeId ? "Shared conversation saved in this browser." : "Shared turns save automatically. Earlier conversations are in Saved conversations.");
      return true;
    } catch {
      lastWriteSucceeded.current = false;
      setMessage("Browser saving is unavailable or full. Latest changes are only in memory; saved copies are unchanged.");
      return false;
    }
  }
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      const legacy = raw === null ? localStorage.getItem(CONVERSATION_STORAGE_KEY) : null;
      const next = raw !== null ? parseConversationLibrary(raw) : legacy !== null
        ? migrateConversation(parseSavedConversation(legacy), crypto.randomUUID(), new Date().toISOString()) : emptyConversationLibrary();
      current.current = next; setLibrary(next);
      const active = next.conversations.find((entry) => entry.id === next.activeId);
      if (active) restore(active.conversation);
      if (legacy !== null) commit(next);
    } catch {
      readFailed.current = true;
      setMessage("Saved data could not be loaded. Delete all saved conversations to clear unreadable data.");
    } finally { setReady(true); }
  // Hydrate once, before the app can accept edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready || (readFailed.current && !snapshot.turns.length)) return;
    const previous = current.current;
    if (!snapshot.turns.length) {
      if (previous.activeId !== null) commit({ ...previous, activeId: null });
      else if (!readFailed.current && lastWriteSucceeded.current) setMessage("Shared turns save automatically. Earlier conversations are in Saved conversations.");
      return;
    }
    const entry = previous.conversations.find((item) => item.id === previous.activeId);
    if (entry && JSON.stringify(entry.conversation) === JSON.stringify(snapshot)) {
      if (!readFailed.current && lastWriteSucceeded.current) setMessage("Shared conversation saved in this browser.");
      return;
    }
    const now = new Date().toISOString();
    const id = entry?.id ?? crypto.randomUUID();
    const nextEntry = { id, title: entry?.title ?? `Conversation ${new Date().toLocaleDateString()} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      createdAt: entry?.createdAt ?? now, updatedAt: now, conversation: snapshot };
    commit({ version: 2, activeId: id, conversations: [nextEntry, ...previous.conversations.filter((item) => item.id !== id)] });
  // Only shared turns and their configuration are saved; drafts never trigger persistence.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, snapshot.turns, snapshot.locale, snapshot.engine]);

  function detach() { if (current.current.activeId !== null) commit({ ...current.current, activeId: null }); }
  function open(id: string) {
    const entry = current.current.conversations.find((item) => item.id === id);
    if (!entry) return false;
    commit({ ...current.current, activeId: id }); restore(entry.conversation); return true;
  }
  function rename(id: string, title: string) {
    const trimmed = title.trim(); if (!trimmed || trimmed.length > 80) return;
    commit({ ...current.current, conversations: current.current.conversations.map((entry) => entry.id === id ? { ...entry, title: trimmed } : entry) });
  }
  function remove(id: string) {
    const active = current.current.activeId === id;
    commit({ ...current.current, activeId: active ? null : current.current.activeId, conversations: current.current.conversations.filter((entry) => entry.id !== id) });
    return active;
  }
  function clear() {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY); localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      readFailed.current = false; current.current = emptyConversationLibrary(); setLibrary(current.current);
      setMessage("All saved conversations deleted.");
    } catch { setMessage("Could not delete browser data. Clear this site’s storage in browser settings."); }
  }
  return { ready, message, library, detach, open, rename, remove, clear };
}
