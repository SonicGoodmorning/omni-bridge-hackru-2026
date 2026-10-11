"use client";

import { useEffect, useRef, useState } from "react";
import { CONVERSATION_STORAGE_KEY, HISTORY_STORAGE_KEY, LEGACY_HISTORY_STORAGE_KEY, emptyConversationLibrary,
  parseSavedConversation, parseConversationLibrary, serializeConversationLibrary, migrateConversation,
  type ConversationLibrary, type ConversationEntry, type SavedConversation } from "@/lib/local-conversation";
import type { PatientProfile } from "@/lib/patient/profile";
import type { SavedPlan } from "@/lib/action-plan/storage";

export function useConversationHistory(snapshot: SavedConversation, profile: PatientProfile, rememberProfile: boolean, restore: (entry: ConversationEntry) => void) {
  const [library, setLibrary] = useState<ConversationLibrary>(emptyConversationLibrary);
  const current = useRef(library);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Loading visit history…");
  const loaded = useRef(false);
  const readFailed = useRef(false);
  const diskValue = useRef<string | null>(null);
  const lastWriteSucceeded = useRef(true);
  const profileKey = JSON.stringify(profile);
  function commit(next: ConversationLibrary) {
    current.current = next; setLibrary(next);
    try {
      if (readFailed.current) throw new Error("read-failed");
      if (localStorage.getItem(HISTORY_STORAGE_KEY) !== diskValue.current) {
        setMessage("Visit history changed in another tab. Reload before saving here; this tab’s latest changes remain in memory.");
        lastWriteSucceeded.current = false; return false;
      }
      const raw = serializeConversationLibrary(next);
      localStorage.setItem(HISTORY_STORAGE_KEY, raw); diskValue.current = raw;
      lastWriteSucceeded.current = true;
      setMessage(next.activeId ? "Visit transcript saved in this browser." : "Shared turns save automatically. Earlier visits are in Visit history.");
      // Migrate only after a successful replacement write. Never erase an unreadable source.
      try { localStorage.removeItem(CONVERSATION_STORAGE_KEY); localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY); } catch { /* The replacement is already durable; old copies are harmless. */ }
      return true;
    } catch {
      lastWriteSucceeded.current = false;
      setMessage(readFailed.current ? "Saved history could not be read. Existing copies are protected; delete browser history here to start fresh, or keep working in memory." : "Browser saving is unavailable or full. Latest changes are only in memory; saved copies are unchanged. Delete an older visit to free space.");
      return false;
    }
  }
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY); diskValue.current = raw;
      const oldLibrary = raw === null ? localStorage.getItem(LEGACY_HISTORY_STORAGE_KEY) : null;
      const legacy = raw === null && oldLibrary === null ? localStorage.getItem(CONVERSATION_STORAGE_KEY) : null;
      const next = raw !== null ? parseConversationLibrary(raw) : oldLibrary !== null ? parseConversationLibrary(oldLibrary) : legacy !== null
        ? migrateConversation(parseSavedConversation(legacy), crypto.randomUUID(), new Date().toISOString()) : emptyConversationLibrary();
      current.current = next; setLibrary(next);
      const active = next.conversations.find((entry) => entry.id === next.activeId);
      if (active) restore(active);
      if (oldLibrary !== null || legacy !== null) commit(next);
      else setMessage(active ? "Visit transcript loaded from this browser." : "Shared turns save automatically. Earlier visits are in Visit history.");
    } catch {
      readFailed.current = true;
      setMessage("Saved history could not be loaded. It has not been overwritten. Delete all saved visits to clear unreadable data.");
    } finally { setReady(true); }
  // Hydrate once before edits; restored snapshots take precedence over the separate remembered profile.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready) return;
    const previous = current.current;
    if (!snapshot.turns.length) {
      if (previous.activeId !== null) commit({ ...previous, activeId: null });
      return;
    }
    const entry = previous.conversations.find((item) => item.id === previous.activeId);
    const sameConversation = entry && JSON.stringify(entry.conversation) === JSON.stringify(snapshot);
    const changedPatient = entry && ((entry.patientId !== null && entry.patientId !== profile.recordId) || (entry.patient && JSON.stringify(entry.patient) !== profileKey));
    if (sameConversation && !changedPatient) return;
    // A saved plan belongs to an exact transcript and profile. Continue as a new visit revision.
    const fork = Boolean(entry && (changedPatient || (entry.plan && !sameConversation)));
    const now = new Date().toISOString();
    const id = !fork && entry ? entry.id : crypto.randomUUID();
    const nextEntry: ConversationEntry = {
      id, title: entry ? (fork ? `${entry.title.slice(0, 66)} · continued` : entry.title) : `Visit ${new Date().toLocaleDateString()} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      createdAt: !fork && entry ? entry.createdAt : now, updatedAt: now, conversation: snapshot,
      patientId: profile.recordId,
      patient: !changedPatient && entry?.patient ? entry.patient : rememberProfile ? { ...profile } : null,
      plan: !fork && entry ? entry.plan : null,
    };
    commit({ version: 3, activeId: id, conversations: [nextEntry, ...previous.conversations.filter((item) => item.id !== id)] });
  // Drafts never trigger persistence. Patient changes create a separate revision rather than relabelling a saved visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, snapshot.turns, snapshot.locale, snapshot.engine, profileKey]);

  function detach() { if (current.current.activeId !== null) commit({ ...current.current, activeId: null }); }
  function open(id: string) {
    const entry = current.current.conversations.find((item) => item.id === id);
    if (!entry) return false;
    commit({ ...current.current, activeId: id }); restore(entry); return true;
  }
  function update(id: string, change: (entry: ConversationEntry) => ConversationEntry) {
    if (!current.current.conversations.some((entry) => entry.id === id)) return false;
    return commit({ ...current.current, conversations: current.current.conversations.map((entry) => entry.id === id ? change(entry) : entry) });
  }
  function savePatientSnapshot() {
    const id = current.current.activeId; if (!id) return false;
    return update(id, (entry) => ({ ...entry, patientId: profile.recordId, patient: { ...profile }, updatedAt: new Date().toISOString() }));
  }
  function savePlan(id: string, value: SavedPlan) {
    if (current.current.activeId !== id) return false;
    const entry = current.current.conversations.find((item) => item.id === id);
    if (!entry || (entry.patientId !== null && entry.patientId !== profile.recordId) || JSON.stringify(entry.conversation) !== JSON.stringify(snapshot)) return false;
    // Saving a plan explicitly includes the context required to restore it.
    const updated = { ...entry, patientId: profile.recordId, patient: { ...profile }, plan: value, updatedAt: new Date().toISOString() };
    const older = entry.plan && entry.plan.result.requestId !== value.result.requestId
      ? [{ ...entry, id: crypto.randomUUID(), title: `${entry.title.slice(0, 64)} · prior plan` }] : [];
    return commit({ ...current.current, conversations: [updated, ...older, ...current.current.conversations.filter((item) => item.id !== id)] });
  }
  function removePlan(id: string) { return update(id, (entry) => ({ ...entry, plan: null })); }
  function rename(id: string, title: string) {
    const trimmed = title.trim(); if (!trimmed || trimmed.length > 80) return;
    update(id, (entry) => ({ ...entry, title: trimmed }));
  }
  function remove(id: string) {
    const active = current.current.activeId === id;
    commit({ ...current.current, activeId: active ? null : current.current.activeId, conversations: current.current.conversations.filter((entry) => entry.id !== id) });
    return active;
  }
  function clear() {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY); localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY); localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      diskValue.current = null; readFailed.current = false; current.current = emptyConversationLibrary(); setLibrary(current.current);
      setMessage("All saved visits, patient snapshots and linked plans deleted.");
    } catch { setMessage("Could not delete browser data. Clear this site’s storage in browser settings."); }
  }
  const active = library.conversations.find((entry) => entry.id === library.activeId) ?? null;
  return { ready, message, library, active, detach, open, rename, remove, clear, savePatientSnapshot, savePlan, removePlan, savedToBrowser: lastWriteSucceeded.current && !readFailed.current };
}
