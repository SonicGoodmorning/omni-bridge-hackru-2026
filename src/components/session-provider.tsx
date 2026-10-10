"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useBridge } from "@/hooks/use-bridge";
import { SAMPLE_VISIT } from "@/lib/visits/sample";
import type { VisitSpeaker } from "@/lib/visits/types";
import { useVisits } from "@/hooks/use-visits";
import { useDocuments } from "@/hooks/use-documents";
import type { Engine, Locale } from "@/lib/types";

import { CONVERSATION_STORAGE_KEY, parseSavedConversation, serializeConversation } from "@/lib/local-conversation";

export type SourceKind = "consent" | "visit-summary" | "paste";
export type TextSize = "standard" | "large" | "extra-large";
export type DocumentView = "source" | "review" | "participant";
export interface QuestionOrigin { title: string; paragraphId: string; quote: string }

function useSessionController(liveAvailable: boolean) {
  const bridgeController = useBridge(liveAvailable);
  const documentController = useDocuments(liveAvailable);
  const visitController = useVisits(liveAvailable);
  const [composerSpeaker, setComposerSpeaker] = useState<VisitSpeaker>("clinician");
  function selectSpeaker(speaker: VisitSpeaker) {
    if (speaker === composerSpeaker) return;
    visitController.cancel(); setComposerSpeaker(speaker);
  }
  const [sourceKind, setSource] = useState<SourceKind>("consent");
  const [textSize, setTextSize] = useState<TextSize>("standard");
  const [sessionEpoch, setEpoch] = useState(0);
  const [questionOrigin, setQuestionOrigin] = useState<QuestionOrigin | null>(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionParagraph, setQuestionParagraph] = useState("");
  const [documentView, setDocumentView] = useState<DocumentView>("source");
  const documentScroll = useRef<Record<DocumentView, number>>({ source: 0, review: 0, participant: 0 });
  const locale = bridgeController.state.locale;
  const engine = bridgeController.state.engine;
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("Loading saved conversation…");
  const storageLoaded = useRef(false);
  const storageReadFailed = useRef(false);
  useEffect(() => {
    if (storageLoaded.current) return;
    storageLoaded.current = true;
    try {
      const raw = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (raw) {
        const saved = parseSavedConversation(raw);
        bridgeController.setLocale(saved.locale); documentController.setLocale(saved.locale);
        bridgeController.setEngine(saved.engine); documentController.setEngine(saved.engine);
        visitController.restore(saved);
      }
    } catch {
      storageReadFailed.current = true;
      setStorageMessage("Saved data could not be loaded. Use Delete saved conversation in Menu to clear it.");
      // Leave invalid data untouched until the user explicitly deletes or replaces it.
      return;
    } finally { setStorageReady(true); }
  // Load once after hydration; restoring never starts a model request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const savedTurns = visitController.state.turns;
  useEffect(() => {
    if (!storageReady || (storageReadFailed.current && !savedTurns.length)) return;
    try {
      if (savedTurns.length) {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, serializeConversation({ version: 1,
          locale: visitController.state.locale, engine: visitController.state.engine, turns: savedTurns }));
        storageReadFailed.current = false;
        setStorageMessage("Shared conversation saved in this browser.");
      } else {
        localStorage.removeItem(CONVERSATION_STORAGE_KEY);
        setStorageMessage("Shared turns save automatically in this browser. Drafts are not saved.");
      }
    } catch { setStorageMessage("Browser saving is unavailable or full. This conversation is only in memory."); }
  }, [storageReady, savedTurns, visitController.state.locale, visitController.state.engine]);


  function clearQuestions() { setQuestionOrigin(null); setQuestionDraft(""); setQuestionParagraph(""); }
  function setLocale(value: Locale) {
    if (value === locale) return;
    bridgeController.setLocale(value); documentController.setLocale(value); visitController.setLocale(value);
    clearQuestions(); setEpoch((epoch) => epoch + 1);
  }
  function setEngine(value: Engine) {
    if (value === engine) return;
    bridgeController.setEngine(value); documentController.setEngine(value); visitController.setEngine(value);
    setEpoch((epoch) => epoch + 1);
  }
  function clearWork() {
    bridgeController.reset(); documentController.reset(); visitController.reset(); clearQuestions();
    setComposerSpeaker("clinician");
    setDocumentView("source"); documentScroll.current = { source: 0, review: 0, participant: 0 };
    setEpoch((epoch) => epoch + 1);
  }
  function setSourceKind(value: SourceKind) {
    if (value === sourceKind) return;
    clearWork(); setSource(value);
  }
  function reset() {
    storageReadFailed.current = false;
    clearWork(); setSource("consent");
    try { localStorage.removeItem(CONVERSATION_STORAGE_KEY); setStorageMessage("Saved conversation deleted. Shared turns will save automatically."); }
    catch { setStorageMessage("Could not delete browser data. Clear this site’s storage in your browser settings."); }
  }
  function discussQuestion(text: string, origin: QuestionOrigin) {
    visitController.cancel();
    setComposerSpeaker("participant");
    visitController.setDraft("participant", text.trim());
    setQuestionOrigin(origin);
  }

  const bridge = { ...bridgeController, setSection: (id: string) => { if (bridgeController.state.sectionId !== id) clearQuestions(); bridgeController.setSection(id); } };
  const documents = { ...documentController, setText: (text: string) => { if (documentController.state.text !== text) clearQuestions(); documentController.setText(text); } };
  const visits = { ...visitController, setLocale, setEngine,
    nextSample: () => { setComposerSpeaker(SAMPLE_VISIT[visitController.state.sampleCursor % SAMPLE_VISIT.length].speaker); setQuestionOrigin(null); setEngine("sample"); visitController.nextSample(); },
    openPrepared: () => { setComposerSpeaker("clinician"); setQuestionOrigin(null); setEngine("sample"); visitController.openPrepared(); },
  };
  return { liveAvailable, storageReady, storageMessage, locale, engine, composerSpeaker, selectSpeaker, textSize, setLocale, setEngine, setTextSize,
    sourceKind, setSourceKind, sessionEpoch, reset, bridge, documents, visits,
    questionOrigin, questionDraft, setQuestionDraft, questionParagraph, setQuestionParagraph, discussQuestion,
    documentView, setDocumentView, documentScroll };
}

type Session = ReturnType<typeof useSessionController>;
const SessionContext = createContext<Session | null>(null);
export function SessionProvider({ liveAvailable, children }: { liveAvailable: boolean; children: ReactNode }) {
  const session = useSessionController(liveAvailable);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("The workspace must be inside SessionProvider.");
  return session;
}
