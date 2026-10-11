"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePatientProfile } from "@/hooks/use-patient-profile";
import { useVitals } from "@/hooks/use-vitals";
import { useActionPlan } from "@/hooks/use-action-plan";
import { emptyProfile, patientContext, type PatientProfile } from "@/lib/patient/profile";
import { useBridge } from "@/hooks/use-bridge";
import { SAMPLE_VISIT } from "@/lib/visits/sample";
import type { VisitSpeaker } from "@/lib/visits/types";
import { useVisits } from "@/hooks/use-visits";
import { useDocuments } from "@/hooks/use-documents";
import { hasPreparedSamples, type Engine, type Locale } from "@/lib/types";

import type { ConversationEntry } from "@/lib/local-conversation";
import { useConversationHistory } from "@/hooks/use-conversation-history";

export type SourceKind = "consent" | "visit-summary" | "paste";
export type TextSize = "standard" | "large" | "extra-large";
export type DocumentView = "source" | "review" | "participant";
export interface QuestionOrigin { title: string; paragraphId: string; quote: string }

function useSessionController(liveAvailable: boolean) {
  const patient = usePatientProfile();
  const vitals = useVitals();
  const context = patientContext(patient.profile);
  const bridgeController = useBridge(liveAvailable, context);
  const documentController = useDocuments(liveAvailable, context);
  const visitController = useVisits(liveAvailable, context);
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
  function restoreConversation(entry: ConversationEntry) {
    const saved = entry.conversation;
    clearWork();
    patient.activate(entry.patient ?? { ...emptyProfile, recordId: entry.patientId ?? crypto.randomUUID(), preferredLanguage: saved.locale }, Boolean(entry.patient));
    bridgeController.setLocale(saved.locale); documentController.setLocale(saved.locale);
    bridgeController.setEngine(saved.engine); documentController.setEngine(saved.engine);
    visitController.restore(saved);
  }
  const history = useConversationHistory({ version: 1, locale: visitController.state.locale,
    engine: visitController.state.engine, turns: visitController.state.turns }, patient.profile, patient.remember, restoreConversation);
  const actionPlan = useActionPlan(visitController.state.turns, visitController.state.locale, context, {
    visitId: history.active?.id ?? null, patientId: patient.profile.recordId, savedPlan: history.active?.plan ?? null,
    save: history.savePlan, remove: history.removePlan,
  });

  useEffect(() => {
    // A restored conversation keeps its own language. Otherwise honor the remembered profile.
    if (patient.ready && !visitController.state.turns.length) setLocale(patient.profile.preferredLanguage);
  // Apply initial hydration only; subsequent profile saves set the locale explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.ready]);

  function clearQuestions() { setQuestionOrigin(null); setQuestionDraft(""); setQuestionParagraph(""); }
  function setLocale(value: Locale) {
    if (value === locale) return;
    history.detach();
    bridgeController.setLocale(value); documentController.setLocale(value); visitController.setLocale(value);
    if (!hasPreparedSamples(value) && engine === "sample" && liveAvailable) { bridgeController.setEngine("live"); documentController.setEngine("live"); visitController.setEngine("live"); }
    clearQuestions(); setEpoch((epoch) => epoch + 1);
  }
  function setEngine(value: Engine) {
    if (value === engine || (value === "sample" && !hasPreparedSamples(locale))) return;
    history.detach();
    bridgeController.setEngine(value); documentController.setEngine(value); visitController.setEngine(value);
    setEpoch((epoch) => epoch + 1);
  }
  function clearWork() {
    actionPlan.cancel();
    bridgeController.reset(); documentController.reset(); visitController.reset(); clearQuestions();
    setComposerSpeaker("clinician");
    setDocumentView("source"); documentScroll.current = { source: 0, review: 0, participant: 0 };
    setEpoch((epoch) => epoch + 1);
  }
  function invalidateProfileWork() {
    bridgeController.cancel(); documentController.cancel(); visitController.cancel(); actionPlan.cancel();
    setEpoch((epoch) => epoch + 1);
  }
  function savePatientProfile(value: PatientProfile, remember: boolean, preferredLocale: Locale) {
    if (!patient.save({ ...value, preferredLanguage: preferredLocale }, remember)) return false;
    if (value.recordId !== patient.profile.recordId) { history.detach(); clearWork(); }
    invalidateProfileWork(); setLocale(preferredLocale); return true;
  }
  function clearPatientProfile() { patient.clear(); history.detach(); clearWork(); }
  function setSourceKind(value: SourceKind) {
    if (value === sourceKind) return;
    history.detach(); clearWork(); setSource(value);
  }
  function reset() { history.detach(); clearWork(); setSource("consent"); }
  function deleteConversation(id: string) { if (history.remove(id)) clearWork(); }
  function deleteAllConversations() { history.clear(); clearWork(); }
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
    openPrepared: () => { history.detach(); setComposerSpeaker("clinician"); setQuestionOrigin(null); setEngine("sample"); visitController.openPrepared(); },
  };
  return { liveAvailable, patient, vitals, savePatientProfile, clearPatientProfile, emptyPatientProfile: emptyProfile, actionPlan, history, deleteConversation, deleteAllConversations, storageReady: history.ready && patient.ready && vitals.ready, storageMessage: history.message, locale, engine, composerSpeaker, selectSpeaker, textSize, setLocale, setEngine, setTextSize,
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
