"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useBridge } from "@/hooks/use-bridge";
import { useSpeech } from "@/hooks/use-speech";
import { LANGUAGES, type Locale, type Engine } from "@/lib/types";
import { SECTIONS, STUDY, SAMPLE_CONVERSATION } from "@/lib/study";
import { Icon, RandomizationDiagram, VisitTimeline } from "./icons";

const waiting: Record<Locale, { title: string; body: string; label: string }> = {
  "tr-TR": { title: "Açıklamanız burada görünecek.", body: "Araştırma ekibi metni gözden geçirdikten sonra sizinle paylaşacak.", label: "Sizin için açıklama" },
  "es-419": { title: "Tu explicación aparecerá aquí.", body: "El equipo del estudio revisará el texto antes de compartirlo contigo.", label: "Una explicación para ti" },
  "pt-BR": { title: "Sua explicação aparecerá aqui.", body: "A equipe do estudo revisará o texto antes de compartilhá-lo com você.", label: "Uma explicação para você" },
  "hi-IN": { title: "आपके लिए जानकारी यहाँ दिखाई देगी।", body: "अध्ययन की टीम इसे आपके साथ साझा करने से पहले जाँचेगी।", label: "आपके लिए जानकारी" },
  "zh-CN": { title: "说明将显示在这里。", body: "研究团队会先检查文字，然后再与您分享。", label: "为您准备的说明" },
};

const participantLabels: Record<Locale, { conversation: string; fallback: string; shared: string; copy: string; copied: string; copyFailure: string; sample: string; disclaimer: string; titles: Record<string, string> }> = {
  "tr-TR": { conversation: "Görüşme açıklaması", fallback: "Araştırma açıklaması", shared: "Koordinatör paylaştı", copy: "Metni kopyala", copied: "Kopyalandı", copyFailure: "Kopyalama kullanılamıyor. Metni seçerek kopyalayabilirsiniz.", sample: "Örnek modu · Önceden hazırlanmış gösterim metni", disclaimer: "Bu açıklama araştırma ekibiyle görüşmenizi destekler. Onam formu veya kişisel tıbbi tavsiye değildir.", titles: { purpose: "Araştırmanın amacı", randomization: "Araştırma grubunuz nasıl seçilir?", procedures: "Ziyaretler ve araştırma işlemleri", risks: "Olası riskler ve belirsizlikler", voluntary: "Katılmak sizin seçiminiz", withdrawal: "Araştırmadan ayrılmak" } },
  "es-419": { conversation: "Explicación de la conversación", fallback: "Explicación del estudio", shared: "Compartido por el coordinador", copy: "Copiar texto", copied: "Copiado", copyFailure: "No se puede copiar. Puedes seleccionar el texto para copiarlo.", sample: "Modo de muestra · Texto de demostración preparado", disclaimer: "Esta explicación apoya tu conversación con el equipo del estudio. No es un formulario de consentimiento ni consejo médico personal.", titles: { purpose: "Propósito del estudio", randomization: "¿Cómo se elige tu grupo?", procedures: "Visitas y procedimientos", risks: "Posibles riesgos e incertidumbres", voluntary: "Participar es tu decisión", withdrawal: "Salir del estudio" } },
  "pt-BR": { conversation: "Explicação da conversa", fallback: "Explicação do estudo", shared: "Compartilhado pelo coordenador", copy: "Copiar texto", copied: "Copiado", copyFailure: "Não foi possível copiar. Selecione o texto para copiá-lo.", sample: "Modo de exemplo · Texto de demonstração preparado", disclaimer: "Esta explicação apoia sua conversa com a equipe do estudo. Não é um formulário de consentimento nem orientação médica pessoal.", titles: { purpose: "Objetivo do estudo", randomization: "Como seu grupo é escolhido?", procedures: "Visitas e procedimentos", risks: "Possíveis riscos e incertezas", voluntary: "Participar é sua escolha", withdrawal: "Sair do estudo" } },
  "hi-IN": { conversation: "बातचीत की जानकारी", fallback: "अध्ययन की जानकारी", shared: "समन्वयक ने साझा किया", copy: "टेक्स्ट कॉपी करें", copied: "कॉपी हो गया", copyFailure: "कॉपी नहीं हो सका। टेक्स्ट चुनकर कॉपी करें।", sample: "नमूना मोड · प्रदर्शन के लिए तैयार टेक्स्ट", disclaimer: "यह जानकारी अध्ययन की टीम से आपकी बातचीत में मदद करती है। यह सहमति का फ़ॉर्म या व्यक्तिगत चिकित्सा सलाह नहीं है।", titles: { purpose: "अध्ययन का उद्देश्य", randomization: "आपका समूह कैसे चुना जाता है?", procedures: "मुलाक़ातें और अध्ययन की प्रक्रियाएँ", risks: "संभावित जोखिम और अनिश्चितताएँ", voluntary: "भाग लेना आपकी पसंद है", withdrawal: "अध्ययन छोड़ना" } },
  "zh-CN": { conversation: "对话说明", fallback: "研究说明", shared: "由协调员分享", copy: "复制文字", copied: "已复制", copyFailure: "无法复制。您可以选中文字进行复制。", sample: "示例模式 · 预先准备的演示文字", disclaimer: "本说明帮助您与研究团队交流。它不是知情同意书，也不是针对您个人的医疗建议。", titles: { purpose: "研究目的", randomization: "如何决定您的研究组别？", procedures: "访视和研究程序", risks: "可能的风险和不确定性", voluntary: "是否参与由您决定", withdrawal: "退出研究" } },
};

function HighlightedSource({ text }: { text: string }) {
  const importantFacts = /\b\d+(?:\.\d+)?(?:%|\s+(?:mL|minutes?|weeks?|(?:study )?visits?)\b)|Neither you nor the researcher chooses your group|no active study drug|not guaranteed(?: to help you)?|not been shown to work|does not guarantee a health benefit|Some risks are not yet known|cannot promise that you will have no side effects|\bvoluntary\b|choose not to join|stop participating at any time|without penalty(?: or loss of benefits to which you are entitled)?|will not affect your regular care(?: or benefits to which you are entitled)?/gi;
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(importantFacts)) {
    const start = match.index;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark className="source-highlight" key={start}>{match[0]}</mark>);
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function Workspace({ liveAvailable }: { liveAvailable: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const controller = useBridge(liveAvailable);
  const bridge = { ...controller, ...controller.state };
  const [helpOpen, setHelpOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const section = SECTIONS.find((item) => item.id === bridge.sectionId) || SECTIONS[1];
  const language = LANGUAGES.find((item) => item.locale === bridge.locale) || LANGUAGES[0];
  const onTranscript = useCallback((transcript: string) => {
    if (bridge.mode === "conversation") bridge.setText(`${bridge.text.trim()} ${transcript.trim()}`.trim());
  }, [bridge.mode, bridge.text, bridge.setText]);
  const speech = useSpeech({ onTranscript });
  const busy = bridge.status === "loading";
  const result = bridge.result;
  const released = bridge.released;
  const displayLanguage = released?.locale || bridge.locale;
  const canGenerate = !busy && !speech.isListening && (bridge.mode === "consent" || bridge.text.trim().length > 0);

  async function copyExplanation() {
    if (!released) return;
    try {
      await navigator.clipboard.writeText(released.translation);
      setCopyMessage(participantLabels[released.locale].copied);
    } catch {
      setCopyMessage(participantLabels[released.locale].copyFailure);
    }
  }

  function reset() {
    speech.cancel();
    setCopyMessage("");
    bridge.reset();
  }

  return <div className="workspace-shell" inert={!ready}>
    <aside className="app-rail" aria-label="Omni-Bridge navigation">
      <a className="brand-mark" href="#main-workspace" aria-label="Omni-Bridge workspace"><Icon name="bridge" size={29} /></a>
      <div className="rail-tools"><a href="#main-workspace" className="rail-button active" aria-label="Clinical research workspace" title="Clinical research workspace"><Icon name="document" size={22} /></a><a href="/visits" className="rail-button" aria-label="Visits workspace" title="Visits"><Icon name="chat" size={22} /></a></div>
      <button className={`rail-button help-button ${helpOpen ? "active" : ""}`} aria-label="About this prototype" aria-expanded={helpOpen} aria-controls="prototype-help" onClick={() => setHelpOpen(!helpOpen)}><Icon name="help" size={22} /></button>
    </aside>

    <div className="app-main">
      <header className="session-header">
        <div className="brand-wordmark">omni<span>bridge</span><div className="brand-caption">CLINICAL RESEARCH COMPANION</div></div>
        <div className="session-actions"><a href="/visits" className="text-button"><Icon name="chat" size={16} />Visits</a><span className="prototype-label"><span />HackRU prototype</span><button className="text-button reset-button" onClick={reset}><Icon name="reset" size={16} /><span>New session</span></button></div>
      </header>

      {helpOpen && <section className="help-panel" id="prototype-help" aria-label="About this prototype"><div><strong>A tool for the conversation.</strong><p>This prototype explains fictional study material. AI explanations can contain errors. It does not provide medical advice, replace an interpreter, or collect informed consent. Sample mode uses prepared examples; Gemini mode makes a live request.</p></div><button className="icon-button" aria-label="Close prototype information" onClick={() => setHelpOpen(false)}><Icon name="close" /></button></section>}

      <main id="main-workspace" className="workspace-columns">
        <section className="coordinator-column" aria-labelledby="coordinator-heading">
          <div className="column-label"><span className="role-label"><Icon name="eye" size={15} />COORDINATOR WORKSPACE</span><span className="session-code">{STUDY.code}</span></div>
          <div className="workspace-title-row"><div><h1 id="coordinator-heading">The CLEAR Study</h1><p>Help a participant understand, one section at a time.</p></div><span className="fictional-tag">Fictional study</span></div>

          <div className="workspace-toolbar"><div className="mode-tabs" role="tablist" aria-label="Explanation source" onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "Home" || event.key === "End") { event.preventDefault(); const mode = event.key === "Home" ? "consent" : event.key === "End" ? "conversation" : bridge.mode === "consent" ? "conversation" : "consent"; speech.cancel(); bridge.setMode(mode); document.getElementById(`${mode}-tab`)?.focus(); } }}>
            <button role="tab" id="consent-tab" tabIndex={bridge.mode === "consent" ? 0 : -1} aria-selected={bridge.mode === "consent"} aria-controls="source-panel" className={bridge.mode === "consent" ? "selected" : ""} onClick={() => { speech.cancel(); bridge.setMode("consent"); }}><Icon name="document" size={17} />Consent guide</button>
            <button role="tab" id="conversation-tab" tabIndex={bridge.mode === "conversation" ? 0 : -1} aria-selected={bridge.mode === "conversation"} aria-controls="source-panel" className={bridge.mode === "conversation" ? "selected" : ""} onClick={() => bridge.setMode("conversation")}><Icon name="chat" size={17} />Conversation</button>
          </div><label className="engine-control"><span className={`engine-dot ${bridge.engine === "live" ? "live" : ""}`} /><span className="sr-only">Explanation engine</span><select value={bridge.engine} onChange={(event) => { speech.cancel(); bridge.setEngine(event.target.value as Engine); }}><option value="sample">Sample mode</option><option value="live" disabled={!liveAvailable}>Gemini live{!liveAvailable ? " · not configured" : ""}</option></select></label></div>

          <section className="source-panel" id="source-panel" role="tabpanel" aria-labelledby={bridge.mode === "consent" ? "consent-tab" : "conversation-tab"}>
            {bridge.mode === "consent" ? <div className="consent-layout">
              <nav className="section-navigation" aria-label="Study document sections">{SECTIONS.map((item) => <button key={item.id} aria-current={section.id === item.id ? "step" : undefined} className={section.id === item.id ? "selected" : ""} onClick={() => bridge.setSection(item.id)}><span>{item.number}</span><span>{item.shortTitle}</span>{section.id === item.id && <Icon name="chevron" size={13} />}</button>)}</nav>
              <article className="source-document" key={section.id}><div className="eyebrow">ORIGINAL DOCUMENT <span>SECTION {section.number} / 06</span></div><h2>{section.title}</h2><p><HighlightedSource text={section.body} /></p><div className="document-footnote"><Icon name="document" size={13} />Source text stays unchanged. Key facts highlighted for review.</div></article>
            </div> : <div className="conversation-source"><div className="conversation-label"><label htmlFor="conversation-text" className="eyebrow">ENGLISH SOURCE</label><div className="transcript-actions"><button className="text-button" disabled={speech.isListening || busy || !bridge.text} onClick={() => bridge.setText("")}>Clear transcript</button><button className="text-button" disabled={speech.isListening || busy} onClick={() => bridge.setText(SAMPLE_CONVERSATION)}>Use sample script<Icon name="arrow" size={13} /></button></div></div><textarea id="conversation-text" value={bridge.text} onChange={(event) => bridge.setText(event.target.value)} readOnly={speech.isListening} placeholder="Type what you would like to explain, or use the microphone…" maxLength={4000} aria-describedby="speech-hint transcript-count" /><div className="transcript-count" id="transcript-count">{bridge.text.length.toLocaleString()} / 4,000 characters</div><div className="speech-row"><button className={`microphone-button ${speech.isListening ? "listening" : ""}`} onClick={speech.isListening ? speech.stop : () => { bridge.setText(""); speech.start(); }} disabled={speech.supported === false || busy} aria-pressed={speech.isListening}><Icon name={speech.isListening ? "stop" : "mic"} size={17} />{speech.isListening ? "Stop listening" : "Use microphone"}</button><span id="speech-hint">{speech.isListening ? "Listening in English…" : speech.supported === false ? "Speech is unavailable in this browser. You can type instead." : "Microphone starts a new transcript. Review before generating."}</span></div>{speech.interim && <p className="interim-transcript" aria-live="polite">{speech.interim}</p>}{speech.error && <p className="inline-error" role="alert">{speech.error}</p>}</div>}
          </section>

          <div className="generate-row"><p><Icon name="globe" size={15} />English <span>→</span> {language.nativeName}</p><button className="primary-button generate-button" disabled={!canGenerate} onClick={() => { speech.stop(); void bridge.generate(); }}>{busy ? <><span className="spinner" />Creating explanation…</> : <><Icon name="spark" size={17} />{result ? "Regenerate explanation" : "Create explanation"}<Icon name="arrow" size={16} /></>}</button></div>

          <section className="review-panel" aria-labelledby="review-heading" aria-busy={busy}>
            <div className="review-heading-row"><h2 id="review-heading"><span className="step-number">2</span>Review & share</h2><span className="review-status">{busy ? "Creating draft" : result ? "Coordinator review" : "Not shared yet"}</span></div>
            {busy ? <div className="loading-state" role="status"><div className="loading-lines"><span /><span /><span /></div><div className="loading-caption"><span>Preparing a {language.name.toLowerCase()} explanation.</span><button className="text-button" onClick={() => bridge.cancel()}>Cancel</button></div></div> : bridge.error ? <div className="error-state" role="alert"><Icon name="warning" size={20} /><div><strong>We couldn’t create this explanation.</strong><p>{bridge.error}</p><button className="text-button" onClick={() => void bridge.generate()}>Try again<Icon name="arrow" size={14} /></button></div></div> : result ? <div className="review-content" key={result.requestId}>
              <div className="draft-label-row"><span className="eyebrow">{language.name.toUpperCase()} EXPLANATION</span><span className={`result-engine ${result.engine === "sample" ? "sample" : ""}`}>{result.engine === "sample" ? "Prepared sample" : `Gemini · ${(result.elapsedMs / 1000).toFixed(1)}s`}</span></div><p className="translated-draft" lang={result.locale}>{result.translation}</p>
              <details className="back-translation" open><summary><span><Icon name="eye" size={15} />English rendering for review</span><Icon name="chevron" size={13} /></summary><p>{result.backTranslation}</p><small>{result.engine === "sample" ? "Prepared sample review aid." : "AI-generated review aid."} This does not verify translation accuracy.</small></details>
              <details className="source-citations"><summary><span><Icon name="document" size={14} />{result.sourceSectionIds.length ? `View ${result.sourceSectionIds.length === 1 ? "source section" : "source sections"}` : "View original English source"}</span><Icon name="chevron" size={12} /></summary>{result.sourceSectionIds.length ? result.sourceSectionIds.map((id) => { const source = SECTIONS.find((item) => item.id === id); return source ? <article key={id}><h3>Section {source.number} · {source.title}</h3><p><HighlightedSource text={source.body} /></p></article> : null; }) : <p><HighlightedSource text={result.sourceText} /></p>}</details>
              {result.flags.length > 0 && <div className="review-flags" aria-label={result.mode === "conversation" ? "Source review checklist" : "Review notes"}>{result.mode === "conversation" && <h3 className="eyebrow">SOURCE REVIEW CHECKLIST</h3>}{result.flags.map((flag, index) => <div key={`${flag.code}-${index}`} className={`review-flag ${flag.severity}`}><Icon name={flag.severity === "info" ? "eye" : "warning"} size={15} /><div><p>{flag.message}</p>{flag.sourceSnippet && <blockquote>{flag.sourceSnippet}</blockquote>}</div></div>)}</div>}
              <label className="review-confirmation"><input type="checkbox" checked={bridge.reviewConfirmed} disabled={!result.canRelease} onChange={(event) => bridge.setReviewConfirmed(event.target.checked)} /><span>I have reviewed the source and explanation before sharing.</span></label>
              <div className="release-row"><p>{result.canRelease ? "The participant sees only what you share." : "Resolve the blocking note before sharing."}</p><button className="primary-button" disabled={!result.canRelease || !bridge.reviewConfirmed} onClick={() => { setCopyMessage(""); bridge.release(); }}>{released?.requestId === result.requestId ? <><Icon name="check" size={17} />Shared with participant</> : <>Share with participant<Icon name="arrow" size={16} /></>}</button></div>
            </div> : <div className="review-empty"><Icon name="eye" size={24} /><div><h3>A moment to review.</h3><p>Create an explanation, review the wording, then share it with the participant.</p></div></div>}
          </section>
          <footer className="coordinator-footer"><Icon name="document" size={13} /><span>{STUDY.code} · {STUDY.version}</span><span>Education prototype · No real patient data</span></footer>
        </section>

        <section className="participant-panel" aria-label="Participant view">
          <div className="column-label"><span className="role-label" id="participant-heading"><Icon name="globe" size={15} />PARTICIPANT VIEW</span><span className={`participant-status ${released ? "shared" : ""}`}><span />{released ? "Shared" : "Awaiting review"}</span></div>
          <label className="language-selector"><span>Preferred language</span><div><Icon name="globe" size={20} /><select value={bridge.locale} onChange={(event) => { speech.cancel(); bridge.setLocale(event.target.value as Locale); }} aria-label="Participant preferred language">{LANGUAGES.map((item) => <option value={item.locale} key={item.locale}>{item.nativeName}</option>)}</select></div></label>
          {bridge.engine === "sample" && <div className="sample-notice" lang={bridge.locale}><Icon name="eye" size={14} /><span>{participantLabels[bridge.locale].sample}</span></div>}
          <div className={`participant-content ${released ? "has-explanation" : ""}`} aria-live="polite" aria-atomic="true">
            {released ? <article className="participant-explanation" lang={displayLanguage} key={released.requestId}><div className="participant-section-label">{waiting[displayLanguage].label}</div><h2>{released.mode === "consent" ? (participantLabels[displayLanguage].titles[released.sourceSectionIds[0]] || participantLabels[displayLanguage].fallback) : participantLabels[displayLanguage].conversation}</h2><p className="participant-translation">{released.translation}</p>{released.mode === "consent" && released.visual === "RANDOMIZATION" && released.sourceSectionIds.includes("randomization") && <RandomizationDiagram locale={displayLanguage} />}{released.mode === "consent" && released.visual === "CALENDAR" && released.sourceSectionIds.includes("procedures") && <VisitTimeline locale={displayLanguage} />}<div className="participant-actions"><span><Icon name="check" size={14} />{participantLabels[displayLanguage].shared}</span><button className="text-button" onClick={() => void copyExplanation()}><Icon name="copy" size={14} />{participantLabels[displayLanguage].copy}</button></div>{copyMessage && <p className="copy-status" role="status">{copyMessage}</p>}</article> : <div className="participant-empty" lang={bridge.locale}><div className="empty-illustration"><svg viewBox="0 0 176 130" fill="none" aria-hidden="true"><rect x="35" y="12" width="79" height="104" rx="3" stroke="currentColor" strokeWidth="1.2" /><path d="M49 32h39m-39 10h50M49 52h37m-37 10h43" stroke="currentColor" strokeWidth="1.2" /><rect x="71" y="68" width="70" height="47" rx="9" fill="#eef3eb" stroke="currentColor" strokeWidth="1.2" /><path d="m82 115-4 10 18-10M87 83h38m-38 9h29" stroke="currentColor" strokeWidth="1.2" /><path d="M125 20v14m-7-7h14" stroke="currentColor" strokeWidth="1.2" /></svg></div><h2>{waiting[bridge.locale].title}</h2><p>{waiting[bridge.locale].body}</p><div className="waiting-rule" /></div>}
          </div>
          <div className="participant-bottom" lang={displayLanguage}><Icon name="help" size={15} /><p>{participantLabels[displayLanguage].disclaimer}</p></div>
        </section>
      </main>
    </div>
  </div>;
}
