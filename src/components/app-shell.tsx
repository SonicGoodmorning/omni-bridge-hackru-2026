"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState, type ReactNode } from "react";
import { SavedConversations } from "./saved-conversations";
import { Icon } from "./icons";
import { useSession, type TextSize } from "./session-provider";
import { LANGUAGES, hasPreparedSamples, type Engine, type Locale } from "@/lib/types";

const pages = [
  ["/", "Conversation"], ["/explain", "Explain jargon"], ["/profile", "Patient profile"],
  ["/numbers", "My numbers"], ["/action-plan", "Action plan"], ["/documents", "Documents"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const jargon = pathname === "/explain";
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
        <Link href="/" className="brand-wordmark" aria-label="SayAhh home">Say<span>Ahh</span></Link>
        <nav className="shared-navigation" aria-label="Workspace">
          {pages.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="shared-controls">
          <button className="theme-switch" type="button" onClick={toggle} aria-label="Dark mode" aria-pressed={theme === "dark"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}><Icon name={theme === "dark" ? "sun" : "moon"} size={18} /><span>{theme === "dark" ? "Light" : "Dark"}</span></button>
          <label><span className="sr-only">Participant language</span><Icon name="globe" size={15} /><select aria-label="Participant preferred language" value={session.locale} onChange={(event) => session.setLocale(event.target.value as Locale)}>{LANGUAGES.map((item) => <option value={item.locale} key={item.locale}>{item.nativeName}</option>)}</select></label>
          <label className="shared-engine desktop-engine"><span className={`engine-dot ${jargon || session.engine === "live" ? "live" : ""}`} /><select aria-label="Explanation engine" value={jargon ? "live" : session.engine} disabled={jargon} onChange={(event) => session.setEngine(event.target.value as Engine)}><option value="sample" disabled={!hasPreparedSamples(session.locale)}>Sample mode{!hasPreparedSamples(session.locale) ? " · unavailable in this language" : ""}</option><option value="live" disabled={!session.liveAvailable}>Gemini live{!session.liveAvailable ? " · not configured" : ""}</option></select></label>
          <div className="shared-menu-wrap" onKeyDown={(event) => { if (event.key === "Escape") { setMenu(false); document.getElementById("workspace-menu-button")?.focus(); } }}>
            <button id="workspace-menu-button" className="text-button" aria-expanded={menu} aria-controls="workspace-menu" onClick={() => setMenu(!menu)}>Menu<Icon name="chevron" size={14} /></button>
            {menu && <div className="shared-menu" id="workspace-menu">
              <nav className="mobile-navigation" aria-label="Workspace menu">{pages.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenu(false)}>{label}</Link>)}</nav>
              <label className="mobile-engine">Explanation engine<select aria-label="Menu explanation engine" value={jargon ? "live" : session.engine} disabled={jargon} onChange={(event) => session.setEngine(event.target.value as Engine)}><option value="sample" disabled={!hasPreparedSamples(session.locale)}>Sample mode{!hasPreparedSamples(session.locale) ? " · unavailable" : ""}</option><option value="live" disabled={!session.liveAvailable}>Gemini live{!session.liveAvailable ? " · not configured" : ""}</option></select></label>
              <button onClick={() => { setPreferences(true); setHelp(false); setMenu(false); }}>Reading preferences</button>
              <button onClick={() => { setHelp(true); setPreferences(false); setMenu(false); }}>Help</button>
              <button onClick={() => { session.reset(); setMenu(false); }}>New session</button>
              <button onClick={() => { setSavedOpen(true); setMenu(false); }}>Visit history</button>
              <p className="storage-menu-note">16 patient languages. English simplifies jargon. Some controls remain in English. New session keeps your patient profile and earlier saved conversations. Clear the profile for a different patient.</p>
            </div>}
          </div>
        </div>
      </div>
      {preferences && <section className="shared-disclosure" id="reading-preferences" aria-label="Reading preferences" onKeyDown={(event) => { if (event.key === "Escape") setPreferences(false); }}><div><strong>Make the text comfortable to read.</strong><p>Text size changes the display and keeps your reviewed explanation.</p></div><label>Text size<select autoFocus aria-label="Text size" value={session.textSize} onChange={(event) => session.setTextSize(event.target.value as TextSize)}><option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra large</option></select></label><button className="text-button" onClick={() => setPreferences(false)}>Done</button></section>}
      {help && <section className="shared-disclosure" id="shared-help" aria-label="Prototype information"><div><strong>A tool for a fictional discussion.</strong><p>Use public or fictional demo text only. This prototype does not provide medical advice, obtain consent, or replace a qualified interpreter. It is not monitored for urgent care. Live text goes to Gemini; browser speech may use a remote service. Shared conversation turns save automatically in this browser and survive refresh. Drafts, jargon explanations, document explanations, and questions are not saved. Explain jargon answers general meaning questions using Gemini live; its answers are kept out of the clinician transcript and action plan. Action plans and checkmarks save only when you choose browser saving. Patient details are saved when you choose Remember, save a visit snapshot, or save a plan with its snapshot. Each saved visit has its own plan and progress; opening a visit restores its saved profile context and requires plan review again. Removing a separate profile does not remove saved visit snapshots. Visits without snapshots open with blank details and AI context off. My numbers uses manual readings and labelled fictional histories for sample people; it connects to no health devices. Numbers are kept separately per profile, stay out of Gemini requests, and save only when you choose browser saving. Dark mode follows your system until you use the header toggle; your choice is remembered on this device. New session or changing language, engine, or document source starts fresh while keeping previous shared conversations in Visit history. Open, search, rename, or delete them from Menu. Browser storage is not encrypted; use fictional text only. Private browsing or clearing site data may remove saved turns. Different preview URLs have separate storage.</p></div><button className="text-button" onClick={() => setHelp(false)}>Close</button></section>}
    </header>
    {savedOpen && <SavedConversations onDismiss={() => { setSavedOpen(false); requestAnimationFrame(() => document.getElementById("workspace-menu-button")?.focus()); }} />}
    <div id="workspace-content" tabIndex={-1}>{children}</div>
  </div>;
}
