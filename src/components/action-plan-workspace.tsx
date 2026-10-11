"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./session-provider";
import { Icon } from "./icons";
import { LANGUAGES, extendLocaleCopy, languageDirection, hasPreparedSamples, type Locale } from "@/lib/types";

const copy = extendLocaleCopy<{ title: string; intro: string; day: string; progress: string; done: string; pending: string; empty: string; questions: string; daily: string; once: string; directed: string; download: string; listen: string; stop: string; waiting: string; noActions: string; instructions: string }>({"title": "Your plan after the visit", "intro": "The shared instructions, one step at a time.", "day": "Day", "progress": "Steps marked", "done": "I completed this step", "pending": "Clarify this step with the clinician first", "empty": "First share a clinician instruction in Conversation.", "questions": "Questions for the clinician", "daily": "Every day · only for the stated duration", "once": "Once", "directed": "Under the stated conditions", "download": "Download plan", "listen": "Listen", "stop": "Stop", "waiting": "Review the plan before using the checklist.", "noActions": "No clear checklist instructions were found. Ask the clinician if you need a plan.", "instructions": "Follow only the stated times and conditions. Checkmarks are personal reminders, not medical records."}, {
  "tr-TR": { title: "Ziyaret sonrası planınız", intro: "Görüşmede paylaşılan talimatlar, adım adım.", day: "Gün", progress: "Tamamlanan adımlar", done: "Bu adımı tamamladım", pending: "Önce sağlık uzmanıyla netleştirin", empty: "Önce görüşmede sağlık uzmanının talimatını paylaşın.", questions: "Sağlık uzmanına sorulacaklar", daily: "Her gün · belirtilen süre boyunca", once: "Bir kez", directed: "Belirtilen koşullarda", download: "Planı indir", listen: "Dinle", stop: "Durdur", waiting: "Planın kullanılması için önce gözden geçirilmesi gerekir.", noActions: "Bu görüşmede net bir eylem talimatı bulunamadı. Gerekirse sağlık uzmanına sorun.", instructions: "Yalnızca belirtilen zaman ve koşullarda uygulayın. İşaretler hatırlatma amaçlıdır; tıbbi kayıt değildir." },
  "es-419": { title: "Tu plan después de la visita", intro: "Las instrucciones compartidas, paso a paso.", day: "Día", progress: "Pasos marcados", done: "Completé este paso", pending: "Aclara este paso con el profesional", empty: "Primero comparte una instrucción del profesional en la conversación.", questions: "Preguntas para el profesional", daily: "Cada día · durante el período indicado", once: "Una vez", directed: "Según las condiciones indicadas", download: "Descargar plan", listen: "Escuchar", stop: "Detener", waiting: "El plan necesita revisión antes de usar la lista.", noActions: "No se encontraron instrucciones claras para una lista. Consulta al profesional si necesitas un plan.", instructions: "Sigue solo los tiempos y condiciones indicados. Las marcas son recordatorios personales, no registros médicos." },
  "pt-BR": { title: "Seu plano após a consulta", intro: "As orientações compartilhadas, passo a passo.", day: "Dia", progress: "Etapas marcadas", done: "Concluí esta etapa", pending: "Esclareça esta etapa com o profissional", empty: "Primeiro compartilhe uma orientação do profissional na conversa.", questions: "Perguntas para o profissional", daily: "A cada dia · durante o período indicado", once: "Uma vez", directed: "Conforme as condições indicadas", download: "Baixar plano", listen: "Ouvir", stop: "Parar", waiting: "O plano precisa de revisão antes de usar a lista.", noActions: "Nenhuma orientação clara para uma lista foi encontrada. Pergunte ao profissional se precisar de um plano.", instructions: "Siga apenas os horários e condições indicados. As marcas são lembretes pessoais, não registros médicos." },
  "hi-IN": { title: "मुलाकात के बाद आपकी योजना", intro: "बातचीत में साझा किए गए निर्देश, एक-एक कदम।", day: "दिन", progress: "चिह्नित कदम", done: "मैंने यह कदम पूरा किया", pending: "पहले चिकित्सक से स्पष्ट करें", empty: "पहले बातचीत में चिकित्सक का निर्देश साझा करें।", questions: "चिकित्सक से पूछने के सवाल", daily: "हर दिन · बताई गई अवधि तक", once: "एक बार", directed: "बताई गई शर्तों के अनुसार", download: "योजना डाउनलोड करें", listen: "सुनें", stop: "रोकें", waiting: "सूची का उपयोग करने से पहले योजना की समीक्षा ज़रूरी है।", noActions: "इस बातचीत में सूची के लिए स्पष्ट निर्देश नहीं मिले। ज़रूरत हो तो चिकित्सक से पूछें।", instructions: "केवल बताए गए समय और शर्तों का पालन करें। ये निशान निजी याद दिलाने के लिए हैं, चिकित्सा रिकॉर्ड नहीं।" },
  "zh-CN": { title: "您的就诊后计划", intro: "将对话中分享的指导分成简单的步骤。", day: "日期", progress: "已勾选步骤", done: "我已完成这一步", pending: "请先向医护人员确认", empty: "请先在对话中分享医护人员的指导。", questions: "要问医护人员的问题", daily: "每天 · 仅在指定期间", once: "一次", directed: "按指定条件", download: "下载计划", listen: "收听", stop: "停止", waiting: "使用清单前需要先审核计划。", noActions: "对话中没有明确的待办指导。如需计划，请询问医护人员。", instructions: "仅按指定时间和条件执行。勾选仅作个人提醒，并非医疗记录。" },
});
function localDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function ActionPlanWorkspace() {
  const session = useSession();
  const plan = session.actionPlan;
  const turns = session.visits.state.turns;
  const t = copy[session.locale];
  const result = plan.result;
  const [day, setDay] = useState(localDay);
  const previousToday = useRef(localDay());
  const [message, setMessage] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const [contextConfirmed, setContextConfirmed] = useState(false);
  const profileKey = JSON.stringify(session.patient.profile);
  useEffect(() => { setContextConfirmed(false); }, [profileKey, session.locale, turns]);
  useEffect(() => { setCanSpeak("speechSynthesis" in window); return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }; }, []);
  useEffect(() => {
    setPlaying(null); setMessage(""); if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [result?.requestId, session.sessionEpoch]);
  useEffect(() => {
    function refreshDay() { const today = localDay(); const previous = previousToday.current; setDay((current) => current === previous || current > today ? today : current); previousToday.current = today; }
    const timer = setInterval(refreshDay, 60_000);
    document.addEventListener("visibilitychange", refreshDay);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refreshDay); };
  }, []);
  const hasClinician = turns.some((turn) => turn.speaker === "clinician");
  const blocked = Boolean(result?.actions.some((action) => !action.canCheck));
  const occurrence = (recurrence: string) => recurrence === "daily" ? day : "once";
  const doneCount = result?.actions.filter((action) => plan.completed[`${action.id}:${occurrence(action.recurrence)}`]).length ?? 0;
  function listen(id: string, text: string) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    if (playing === id) { setPlaying(null); return; }
    const locale = session.locale === "es-419" ? "es-MX" : session.locale;
    const voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.split("-")[0] === locale.split("-")[0]);
    if (!voice) { setMessage("A voice for this language is unavailable. The written plan is still available."); setPlaying(null); return; }
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = locale; utterance.voice = voice; utterance.rate = .9;
    utterance.onend = () => setPlaying((current) => current === id ? null : current);
    utterance.onerror = () => { setPlaying(null); setMessage("Audio stopped. You can read the plan instead."); };
    setPlaying(id); window.speechSynthesis.speak(utterance);
  }
  function download() {
    if (!result || !plan.approved) return;
    const text = [t.title, `${t.day}: ${day}`, t.instructions,
      ...result.actions.map((action, index) => `${plan.completed[`${action.id}:${occurrence(action.recurrence)}`] ? "[x]" : "[ ]"} ${index + 1}. ${action.patientText}\n${action.timingPatient}\n${action.recurrence === "daily" ? t.daily : action.recurrence === "once" ? t.once : t.directed}\nSource: ${action.sourceQuote}`),
      t.questions, ...result.questions.map((question) => `• ${question.patientText}`),
      "SayAhh · Reviewed educational draft. Personal checklist, not a prescription. No reminders are scheduled.",
    ].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sayahh-plan-${day}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Plan downloaded. It includes the original source quotes; keep it on a private device.");
  }
  return <main className="care-workspace plan-workspace">
    <header className="care-heading"><div><p className="eyebrow">POST-VISIT · {LANGUAGES.find((language) => language.locale === session.locale)?.nativeName}</p><h1 lang={session.locale} dir={languageDirection(session.locale)}>{t.title}</h1><p lang={session.locale} dir={languageDirection(session.locale)}>{t.intro}</p></div><Link href="/history" className="text-button">Visit history <Icon name="arrow" size={16} /></Link></header>
    <section className="plan-generator"><div><h2>Generate from your conversation</h2><p>{turns.length} shared turns · {turns.filter((turn) => turn.speaker === "clinician").length} clinician turns. The complete shared transcript is used; unshared drafts are excluded.</p><p>Profile: <Link href="/profile">{session.patient.profile.preferredName || "No nickname set"} · {session.patient.profile.useInAI ? "AI context enabled" : "AI context off"}</Link>. Review these details when reopening a saved conversation.</p>
      {turns.some((turn) => turn.prepared || turn.engine === "sample") && <p className="care-notice">This conversation includes prepared sample turns. The plan will be generated live from those turns, not from a separate prepared checklist.</p>}
      <label className="review-confirmation"><input type="checkbox" checked={contextConfirmed} onChange={(event) => setContextConfirmed(event.target.checked)} /><span>This is the intended patient’s conversation and preferred language. I have checked the selected profile.</span></label>
    </div><div className="plan-generate-actions"><button className="primary-button" disabled={!hasClinician || !session.liveAvailable || !contextConfirmed || plan.status === "loading"} onClick={() => void plan.generate()}>{plan.status === "loading" ? <><span className="spinner" />Building plan…</> : result ? "Regenerate plan" : "Generate action plan"}</button>{plan.status === "loading" && <button className="text-button" onClick={plan.cancel}>Cancel</button>}</div></section>
    {plan.hasSavedPlan && <aside className="plan-saved"><div><strong>{plan.isLegacyPlan ? "An older, unlinked plan is saved in this browser." : "This visit has its own saved plan."}</strong><p>Restore the matching plan, then review it again. Plans and checkmarks are kept separately for each visit. Find other visits in Visit history.</p></div><button className="text-button" disabled={!contextConfirmed || plan.status === "loading"} onClick={() => void plan.restoreSaved()}>Restore saved plan</button><button className="text-button saved-danger" onClick={() => setConfirmForget(true)}>Remove saved copy</button></aside>}
    {confirmForget && <div className="care-notice"><p>Remove the saved browser copy of the plan and its checkmarks? Your current session plan stays available.</p><button className="text-button" onClick={() => { plan.forgetSaved(); setConfirmForget(false); }}>Remove saved plan now</button><button className="text-button" onClick={() => setConfirmForget(false)}>Keep saved plan</button></div>}
    {!session.liveAvailable && <p className="care-notice" role="status">Action plans need a server-side GEMINI_API_KEY. Your profile and conversation remain available.</p>}
    {!hasClinician && <p className="plan-empty" lang={session.locale} dir={languageDirection(session.locale)}>{t.empty} <Link href="/">Conversation <Icon name="arrow" size={16} /></Link></p>}
    {plan.status === "loading" && <p className="care-notice" role="status">Extracting explicit instructions, then independently rendering the patient text back into English. Your conversation stays available.</p>}
    {plan.error && <p className="care-error" role="alert">{plan.error}</p>}
    {result && <>
      <section className="plan-review"><div><h2>{plan.approved ? "Reviewed checklist" : "Review before using the checklist"}</h2><p>Check every original quote, translation, timing, duration, and English rendering. Gemini can miss a contradiction or mistranslate a step. Confirm the instructions with the clinician.</p><p>Changing the conversation, language, or profile clears the active plan. Continuing a visit with a saved plan keeps the earlier version in Visit history. Choose browser saving to keep this plan, its patient snapshot and checkmarks after refresh.</p></div>
        {blocked ? <p className="care-error" role="alert">Some instructions need clarification. Ask the clinician, share their reply in Conversation, and regenerate. The checklist stays paused.</p> : result.actions.length > 0 && <label className="review-confirmation"><input type="checkbox" checked={plan.approved} onChange={(event) => plan.approve(event.target.checked)} /><span>I checked every action against the clinician’s original instructions, the English renderings, and the patient’s restrictions. Activate checklist.</span></label>}
        {!plan.approved && result.actions.length > 0 && <p lang={session.locale} dir={languageDirection(session.locale)}>{t.waiting}</p>}
      </section>
      {result.actions.length === 0 ? <p className="plan-empty" lang={session.locale} dir={languageDirection(session.locale)}>{t.noActions}</p> : <>
        <section className="plan-progress" lang={session.locale} dir={languageDirection(session.locale)}><div><span>{t.progress}</span><strong>{doneCount}<small> / {result.actions.length}</small></strong></div><progress aria-label={t.progress} max={result.actions.length} value={doneCount} /><label>{t.day}<input type="date" value={day} max={localDay()} onChange={(event) => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value) && event.target.value <= localDay()) setDay(event.target.value); }} /></label></section>
        <p className="plan-personal-note" lang={session.locale} dir={languageDirection(session.locale)}>{t.instructions}</p>
        <ol className="plan-actions">{result.actions.map((action, index) => {
          const done = Boolean(plan.completed[`${action.id}:${occurrence(action.recurrence)}`]);
          const sourceIndex = turns.findIndex((turn) => turn.id === action.sourceTurnId);
          return <li className={done ? "is-complete" : ""} key={action.id}>
            <div className="plan-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><article>
              <div className="plan-step-heading"><span className="eyebrow">{action.kind}</span><span lang={session.locale} dir={languageDirection(session.locale)}>{action.recurrence === "daily" ? t.daily : action.recurrence === "once" ? t.once : t.directed}</span></div>
              <h3 lang={session.locale} dir={languageDirection(session.locale)}>{action.patientText}</h3><p className="plan-timing" lang={session.locale} dir={languageDirection(session.locale)}>{action.timingPatient}</p>
              {!action.canCheck && <p className="care-error" lang={session.locale} dir={languageDirection(session.locale)}>{t.pending}{action.clarificationPatient ? `: ${action.clarificationPatient}` : ""}</p>}
              <details className="plan-evidence"><summary>Source & English review · clinician turn {sourceIndex + 1}</summary><blockquote>{action.sourceQuote}</blockquote><dl><dt>English draft</dt><dd>{action.englishText}</dd><dt>Independent English rendering</dt><dd>{action.reverseText}</dd><dt>Timing rendering</dt><dd>{action.reverseTiming}</dd>{action.reverseClarification && <><dt>Clarification rendering</dt><dd>{action.reverseClarification}</dd></>}</dl>{action.flags.map((flag, flagIndex) => <p className={flag.severity === "blocking" ? "care-error" : "care-notice"} key={flagIndex}>{flag.message}</p>)}</details>
              <div className="plan-step-controls"><label lang={session.locale} dir={languageDirection(session.locale)}><input type="checkbox" checked={done} disabled={!plan.approved || !action.canCheck} onChange={() => plan.toggle(action.id, occurrence(action.recurrence))} />{t.done}</label><button className="text-button" disabled={!canSpeak} onClick={() => listen(action.id, `${action.patientText}. ${action.timingPatient}`)} lang={session.locale} dir={languageDirection(session.locale)}>{playing === action.id ? t.stop : t.listen}</button></div>
            </article>
          </li>;
        })}</ol>
      </>}
      {result.questions.length > 0 && <section className="plan-questions"><h2 lang={session.locale} dir={languageDirection(session.locale)}>{t.questions}</h2>{result.questions.map((question, index) => <article key={index}><p lang={session.locale} dir={languageDirection(session.locale)}>{question.patientText}</p><details><summary>English review & sources</summary><p>{question.englishText}</p><p>Independent rendering: {question.reverseText}</p>{question.sourceTurnIds.map((id) => <blockquote key={id}>Turn {turns.findIndex((turn) => turn.id === id) + 1}: {turns.find((turn) => turn.id === id)?.sourceText}</blockquote>)}</details><Link className="text-button" href="/" onClick={() => { session.selectSpeaker("participant"); session.visits.setDraft("participant", question.patientText); }}>Bring question to conversation <Icon name="arrow" size={16} /></Link></article>)}</section>}
      {plan.approved && <label className="plan-save-choice"><input type="checkbox" checked={plan.remember} onChange={(event) => { if (!event.target.checked) setConfirmForget(true); else plan.setRemember(true); }} /><span>Save this plan, patient snapshot and checkmarks with this visit<small>Optional, unencrypted storage. Includes all entered patient profile details, AI preferences, source quotes and translated instructions. Each visit saves separately. Removing the profile later does not remove this snapshot; delete the visit in Visit history to remove it.</small></span></label>}
      <footer className="plan-footer"><button className="primary-button" disabled={!plan.approved} onClick={download} lang={session.locale} dir={languageDirection(session.locale)}>{t.download}</button><p>Generated with Gemini · {(result.elapsedMs / 1000).toFixed(1)}s · Checkmarks are personal tracking. No notifications or reminders are scheduled.</p></footer>
    </>}
    {plan.storageMessage && <p role="status" className="care-notice">{plan.storageMessage}</p>}
    {message && <p role="status" className="care-notice">{message}</p>}
  </main>;
}
