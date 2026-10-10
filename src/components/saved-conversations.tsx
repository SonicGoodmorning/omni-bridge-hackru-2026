"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { containModalFocus } from "./conversation-panels";
import { LANGUAGES } from "@/lib/types";

export function SavedConversations({ onDismiss }: { onDismiss: () => void }) {
  const session = useSession();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const { library } = session.history;
  useEffect(() => {
    const node = dialog.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.showModal();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const entries = [...library.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <dialog ref={dialog} className="saved-conversations" aria-labelledby="saved-conversations-title" onKeyDown={containModalFocus}
    onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <header><div><p className="eyebrow">ON THIS BROWSER</p><h2 id="saved-conversations-title">Saved conversations</h2></div><button className="text-button" onClick={onDismiss} aria-label="Close saved conversations">Close <span aria-hidden="true">×</span></button></header>
    <p className="saved-description">Shared turns save automatically. Open a conversation to continue it. Unshared drafts are not kept when you switch conversations.</p>
    <div className="saved-list">
      {!entries.length ? <div className="saved-empty"><h3>No saved conversations yet.</h3><p>Share a translated turn or try a prepared sample to start one.</p></div> : entries.map((entry) => {
        const active = entry.id === library.activeId;
        const language = LANGUAGES.find((item) => item.locale === entry.conversation.locale)!;
        const engines = new Set(entry.conversation.turns.map((turn) => turn.engine));
        return <article className="saved-entry" key={entry.id} aria-label={entry.title}>
          <div className="saved-entry-heading"><h3>{entry.title}</h3>{active && <span className="saved-current">Current</span>}</div>
          <p className="saved-meta">{language.nativeName} · {entry.conversation.turns.length} {entry.conversation.turns.length === 1 ? "turn" : "turns"} · {engines.size > 1 ? "Live & sample" : engines.has("live") ? "Live Gemini" : "Sample"}</p>
          <p className="saved-preview">{entry.conversation.turns[0].sourceText.slice(0, 120)}{entry.conversation.turns[0].sourceText.length > 120 ? "…" : ""}</p>
          <time className="saved-date" dateTime={entry.updatedAt}>Updated {new Date(entry.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
          {editing === entry.id ? <form className="saved-rename" onSubmit={(event) => { event.preventDefault(); session.history.rename(entry.id, title); setEditing(null); }}>
            <label>Conversation title<input autoFocus maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <button className="text-button" type="submit" disabled={!title.trim()}>Save name</button><button type="button" className="text-button" onClick={() => setEditing(null)}>Cancel</button>
          </form> : deleting === entry.id ? <div className="saved-confirm"><p>Delete this conversation from this browser?</p><button className="text-button saved-danger" onClick={() => { session.deleteConversation(entry.id); setDeleting(null); }}>Delete permanently</button><button className="text-button" onClick={() => setDeleting(null)}>Cancel</button></div> : <div className="saved-entry-actions">
            <button className="text-button" onClick={() => { if (session.history.open(entry.id)) { onDismiss(); router.push("/"); } }}>Open</button>
            <button className="text-button" onClick={() => { setEditing(entry.id); setTitle(entry.title); setDeleting(null); }}>Rename</button>
            <button className="text-button saved-danger" onClick={() => { setDeleting(entry.id); setEditing(null); }}>Delete</button>
          </div>}
        </article>;
      })}
    </div>
    <footer><p role="status">{session.storageMessage}</p><p className="saved-local-note">Local to this browser and URL. Fictional text only.</p>
      {deleting === "all" ? <div className="saved-confirm"><p>Delete all saved conversations?</p><button className="text-button saved-danger" onClick={() => { session.deleteAllConversations(); setDeleting(null); }}>Delete all permanently</button><button className="text-button" onClick={() => setDeleting(null)}>Cancel</button></div> : <div className="saved-footer-actions"><button className="text-button" onClick={() => { session.reset(); onDismiss(); router.push("/"); }}>New session</button><button className="text-button saved-danger" onClick={() => { setDeleting("all"); setEditing(null); }}>Delete all saved conversations</button></div>}
    </footer>
  </dialog>;
}
