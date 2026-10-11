"use client";

import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import type { VisitTurn } from "@/hooks/use-visits";
import { extendLocaleCopy, languageDirection, type Locale } from "@/lib/types";

export function containModalFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || !event.currentTarget.matches(":modal")) return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
  )).filter((node) => node.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}

export function ReviewPanel({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current!;
    const media = window.matchMedia("(max-width: 900px)");
    function open() { node.close(); if (media.matches) node.showModal(); else node.show(); }
    open(); media.addEventListener("change", open);
    return () => { media.removeEventListener("change", open); node.close(); };
  }, []);
  return <dialog ref={dialog} className="conversation-review-panel" onKeyDown={containModalFocus} aria-labelledby="visit-review-heading" onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <button className="text-button review-close" aria-label="Close review" onClick={onDismiss}>Close review <span aria-hidden="true">×</span></button>
    {children}
  </dialog>;
}

const displayCopy = extendLocaleCopy<{ title: string; clinician: string; participant: string; previous: string; next: string; close: string; note: string }>({"title": "The conversation for you", "clinician": "Care team", "participant": "You", "previous": "Previous", "next": "Next", "close": "Close", "note": "Fictional education demonstration"}, {
  "tr-TR": { title: "Sizin için konuşma", clinician: "Bakım ekibi", participant: "Siz", previous: "Önceki", next: "Sonraki", close: "Kapat", note: "Kurgusal eğitim gösterimi" },
  "es-419": { title: "La conversación para usted", clinician: "Equipo de atención", participant: "Usted", previous: "Anterior", next: "Siguiente", close: "Cerrar", note: "Demostración educativa ficticia" },
  "pt-BR": { title: "A conversa para você", clinician: "Equipe de atendimento", participant: "Você", previous: "Anterior", next: "Próxima", close: "Fechar", note: "Demonstração educativa fictícia" },
  "hi-IN": { title: "आपके लिए बातचीत", clinician: "देखभाल टीम", participant: "आप", previous: "पिछला", next: "अगला", close: "बंद करें", note: "काल्पनिक शैक्षिक प्रदर्शन" },
  "zh-CN": { title: "为您显示对话", clinician: "护理团队", participant: "您", previous: "上一条", next: "下一条", close: "关闭", note: "虚构的教育演示" },
});

export function ParticipantDisplay({ turns, locale, onDismiss }: { turns: VisitTurn[]; locale: Locale; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(turns.length - 1);
  const copy = displayCopy[locale];
  const turn = turns[Math.min(index, turns.length - 1)];
  useEffect(() => {
    const node = dialog.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.showModal();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  if (!turn) return null;
  return <dialog ref={dialog} className="participant-display" onKeyDown={containModalFocus} aria-label="Participant display" lang={locale} dir={languageDirection(locale)} onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <header><div><p className="display-kicker">{copy.title}</p><span className="display-engine">{turn.prepared ? "Prepared sample" : turn.engine === "sample" ? "Reviewed sample" : "Live Gemini · Shared"}</span></div><button className="text-button" aria-label="Close participant display" onClick={onDismiss}>{copy.close} <span aria-hidden="true">×</span></button></header>
    <div className="display-message" aria-live="polite"><p className="display-speaker">{turn.speaker === "clinician" ? copy.clinician : copy.participant}</p><p className="display-text">{turn.speaker === "clinician" ? turn.translation : turn.sourceText}</p></div>
    <footer><p>{copy.note}</p><div><button className="text-button" aria-label="Previous shared turn" disabled={index <= 0} onClick={() => setIndex(index - 1)}>{copy.previous}</button><span>{index + 1} / {turns.length}</span><button className="text-button" aria-label="Next shared turn" disabled={index >= turns.length - 1} onClick={() => setIndex(index + 1)}>{copy.next}</button></div></footer>
  </dialog>;
}
