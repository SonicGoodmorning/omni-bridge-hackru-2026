"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { containModalFocus } from "./conversation-panels";
import { LANGUAGES } from "@/lib/types";
import { Icon } from "./icons";

export function SavedConversations({ onDismiss }: { onDismiss?: () => void }) {
  const session = useSession();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState("all");
  const { library, active } = session.history;
  useEffect(() => {
    const node = dialog.current; if (!node) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.showModal();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const people = new Map(library.conversations.filter((entry) => entry.patient).map((entry) => [entry.patientId!, entry.patient!]));
  const search = query.trim().toLocaleLowerCase();
  const entries = [...library.conversations].filter((entry) =>
    (patientFilter === "all" || (patientFilter === "unrecorded" ? !entry.patient : entry.patientId === patientFilter)) &&
    (!search || [entry.title, entry.patient?.preferredName, entry.patient?.age, entry.conversation.locale, ...entry.conversation.turns.map((turn) => `${turn.sourceText} ${turn.translation}`)].join(" ").toLocaleLowerCase().includes(search))
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  function openVisit(id: string, path: string) { if (session.history.open(id)) { onDismiss?.(); router.push(path); } }
  const content = <>
    <header className={onDismiss ? "" : "care-heading"}><div><p className="eyebrow">YOUR VISITS · ON THIS BROWSER</p>{onDismiss ? <h2 id="saved-conversations-title">Visit history</h2> : <h1 id="saved-conversations-title">Visit history</h1>}</div>{onDismiss ? <button className="text-button" onClick={onDismiss} aria-label="Close saved conversations">Close <Icon name="close" size={16} /></button> : <Link className="text-button" href="/">Back to conversation <Icon name="arrow" size={16} /></Link>}</header>
    <p className="saved-description">Reopen a conversation with its saved patient snapshot and checklist. Shared turns save automatically; patient snapshots and plans are optional. Continuing a visit with a saved plan keeps the earlier version here.</p>
    {active && <aside className="visit-current-summary"><div><p className="eyebrow">CURRENT VISIT</p><strong>{active.title}</strong><p>{active.patient ? `${active.patient.preferredName || "Unnamed patient"} · patient snapshot saved` : "Patient details have not been saved with this visit."}</p><small>Saving a snapshot includes all entered profile details and AI preferences in unencrypted browser storage. Removing the separate profile does not remove visit snapshots.</small></div>{!active.patient && <button className="text-button" onClick={session.history.savePatientSnapshot}>Save patient snapshot with this visit</button>}</aside>}
    <div className="visit-history-filters"><div className="visit-search-field"><label htmlFor={searchId}>Search visits</label><span className="visit-history-search"><input id={searchId} ref={searchInput} type="search" placeholder="Patient, visit title, or conversation…" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200}/>{query && <button className="visit-search-clear" type="button" aria-label="Clear visit search" onClick={() => { setQuery(""); searchInput.current?.focus(); }}><Icon name="close" size={18} /></button>}</span></div><label>Patient<select value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)}><option value="all">All patients</option>{Array.from(people).map(([id, person]) => <option key={id} value={id}>{person.preferredName || "Unnamed patient"}{person.age !== null ? `, ${person.age}` : ""}</option>)}<option value="unrecorded">Patient details not saved</option></select></label><span role="status">{entries.length} of {library.conversations.length} visits</span></div>

    <div className="saved-list">
      {!entries.length ? <div className="saved-empty"><Icon name="clock" size={28} /><h3>{library.conversations.length ? "No matching visits." : "Your visit history starts here."}</h3><p>{library.conversations.length ? "Try a different search or patient filter." : "Share a translated turn in Conversation to start a visit."}</p></div> : entries.map((entry) => {
        const active = entry.id === library.activeId;
        const language = LANGUAGES.find((item) => item.locale === entry.conversation.locale)!;
        const engines = new Set(entry.conversation.turns.map((turn) => turn.engine));
        return <article className="saved-entry" key={entry.id} aria-label={entry.title}>
          <div className="saved-entry-heading"><h3>{entry.title}</h3>{active && <span className="saved-current">Current</span>}</div>
          <p className="visit-patient-name">{entry.patient ? `${entry.patient.preferredName || "Unnamed patient"}${entry.patient.age !== null ? `, ${entry.patient.age}` : ""}` : "Patient details not saved"}{entry.plan && <span className="saved-current">Plan saved · review to use</span>}</p>
          <p className="saved-meta">{language.nativeName} · {entry.conversation.turns.length} {entry.conversation.turns.length === 1 ? "turn" : "turns"} · {engines.size > 1 ? "Live & sample" : engines.has("live") ? "Live Gemini" : "Sample"}</p>
          <p className="saved-preview">{entry.conversation.turns[0].sourceText.slice(0, 120)}{entry.conversation.turns[0].sourceText.length > 120 ? "…" : ""}</p>
          <time className="saved-date" dateTime={entry.updatedAt}>Updated {new Date(entry.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
          {entry.patient && <details className="visit-snapshot"><summary>Patient snapshot at this visit</summary><dl>{[
            ["Name", entry.patient.preferredName || "Not entered"], ["Age", entry.patient.age === null ? "Not entered" : String(entry.patient.age)],
            ["Sex", entry.patient.sex], ["Height", entry.patient.heightCm === null ? "Not entered" : `${entry.patient.heightCm} cm`],
            ["Weight", entry.patient.weightKg === null ? "Not entered" : `${entry.patient.weightKg} kg`],
            ["Location", entry.patient.location], ["Familiar foods", entry.patient.familiarFoods], ["Diet / fasting practices", entry.patient.dietaryPreferences],
            ["Foods to avoid", entry.patient.foodsToAvoid], ["Conditions", entry.patient.conditions], ["Medicines", entry.patient.medications], ["Allergies", entry.patient.allergies],
            ["AI context", entry.patient.useInAI ? "Enabled for this snapshot" : "Off"], ["Chosen examples", entry.patient.culturalExamples ? "Enabled" : "Off"],
          ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Opening this visit uses this snapshot. Your separately remembered profile stays unchanged.</p></details>}
          {entry.plan && <p className="saved-meta">{entry.plan.result.actions.length} plan steps · {Object.values(entry.plan.completed).filter(Boolean).length} recorded checkmarks across dates · generated {new Date(entry.plan.result.createdAt).toLocaleString()}</p>}
          {editing === entry.id ? <form className="saved-rename" onSubmit={(event) => { event.preventDefault(); session.history.rename(entry.id, title); setEditing(null); }}>
            <label>Conversation title<input autoFocus maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <button className="text-button" type="submit" disabled={!title.trim()}>Save name</button><button type="button" className="text-button" onClick={() => setEditing(null)}>Cancel</button>
          </form> : deleting === entry.id ? <div className="saved-confirm"><p>Delete this visit, its patient snapshot, plan and checkmarks from this browser?</p><button className="text-button saved-danger" onClick={() => { session.deleteConversation(entry.id); setDeleting(null); }}>Delete permanently</button><button className="text-button" onClick={() => setDeleting(null)}>Cancel</button></div> : <div className="saved-entry-actions">
            <button className="text-button" onClick={() => openVisit(entry.id, "/")}>Open conversation</button>
            {entry.plan && <button className="text-button" onClick={() => openVisit(entry.id, "/action-plan")}>Open action plan</button>}
            <button className="text-button" onClick={() => { setEditing(entry.id); setTitle(entry.title); setDeleting(null); }}>Rename</button>
            <button className="text-button saved-danger" onClick={() => { setDeleting(entry.id); setEditing(null); }}>Delete</button>
          </div>}
        </article>;
      })}
    </div>
    <footer><p role="status">{session.storageMessage}</p><p className="saved-local-note">Local to this browser and URL. Fictional text only.</p>
      {deleting === "all" ? <div className="saved-confirm"><p>Delete all saved visits, patient snapshots, linked plans and checkmarks?</p><button className="text-button saved-danger" onClick={() => { session.deleteAllConversations(); setDeleting(null); }}>Delete all permanently</button><button className="text-button" onClick={() => setDeleting(null)}>Cancel</button></div> : <div className="saved-footer-actions"><button className="text-button" onClick={() => { session.reset(); onDismiss?.(); router.push("/"); }}>New session</button><button className="text-button saved-danger" onClick={() => { setDeleting("all"); setEditing(null); }}>Delete all saved visits</button></div>}
    </footer>
  </>;
  return onDismiss ? <dialog ref={dialog} className="saved-conversations" aria-labelledby="saved-conversations-title" onKeyDown={containModalFocus}
    onCancel={(event) => { event.preventDefault(); onDismiss(); }}>{content}</dialog> : <main className="care-workspace visit-history-page">{content}</main>;
}
