"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SavedConversations } from "./saved-conversations";
import { Icon } from "./icons";
import { useSession, type TextSize } from "./session-provider";
import { LANGUAGES, type Engine, type Locale } from "@/lib/types";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    function outside(event: MouseEvent) { if (event.target instanceof Element && !event.target.closest(".shared-menu-wrap")) setMenu(false); }
    document.addEventListener("click", outside); return () => document.removeEventListener("click", outside);
  }, []);
  return <div className={`shared-app text-size-${session.textSize}`} inert={!ready || !session.storageReady}>
    <a className="skip-link" href="#workspace-content">Skip to workspace</a>
    <header className="shared-header">
      <div className="shared-header-top">
        <Link href="/" className="brand-wordmark" aria-label="Omni-Bridge home">omni<span>bridge</span><div className="brand-caption">UNDERSTAND. ASK. DISCUSS.</div></Link>
        <nav className="shared-navigation" aria-label="Workspace">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}><Icon name="chat" size={17} />Conversation</Link>
          <Link href="/documents" aria-current={pathname === "/documents" ? "page" : undefined}><Icon name="document" size={17} />Documents</Link>
        </nav>
        <div className="shared-controls">
          <label><span className="sr-only">Participant language</span><Icon name="globe" size={15} /><select aria-label="Participant preferred language" value={session.locale} onChange={(event) => session.setLocale(event.target.value as Locale)}>{LANGUAGES.map((item) => <option value={item.locale} key={item.locale}>{item.nativeName}</option>)}</select></label>
          <label className="shared-engine"><span className={`engine-dot ${session.engine === "live" ? "live" : ""}`} /><select aria-label="Explanation engine" value={session.engine} onChange={(event) => session.setEngine(event.target.value as Engine)}><option value="sample">Sample mode</option><option value="live" disabled={!session.liveAvailable}>Gemini live{!session.liveAvailable ? " · not configured" : ""}</option></select></label>
          <div className="shared-menu-wrap" onKeyDown={(event) => { if (event.key === "Escape") { setMenu(false); document.getElementById("workspace-menu-button")?.focus(); } }}>
            <button id="workspace-menu-button" className="text-button" aria-expanded={menu} aria-controls="workspace-menu" onClick={() => setMenu(!menu)}>Menu<Icon name="chevron" size={14} /></button>
            {menu && <div className="shared-menu" id="workspace-menu">
              <button onClick={() => { setPreferences(true); setHelp(false); setMenu(false); }}>Reading preferences</button>
              <button onClick={() => { setHelp(true); setPreferences(false); setMenu(false); }}>Help</button>
              <button onClick={() => { session.reset(); setMenu(false); }}>New session</button>
              <button onClick={() => { setSavedOpen(true); setMenu(false); }}>Saved conversations</button>
              <p className="storage-menu-note">New session keeps earlier shared conversations in Saved conversations.</p>
            </div>}
          </div>
        </div>
      </div>
      {preferences && <section className="shared-disclosure" id="reading-preferences" aria-label="Reading preferences" onKeyDown={(event) => { if (event.key === "Escape") setPreferences(false); }}><div><strong>Make the text comfortable to read.</strong><p>Text size changes the display and keeps your reviewed explanation.</p></div><label>Text size<select autoFocus aria-label="Text size" value={session.textSize} onChange={(event) => session.setTextSize(event.target.value as TextSize)}><option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra large</option></select></label><button className="text-button" onClick={() => setPreferences(false)}>Done</button></section>}
      {help && <section className="shared-disclosure" id="shared-help" aria-label="Prototype information"><div><strong>A tool for a fictional discussion.</strong><p>Use public or fictional demo text only. This prototype does not provide medical advice, obtain consent, or replace a qualified interpreter. It is not monitored for urgent care. Live text goes to Gemini; browser speech may use a remote service. Shared conversation turns save automatically in this browser and survive refresh. Drafts, document explanations, and questions are not saved. New session or changing language, engine, or document source starts fresh while keeping previous shared conversations in Saved conversations. Open, rename, or delete them from Menu. Browser storage is not encrypted; use fictional text only. Private browsing or clearing site data may remove saved turns. Different preview URLs have separate storage.</p></div><button className="text-button" onClick={() => setHelp(false)}>Close</button></section>}
    </header>
    {savedOpen && <SavedConversations onDismiss={() => setSavedOpen(false)} />}
    <div id="workspace-content" tabIndex={-1}>{children}</div>
  </div>;
}
