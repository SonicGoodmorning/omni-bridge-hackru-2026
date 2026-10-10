"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { LANGUAGES, type Locale, type ReviewFlag } from "@/lib/types";
import { SECTIONS, STUDY } from "@/lib/study";
import { VISIT_DOCUMENT, resolveDocumentSource } from "@/lib/documents/source";
import { GLOSSARY } from "@/lib/documents/glossary";
import { Icon, RandomizationDiagram, VisitTimeline } from "./icons";

type View = "source" | "review" | "participant";
type GlossaryEntry = (typeof GLOSSARY)[number];

const participantWords: Record<Locale, { title: string; waiting: string; note: string; shared: string; questions: string; ownQuestion: string; discuss: string; starters: [string, string, string] }> = {
  "tr-TR": { title: "Sizin için açıklama", waiting: "Açıklamanız burada görünecek.", note: "Koordinatör metni gözden geçirdikten sonra sizinle paylaşacak.", shared: "Gözden geçirildi ve paylaşıldı", questions: "Birlikte konuşulacak sorular", ownQuestion: "Sorunuzu kendi dilinizde yazın", discuss: "Bu soruyu konuşalım", starters: ["Bu kısmı açıklayabilir misiniz?", "Bu belgede neler açıklanmıyor?", "Bu konuda ekibe ne sormalıyım?"] },
  "es-419": { title: "Una explicación para ti", waiting: "Tu explicación aparecerá aquí.", note: "El coordinador revisará el texto antes de compartirlo contigo.", shared: "Revisado y compartido", questions: "Preguntas para conversar", ownQuestion: "Escribe tu pregunta en tu idioma", discuss: "Conversar sobre esta pregunta", starters: ["¿Puede explicar esta parte?", "¿Qué no se explica en este documento?", "¿Qué debería preguntarle al equipo sobre esto?"] },
  "pt-BR": { title: "Uma explicação para você", waiting: "Sua explicação aparecerá aqui.", note: "O coordenador revisará o texto antes de compartilhá-lo com você.", shared: "Revisado e compartilhado", questions: "Perguntas para conversar", ownQuestion: "Escreva sua pergunta no seu idioma", discuss: "Conversar sobre esta pergunta", starters: ["Pode explicar esta parte?", "O que não está explicado neste documento?", "O que devo perguntar à equipe sobre isso?"] },
  "hi-IN": { title: "आपके लिए जानकारी", waiting: "आपके लिए जानकारी यहाँ दिखाई देगी।", note: "समन्वयक इसे आपके साथ साझा करने से पहले जाँचेगा।", shared: "जाँच के बाद साझा किया गया", questions: "चर्चा करने के लिए सवाल", ownQuestion: "अपनी भाषा में अपना सवाल लिखें", discuss: "इस सवाल पर बात करें", starters: ["क्या आप इस हिस्से को समझा सकते हैं?", "इस दस्तावेज़ में क्या नहीं समझाया गया है?", "मुझे इस बारे में टीम से क्या पूछना चाहिए?"] },
  "zh-CN": { title: "为您准备的说明", waiting: "说明将显示在这里。", note: "协调员会先检查文字，然后再与您分享。", shared: "已检查并分享", questions: "可以一起讨论的问题", ownQuestion: "请用您的语言写下问题", discuss: "讨论这个问题", starters: ["您能解释这一部分吗？", "这份文件没有解释哪些内容？", "关于这一点，我应该向团队询问什么？"] },
};
const starterEnglish = ["Can you explain this part?", "What is not explained in this document?", "What should I ask the team about this?"];

function escapePattern(text: string) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function SourceText({ text, paragraphId, onTerm }: { text: string; paragraphId: string; onTerm: (entry: GlossaryEntry) => void }) {
  const terms = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(`${terms.map((entry) => `\\b${escapePattern(entry.term)}\\b`).join("|")}|\\b\\d+(?:[.,]\\d+)?(?:\\/\\d+)?%?`, "gi");
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const entry = terms.find((term) => term.term.toLowerCase() === match[0].toLowerCase());
    nodes.push(entry
      ? <button key={match.index} id={`term-${paragraphId}-${entry.id}-${match.index}`} className="doc-jargon" aria-label={`Explain term: ${match[0]}`} onClick={() => onTerm(entry)}>{match[0]}</button>
      : <mark className="doc-number" key={match.index}>{match[0]}</mark>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function Flags({ flags }: { flags: ReviewFlag[] }) {
  return <div className="doc-flags" aria-label="Review flags">{flags.map((flag, index) => <div className={`doc-flag ${flag.severity}`} key={`${flag.code}-${index}`}><Icon name={flag.severity === "info" ? "help" : "warning"} size={16} /><div><p>{flag.message}</p>{flag.sourceSnippet && <blockquote>{flag.sourceSnippet}</blockquote>}</div></div>)}</div>;
}

export function DocumentWorkspace() {
  const session = useSession();
  const { bridge, documents, sourceKind, locale, engine, textSize, documentView, setDocumentView, documentScroll, sessionEpoch, questionDraft, setQuestionDraft, questionParagraph, setQuestionParagraph } = session;
  const router = useRouter();
  const [glossary, setGlossary] = useState<GlossaryEntry | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const glossaryTrigger = useRef<HTMLElement | null>(null);
  const panes = useRef<Partial<Record<View, HTMLElement>>>({});
  const focusMemory = useRef<Partial<Record<View, string>>>({});
  const restoreFocus = useRef(false);
  const section = SECTIONS.find((item) => item.id === bridge.state.sectionId) || SECTIONS[1];
  const language = LANGUAGES.find((item) => item.locale === locale) || LANGUAGES[0];
  const consent = sourceKind === "consent";
  const controller = consent ? bridge : documents;
  const state = controller.state;
  const words = participantWords[locale];
  const paragraphs = useMemo(() => {
    if (consent) return [{ id: section.id, title: section.title, text: section.body }];
    if (sourceKind === "visit-summary") return VISIT_DOCUMENT.paragraphs;
    if (!documents.state.text.trim()) return [];
    try { return resolveDocumentSource({ kind: "paste", text: documents.state.text.trim(), acknowledged: true }).paragraphs; }
    catch { return [{ id: "paste-preview", title: "Pasted text", text: documents.state.text }]; }
  }, [consent, section, sourceKind, documents.state.text]);
  const sourceTitle = consent ? STUDY.name : sourceKind === "visit-summary" ? VISIT_DOCUMENT.title : "Pasted synthetic text";
  const currentParagraph = paragraphs.find((paragraph) => paragraph.id === questionParagraph) || paragraphs[0];
  const result = consent ? bridge.state.result : documents.state.result;
  const released = consent ? bridge.state.released : documents.state.released;
  const reviewBlocks = consent
    ? bridge.state.result ? [{ id: section.id, sourceParagraphIds: bridge.state.result.sourceSectionIds, translation: bridge.state.result.translation, backTranslation: bridge.state.result.backTranslation }] : []
    : documents.state.result?.blocks || [];
  const releasedBlocks = consent
    ? bridge.state.released ? [{ id: section.id, sourceParagraphIds: bridge.state.released.sourceSectionIds, translation: bridge.state.released.translation }] : []
    : documents.state.released?.blocks || [];
  const phase = released && released.requestId === result?.requestId ? "Shared" : state.reviewConfirmed ? "Reviewed" : result ? "Draft" : state.status === "loading" ? "Preparing" : "Not prepared";
  const canGenerate = state.status !== "loading" && (sourceKind !== "paste" || (engine === "live" && documents.state.acknowledged && documents.state.text.trim().length > 0 && documents.state.text.length <= 4_000));

  useEffect(() => {
    setGlossary(null);
    setCopyMessage("");
    focusMemory.current = {};
  }, [sessionEpoch, section.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const pane = panes.current[documentView];
      if (!pane) return;
      pane.scrollTop = documentScroll.current[documentView];
      if (restoreFocus.current) {
        const remembered = focusMemory.current[documentView];
        const element = remembered ? document.getElementById(remembered) : null;
        (element && pane.contains(element) ? element : pane).focus({ preventScroll: true });
        restoreFocus.current = false;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [documentView, documentScroll]);

  function chooseView(view: View, focus = false) {
    const oldPane = panes.current[documentView];
    if (oldPane) {
      documentScroll.current[documentView] = oldPane.scrollTop;
      if (document.activeElement instanceof HTMLElement && oldPane.contains(document.activeElement) && document.activeElement.id) focusMemory.current[documentView] = document.activeElement.id;
    }
    restoreFocus.current = focus;
    setDocumentView(view);
  }

  function showTerm(entry: GlossaryEntry) {
    glossaryTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setGlossary(entry);
    requestAnimationFrame(() => document.getElementById("doc-glossary")?.focus());
  }

  function closeTerm() {
    setGlossary(null);
    glossaryTrigger.current?.focus({ preventScroll: true });
  }

  async function generate() {
    chooseView("review");
    if (consent) await bridge.generate();
    else await documents.generate(sourceKind === "visit-summary" ? "visit-summary" : "paste");
  }

  function share() {
    controller.release();
    chooseView("participant", true);
  }

  function discuss() {
    if (!questionDraft.trim() || !currentParagraph) return;
    session.discussQuestion(questionDraft.trim(), { title: sourceTitle, paragraphId: currentParagraph.id, quote: currentParagraph.text });
    router.push("/");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(releasedBlocks.map((block) => block.translation).join("\n\n")); setCopyMessage("Copied."); }
    catch { setCopyMessage("Select the explanation text to copy it."); }
  }

  const paneProps = (view: View) => ({
    ref: (node: HTMLElement | null) => { if (node) panes.current[view] = node; },
    onScroll: () => { const node = panes.current[view]; if (node) documentScroll.current[view] = node.scrollTop; },
    onFocusCapture: (event: React.FocusEvent<HTMLElement>) => { if (event.target.id) focusMemory.current[view] = event.target.id; },
    tabIndex: -1,
  });

  return <main className={`document-guide text-${textSize}`} data-view={documentView} aria-label="Document guide">
    <div className="doc-introduction"><div><p className="doc-kicker">DOCUMENT GUIDE</p><h1>Understand the document.</h1><p>Keep the original close. Prepare, review, then share an explanation.</p></div><span className="doc-fictional"><Icon name="document" size={14} />Fictional education prototype</span></div>

    <div className="doc-navigation"><label className="doc-source-selector"><span>Choose a source</span><select aria-label="Document source" value={sourceKind} onChange={(event) => session.setSourceKind(event.target.value as typeof sourceKind)}><option value="consent">Trial consent · CLEAR Study</option><option value="visit-summary">Fictional visit summary</option><option value="paste">Paste synthetic text</option></select></label>
      <div className="doc-view-tabs" role="tablist" aria-label="Document views" onKeyDown={(event) => {
        const views: View[] = ["source", "review", "participant"];
        const current = views.indexOf(documentView);
        const next = event.key === "ArrowRight" ? views[(current + 1) % 3] : event.key === "ArrowLeft" ? views[(current + 2) % 3] : event.key === "Home" ? "source" : event.key === "End" ? "participant" : null;
        if (next) { event.preventDefault(); chooseView(next); document.getElementById(`doc-tab-${next}`)?.focus(); }
      }}>{(["source", "review", "participant"] as View[]).map((view) => <button key={view} id={`doc-tab-${view}`} role="tab" aria-controls={`doc-pane-${view}`} aria-selected={documentView === view} tabIndex={documentView === view ? 0 : -1} onClick={() => chooseView(view, true)} className={documentView === view ? "selected" : ""}>{view === "source" ? "Source" : view === "review" ? "Review" : "Participant"}{view === "review" && result && <span className="doc-tab-dot" />}</button>)}</div>
    </div>

    <div className="doc-workspace">
      <section {...paneProps("source")} className="doc-pane doc-source" id="doc-pane-source" aria-label="Original document">
        <div className="doc-pane-heading"><span><Icon name="document" size={16} />Original document</span><span className="doc-source-language">English · unchanged</span></div>
        {consent && <nav className="doc-section-nav" aria-label="Trial consent sections">{SECTIONS.map((item) => <button key={item.id} id={`select-${item.id}`} aria-current={item.id === section.id ? "true" : undefined} onClick={() => { bridge.setSection(item.id); setGlossary(null); }}><span>{item.number}</span>{item.shortTitle}</button>)}</nav>}
        {sourceKind === "paste" && <div className="doc-paste-editor"><label htmlFor="synthetic-source">Public or fictional English text</label><textarea id="synthetic-source" value={documents.state.text} onChange={(event) => documents.setText(event.target.value)} placeholder="Paste a fictional visit note or public educational text. Keep names and private health information out." aria-describedby="paste-count paste-guidance" /><p id="paste-count" className={documents.state.text.length > 4_000 ? "doc-limit over" : "doc-limit"}>{documents.state.text.length.toLocaleString()} / 4,000 characters{documents.state.text.length > 4_000 ? " · Shorten the text to continue; your input has been kept." : ""}</p><label className="doc-acknowledgment"><input type="checkbox" checked={documents.state.acknowledged} onChange={(event) => documents.setAcknowledged(event.target.checked)} />I confirm this text is public or fictional and contains no private personal information.</label><p id="paste-guidance" className="doc-small-note">Pasted text uses Live Gemini. Sample mode supports the two prepared fictional documents.</p></div>}
        <article className="doc-original"><p className="doc-kicker">{consent ? `${STUDY.code} · ${STUDY.version}` : sourceKind === "visit-summary" ? "FICTIONAL VISIT NOTE" : "SOURCE PREVIEW"}</p><h2>{sourceTitle}</h2>{paragraphs.length ? paragraphs.map((paragraph) => <section id={`source-${paragraph.id}`} className="doc-paragraph" key={paragraph.id} tabIndex={-1}><h3>{paragraph.title}</h3><p><SourceText text={paragraph.text} paragraphId={paragraph.id} onTerm={showTerm} /></p></section>) : <p className="doc-source-empty">Your source text will appear here as you type or paste it.</p>}</article>
        {glossary && <aside className="doc-glossary" id="doc-glossary" tabIndex={-1} aria-label="Glossary explanation" onKeyDown={(event) => { if (event.key === "Escape") closeTerm(); }}><div><strong>{glossary.term}</strong><button className="icon-button" aria-label="Close glossary" onClick={closeTerm}><Icon name="close" size={18} /></button></div><p>{glossary.meaning}</p><small>Glossary source: {glossary.provenance}. This explains the word; it does not add facts to this document.</small></aside>}
        <p className="doc-original-note"><Icon name="help" size={14} />Highlighted terms open a prepared glossary. Numbers stay visible for review.</p>
        <div className="doc-prepare"><p>English<Icon name="arrow" size={15} />{language.nativeName}</p><button className="primary-button" onClick={generate} disabled={!canGenerate}><Icon name="spark" size={16} />{state.status === "error" ? "Retry explanation" : "Prepare explanation"}<Icon name="arrow" size={16} /></button></div>
      </section>

      <section {...paneProps("review")} className="doc-pane doc-review" id="doc-pane-review" aria-label="Coordinator review">
        <div className="doc-pane-heading"><span><Icon name="eye" size={16} />Coordinator review</span><span className={`doc-phase ${phase.toLowerCase().replace(" ", "-")}`} role="status">{phase}</span></div>
        {state.status === "loading" ? <div className="doc-empty doc-loading" role="status"><span className="spinner" /><h2>Preparing the explanation.</h2><p>Then a separate call renders the generated text back into English for review.</p><button className="text-button" onClick={controller.cancel}>Cancel request</button></div>
          : state.error ? <div className="doc-error" role="alert"><Icon name="warning" size={22} /><h2>Nothing has been shared.</h2><p>{state.error}</p><button className="primary-button" disabled={!canGenerate} onClick={generate}>Retry explanation</button></div>
            : result ? <div className="doc-review-content"><div className="doc-draft-intro"><p className="doc-kicker">{result.engine === "sample" ? "PREPARED SAMPLE · DRAFT" : "LIVE GEMINI · DRAFT"}</p><p>Compare the meaning with the source. The English rendering helps review; it does not certify accuracy.</p></div>{reviewBlocks.map((block, index) => <article className="doc-review-block" key={block.id}><div className="doc-block-heading"><h2>{paragraphs.find((paragraph) => paragraph.id === block.sourceParagraphIds[0])?.title || `Explanation ${index + 1}`}</h2><span>{index + 1} / {reviewBlocks.length}</span></div><p className="doc-translated-draft" lang={locale}>{block.translation}</p><details className="doc-reverse" open><summary>English reverse rendering<Icon name="chevron" size={15} /></summary><p>{block.backTranslation}</p></details><details className="doc-evidence"><summary><Icon name="document" size={14} />Compare source evidence</summary>{block.sourceParagraphIds.map((id) => { const paragraph = paragraphs.find((item) => item.id === id); return paragraph ? <div key={id}><a href={`#source-${id}`} onClick={() => { chooseView("source"); setTimeout(() => document.getElementById(`source-${id}`)?.focus({ preventScroll: false }), 0); }}>{paragraph.title}<Icon name="arrow" size={13} /></a><blockquote>{paragraph.text}</blockquote></div> : null; })}</details></article>)}<Flags flags={result.flags} /><label className="doc-confirmation"><input aria-label="I have reviewed the source, explanation, and English reverse rendering." type="checkbox" disabled={!result.canRelease} checked={state.reviewConfirmed} onChange={(event) => controller.setReviewConfirmed(event.target.checked)} />I have reviewed the source, explanation, and English reverse rendering.</label><div className="doc-release-row"><p>Only this exact reviewed draft will be shared.</p><button className="primary-button" onClick={share} disabled={!result.canRelease || !state.reviewConfirmed || phase === "Shared"}><Icon name="check" size={16} />{phase === "Shared" ? "Shared with participant" : "Show to participant"}</button></div><p className="doc-timing">Observed preparation time: {(result.elapsedMs / 1000).toFixed(1)} s{result.engine === "sample" ? " · Prepared fixture, no live model call" : " · Two model calls"}</p></div>
              : <div className="doc-empty"><Icon name="eye" size={38} /><h2>Review before sharing.</h2><p>Choose a source and prepare an explanation. The draft and its English rendering appear here.</p><button className="text-button" onClick={() => chooseView("source", true)}>Go to source<Icon name="arrow" size={15} /></button></div>}
      </section>

      <section {...paneProps("participant")} className="doc-pane doc-participant" id="doc-pane-participant" aria-label="Participant explanation">
        <div className="doc-pane-heading"><span><Icon name="globe" size={16} />Participant view</span><span className={`doc-phase ${released ? "shared" : ""}`}>{released ? "Shared" : "Waiting for review"}</span></div>
        <div className="doc-participant-language"><p className="doc-kicker">{language.name}</p><h2 lang={locale}>{words.title}</h2></div>
        {released ? <div className="doc-released" lang={locale}><p className="doc-shared-label"><Icon name="check" size={14} />{words.shared}</p>{released.engine === "sample" && <p className="doc-sample-label">Sample · Prepared demonstration text</p>}{releasedBlocks.map((block) => <div className="doc-participant-block" key={block.id}><p>{block.translation}</p></div>)}{consent && bridge.state.released?.visual === "RANDOMIZATION" && <RandomizationDiagram locale={locale} />}{consent && bridge.state.released?.visual === "CALENDAR" && <VisitTimeline locale={locale} />}<button className="text-button doc-copy" onClick={copy}><Icon name="copy" size={14} />Copy explanation</button>{copyMessage && <p className="doc-small-note" role="status">{copyMessage}</p>}</div>
          : <div className="doc-empty doc-participant-empty" lang={locale}><Icon name="document" size={45} /><h2>{words.waiting}</h2><p>{words.note}</p></div>}
        <section className="doc-questions" aria-label="Questions to discuss"><div className="doc-question-heading"><Icon name="chat" size={19} /><h2 lang={locale}>{words.questions}</h2></div><label className="doc-question-source">Question about<select aria-label="Question source paragraph" value={currentParagraph?.id || ""} onChange={(event) => setQuestionParagraph(event.target.value)} disabled={!paragraphs.length}>{paragraphs.length ? paragraphs.map((paragraph) => <option key={paragraph.id} value={paragraph.id}>{paragraph.title}</option>) : <option value="">Add source text first</option>}</select></label><div className="doc-question-starters" lang={locale}>{words.starters.map((question, index) => <button key={question} aria-label={`Use question: ${starterEnglish[index]}`} onClick={() => setQuestionDraft(question)}>{question}<Icon name="arrow" size={13} /></button>)}</div><label className="doc-own-question" lang={locale}>{words.ownQuestion}<textarea id="participant-document-question" aria-label="Participant question" value={questionDraft} onChange={(event) => setQuestionDraft(event.target.value)} placeholder={words.starters[0]} /></label><button className="primary-button doc-discuss" aria-label="Discuss this question" disabled={!questionDraft.trim() || !currentParagraph} onClick={discuss}><Icon name="chat" size={16} /><span lang={locale}>{words.discuss}</span><Icon name="arrow" size={16} /></button><p className="doc-small-note">Opens the participant’s side of Conversation. A person answers; Omni-Bridge translates.{engine === "sample" ? " New questions need Live Gemini for translation; Sample mode only translates its prepared conversation." : ""}</p></section>
        <p className="doc-prototype-note"><Icon name="help" size={15} />Fictional education only. This explanation does not replace the source document, an interpreter, or a conversation with the team.</p>
      </section>
    </div>
  </main>;
}
