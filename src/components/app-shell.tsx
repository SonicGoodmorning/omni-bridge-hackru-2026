"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { useSession, type TextSize } from "./session-provider";
import { LANGUAGES, type Engine, type Locale } from "@/lib/types";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => setReady(true), []);
  return <div className={`shared-app text-size-${session.textSize}`} inert={!ready}>
    <a className="skip-link" href="#workspace-content">Skip to workspace</a>
    <header className="shared-header">
      <div className="shared-header-top">
        <Link href="/" className="brand-wordmark" aria-label="Omni-Bridge home">omni<span>bridge</span><div className="brand-caption">UNDERSTAND. ASK. DISCUSS.</div></Link>
        <nav className="shared-navigation" aria-label="Workspace">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}><Icon name="document" size={17} />Document guide</Link>
          <Link href="/visits" aria-current={pathname === "/visits" ? "page" : undefined}><Icon name="chat" size={17} />Conversation</Link>
        </nav>
        <button className="text-button new-session" onClick={session.reset}><Icon name="reset" size={16} />New session</button>
      </div>
      <div className="shared-toolbar">
        <label><Icon name="globe" size={15} /><span>Participant language</span><select aria-label="Participant preferred language" value={session.locale} onChange={(event) => session.setLocale(event.target.value as Locale)}>{LANGUAGES.map((item) => <option value={item.locale} key={item.locale}>{item.nativeName}</option>)}</select></label>
        <label className="shared-engine"><span className={`engine-dot ${session.engine === "live" ? "live" : ""}`} /><span className="sr-only">Engine</span><select aria-label="Explanation engine" value={session.engine} onChange={(event) => session.setEngine(event.target.value as Engine)}><option value="sample">Sample mode</option><option value="live" disabled={!session.liveAvailable}>Gemini live{!session.liveAvailable ? " · not configured" : ""}</option></select></label>
        <span className="shared-demo-label">Fictional education · session only</span>
        <button className="text-button" aria-expanded={preferences} aria-controls="reading-preferences" onClick={() => { setPreferences(!preferences); setHelp(false); }}>Reading preferences</button>
        <button className="text-button" aria-expanded={help} aria-controls="shared-help" onClick={() => { setHelp(!help); setPreferences(false); }}><Icon name="help" size={15} />Help</button>
      </div>
      {preferences && <section className="shared-disclosure" id="reading-preferences" aria-label="Reading preferences" onKeyDown={(event) => { if (event.key === "Escape") setPreferences(false); }}><div><strong>Make the text comfortable to read.</strong><p>Text size changes the display and keeps your reviewed explanation.</p></div><label>Text size<select autoFocus aria-label="Text size" value={session.textSize} onChange={(event) => session.setTextSize(event.target.value as TextSize)}><option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra large</option></select></label><button className="text-button" onClick={() => setPreferences(false)}>Done</button></section>}
      {help && <section className="shared-disclosure" id="shared-help" aria-label="Prototype information"><div><strong>A tool for a fictional discussion.</strong><p>Use public or fictional demo text only. This prototype does not provide medical advice, obtain consent, or replace a qualified interpreter. It is not monitored for urgent care. Live text goes to Gemini; browser speech may use a remote service. Session work stays in memory until reset or refresh.</p></div><button className="text-button" onClick={() => setHelp(false)}>Close</button></section>}
    </header>
    <div id="workspace-content" tabIndex={-1}>{children}</div>
  </div>;
}
