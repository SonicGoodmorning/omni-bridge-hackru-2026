"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useSpeech } from "@/hooks/use-speech";
import { type VisitSpeaker, type VisitTurn } from "@/hooks/use-visits";
import { useSession } from "./session-provider";
import { LANGUAGES, type Locale } from "@/lib/types";
import { SAMPLE_VISIT } from "@/lib/visits/sample";

const speechLocales: Record<Locale, string> = { "tr-TR": "tr-TR", "es-419": "es-MX", "pt-BR": "pt-BR", "hi-IN": "hi-IN", "zh-CN": "zh-CN" };
const patientCopy: Record<Locale, { title: string; description: string; input: string; placeholder: string; record: string; translate: string; shared: string }> = {
  "tr-TR": { title: "Sizin sıranız", description: "Sorunuzu veya yanıtınızı kendi dilinizde söyleyin ya da yazın.", input: "Mesajınız", placeholder: "Sorunuzu veya yanıtınızı buraya yazın…", record: "Konuşun", translate: "İngilizceye çevir", shared: "Paylaşılan konuşma" },
  "es-419": { title: "Tu turno", description: "Di o escribe tu pregunta o respuesta en tu idioma.", input: "Tu mensaje", placeholder: "Escribe tu pregunta o respuesta aquí…", record: "Hablar", translate: "Traducir al inglés", shared: "Conversación compartida" },
  "pt-BR": { title: "Sua vez", description: "Fale ou escreva sua pergunta ou resposta no seu idioma.", input: "Sua mensagem", placeholder: "Escreva sua pergunta ou resposta aqui…", record: "Falar", translate: "Traduzir para inglês", shared: "Conversa compartilhada" },
  "hi-IN": { title: "अब आपकी बारी", description: "अपना सवाल या जवाब अपनी भाषा में बोलें या लिखें।", input: "आपका संदेश", placeholder: "अपना सवाल या जवाब यहाँ लिखें…", record: "बोलें", translate: "अंग्रेज़ी में अनुवाद करें", shared: "साझा बातचीत" },
  "zh-CN": { title: "轮到您了", description: "请用您的语言说出或写下您的问题或回答。", input: "您的消息", placeholder: "在这里输入您的问题或回答…", record: "说话", translate: "翻译成英语", shared: "共享对话" },
};
const patientActions: Record<Locale, { stop: string; clear: string; review: string; share: string }> = {
  "tr-TR": { stop: "Kaydı durdur", clear: "Temizle", review: "Özgün mesajı, çeviriyi ve geri çeviriyi gözden geçirdim.", share: "Bu mesajı paylaş" },
  "es-419": { stop: "Detener grabación", clear: "Borrar", review: "He revisado el mensaje original, la traducción y la traducción inversa.", share: "Compartir este mensaje" },
  "pt-BR": { stop: "Parar gravação", clear: "Limpar", review: "Revisei a mensagem original, a tradução e a tradução de volta.", share: "Compartilhar esta mensagem" },
  "hi-IN": { stop: "रिकॉर्डिंग रोकें", clear: "मिटाएँ", review: "मैंने मूल संदेश, अनुवाद और वापस किए गए अनुवाद की समीक्षा कर ली है।", share: "यह संदेश साझा करें" },
  "zh-CN": { stop: "停止录音", clear: "清除", review: "我已查看原文、译文和回译。", share: "分享这条消息" },
};

function languageName(code: string) {
  return code === "en-US" ? "English" : LANGUAGES.find((item) => item.locale === code)?.nativeName ?? code;
}

function SpeakerGlyph({ speaker }: { speaker: VisitSpeaker }) {
  return <span className={`visit-speaker-glyph ${speaker}`} aria-hidden="true">{speaker === "clinician" ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="7" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 14v5m6-5v5M7 18h4m2 0h4" /></svg> : <Icon name="chat" size={23} />}</span>;
}

function ListenGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></svg>;
}

export function VisitsWorkspace() {
  const session = useSession();
  const controller = session.visits;
  const { state } = controller;
  const stateRef = useRef(state);
  stateRef.current = state;
  const [ready, setReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [recordingSpeaker, setRecordingSpeaker] = useState<VisitSpeaker | null>(null);
  const speechContext = useRef<{ speaker: VisitSpeaker; locale: Locale } | null>(null);
  const [playbackAvailable, setPlaybackAvailable] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackMessage, setPlaybackMessage] = useState("");
  const playbackSession = useRef(0);
  const language = LANGUAGES.find((item) => item.locale === state.locale) || LANGUAGES[0];
  const localized = patientCopy[state.locale];
  const busy = state.status === "loading";

  const onTranscript = useCallback((text: string) => {
    const context = speechContext.current;
    if (!context || stateRef.current.locale !== context.locale) return;
    const current = stateRef.current.drafts[context.speaker];
    controller.setDraft(context.speaker, `${current.trim()} ${text.trim()}`.trim());
  }, [controller.setDraft]);
  const speech = useSpeech({ onTranscript });

  const stopPlayback = useCallback(() => {
    playbackSession.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlayingId(null);
  }, []);

  useEffect(() => {
    setReady(true);
    setPlaybackAvailable("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => { playbackSession.current += 1; if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  function cancelRecording() {
    speechContext.current = null;
    speech.cancel();
    setRecordingSpeaker(null);
  }

  useEffect(() => {
    speechContext.current = null;
    speech.cancel();
    setRecordingSpeaker(null);
    stopPlayback();
    setPlaybackMessage("");
  // Global resets and settings also invalidate browser audio sessions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionEpoch]);

  function record(speaker: VisitSpeaker) {
    if (speech.isListening) { speech.stop(); return; }
    cancelRecording();
    controller.cancel();
    stopPlayback();
    speechContext.current = { speaker, locale: state.locale };
    setRecordingSpeaker(speaker);
    speech.start(speaker === "clinician" ? "en-US" : speechLocales[state.locale]);
  }

  function useNextSample() {
    cancelRecording();
    stopPlayback();
    controller.nextSample();
  }

  function openPrepared() {
    cancelRecording();
    stopPlayback();
    setPlaybackMessage("");
    controller.openPrepared();
  }

  function listen(turn: VisitTurn) {
    if (!playbackAvailable) return;
    if (playingId === turn.id) { stopPlayback(); return; }
    cancelRecording();
    stopPlayback();
    const synth = window.speechSynthesis;
    const requested = turn.targetLanguage === "es-419" ? "es-MX" : turn.targetLanguage;
    const voices = synth.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === requested.toLowerCase()) || voices.find((item) => item.lang.split("-")[0] === requested.split("-")[0]);
    if (!voice) { setPlaybackMessage(`A ${languageName(turn.targetLanguage)} voice is not available in this browser. The translated text is still available.`); return; }
    setPlaybackMessage("");
    const utterance = new SpeechSynthesisUtterance(turn.translation);
    const session = playbackSession.current;
    utterance.lang = requested;
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onend = () => { if (playbackSession.current === session) setPlayingId((current) => current === turn.id ? null : current); };
    utterance.onerror = () => { if (playbackSession.current !== session) return; setPlayingId(null); setPlaybackMessage("Audio playback stopped. You can read the translated text instead."); };
    setPlayingId(turn.id);
    synth.speak(utterance);
  }

  const result = state.result;
  const sourceName = result ? languageName(result.sourceLanguage) : "English";
  const targetName = result ? languageName(result.targetLanguage) : language.nativeName;
  const preparedOnly = state.turns.length > 0 && state.turns.every((turn) => turn.prepared);

  return <div className="visits-shell" inert={!ready}>
      {helpOpen && <section className="help-panel visit-help"><div><strong>Both voices stay visible.</strong><p>Review each turn before sharing. Use fictional or public demo text only. Work stays in session memory when you move to Document guide; reset or refresh clears it. Live text goes to Gemini, and browser speech may use a remote service.</p></div><button className="icon-button" aria-label="Close visit information" onClick={() => setHelpOpen(false)}><Icon name="close" /></button></section>}
      <main className="visits-main">

        <div className="visit-introduction"><div><div className="eyebrow">TWO-WAY CONVERSATION <span>·</span> SYNTHETIC PRACTICE</div><h1>A conversation, both ways.</h1><p>The clinician speaks English. The participant speaks {language.nativeName}. Each turn is reviewed before sharing.</p></div><span className="visit-pair-label"><span>EN</span><Icon name="bridge" size={24} /><span>{language.short}</span></span></div>

        {session.questionOrigin && <aside className="question-origin" aria-label="Question source"><div><span className="eyebrow">FROM DOCUMENT GUIDE</span><strong>{session.questionOrigin.title}</strong><blockquote>{session.questionOrigin.quote}</blockquote></div><Link className="text-button" onClick={() => session.setDocumentView("source")} href={`/#source-${session.questionOrigin.paragraphId}`}>Return to source<Icon name="arrow" size={14} /></Link><p>The participant can edit this question. Translate it here for human discussion; the app does not answer it.</p></aside>}
        <div className="visit-sample-bar"><div><Icon name="document" size={17} /><span><strong>Try the fictional CLEAR visit</strong><small>{SAMPLE_VISIT.length} prepared turns. No live model calls in sample mode.</small></span></div><div className="visit-sample-actions"><button className="text-button" onClick={useNextSample}>Use next sample turn <span className="visit-sample-count">{state.sampleCursor % SAMPLE_VISIT.length + 1}/{SAMPLE_VISIT.length}</span><Icon name="arrow" size={14} /></button><button className="text-button" onClick={openPrepared}>Open prepared conversation</button></div></div>

        <div className="visit-speakers">
          {(["clinician", "participant"] as const).map((speaker) => {
            const participant = speaker === "participant";
            const listening = speech.isListening && recordingSpeaker === speaker;
            const pending = busy && state.activeSpeaker === speaker;
            return <section className={`visit-composer ${speaker}`} key={speaker} aria-label={participant ? "Participant speaking" : "Clinician speaking"}>
              <div className="visit-role-heading"><SpeakerGlyph speaker={speaker} /><div><div className="eyebrow">{participant ? "PARTICIPANT" : "CLINICIAN"}<span>· {participant ? language.nativeName : "English"}</span></div><h2 lang={participant ? state.locale : "en"}>{participant ? localized.title : "Your turn to explain"}</h2></div><span className={`visit-speaking-state ${listening ? "active" : ""}`}>{listening ? "Listening" : participant ? `${language.short} → EN` : `EN → ${language.short}`}</span></div>
              <p className="visit-composer-description" lang={participant ? state.locale : "en"}>{participant ? localized.description : "Say or type your explanation, then check the words before translating."}</p>
              <label className="sr-only" htmlFor={`visit-${speaker}-text`}>{participant ? "Participant message" : "Clinician message"}</label>
              <textarea id={`visit-${speaker}-text`} value={state.drafts[speaker]} readOnly={speech.isListening} onChange={(event) => controller.setDraft(speaker, event.target.value)} maxLength={4000} lang={participant ? state.locale : "en"} placeholder={participant ? localized.placeholder : "Type an explanation or ask the participant a question…"} aria-describedby={`visit-${speaker}-hint`} />
              <div className="visit-input-footer"><span>{state.drafts[speaker].length.toLocaleString()} / 4,000</span>{state.drafts[speaker] && <button className="text-button" disabled={speech.isListening} onClick={() => controller.setDraft(speaker, "")} lang={participant ? state.locale : "en"}>{participant ? patientActions[state.locale].clear : "Clear"}</button>}</div>
              <div className="visit-record-row"><button className={`microphone-button ${listening ? "listening" : ""}`} aria-label={listening ? "Stop recording" : `Record ${speaker}`} aria-pressed={listening} disabled={!speech.supported || busy || (speech.isListening && !listening)} onClick={() => record(speaker)}><Icon name={listening ? "stop" : "mic"} size={16} /><span lang={participant ? state.locale : "en"}>{listening ? participant ? patientActions[state.locale].stop : "Stop recording" : participant ? localized.record : "Speak in English"}</span></button><span id={`visit-${speaker}-hint`}>{listening ? "Finish speaking, then stop and review." : speech.supported ? "Speech adds to your editable draft." : "Microphone unavailable. You can type instead."}</span></div>
              {listening && speech.interim && <p className="visit-interim" lang={participant ? state.locale : "en"} aria-live="polite">{speech.interim}</p>}
              {recordingSpeaker === speaker && speech.error && <p className="inline-error" role="alert">{speech.error}</p>}
              {state.drafts[speaker].length > 4000 && <p className="inline-error" role="alert">This message is longer than 4,000 characters. Shorten the draft before translating; your transcript has been kept.</p>}
              <button className="primary-button visit-translate" disabled={busy || speech.isListening || !state.drafts[speaker].trim() || state.drafts[speaker].length > 4000} aria-label={participant ? "Translate for clinician" : "Translate for participant"} onClick={() => { stopPlayback(); void controller.translate(speaker); }}>{pending ? <><span className="spinner" />Translating…</> : <><span lang={participant ? state.locale : "en"}>{participant ? localized.translate : `Translate to ${language.nativeName}`}</span><Icon name="arrow" size={16} /></>}</button>
            </section>;
          })}
        </div>

        {(busy || state.error || result) && <section className="visit-review" aria-labelledby="visit-review-heading" aria-busy={busy}>
          <div className="visit-section-heading"><h2 id="visit-review-heading"><Icon name="eye" size={18} />Review this turn</h2><span>Only shared turns enter the conversation.</span></div>
          {busy ? <div className="visit-loading" role="status"><span className="spinner" /><p>Translating, then making a separate reverse rendering for review.</p><button className="text-button" onClick={controller.cancel}>Cancel translation</button></div> : state.error ? <div className="error-state" role="alert"><Icon name="warning" size={20} /><div><strong>This turn has not been shared.</strong><p>{state.error}</p><button className="text-button" onClick={() => state.activeSpeaker && void controller.translate(state.activeSpeaker)}>Try translation again<Icon name="arrow" size={14} /></button></div></div> : result ? <div className="visit-review-content">
            <div className="visit-review-direction"><span>{result.speaker === "clinician" ? "Clinician" : "Participant"} <Icon name="arrow" size={13} /> {result.speaker === "clinician" ? "Participant" : "Clinician"}</span><span className={`result-engine ${result.engine === "sample" ? "sample" : ""}`}>{result.engine === "sample" ? "Prepared sample" : `Gemini · ${(result.elapsedMs / 1000).toFixed(1)}s`}</span></div>
            <div className="visit-review-texts"><div><div className="eyebrow">TRANSLATION · {targetName}</div><p lang={result.targetLanguage}>{result.translation}</p></div><div><div className="eyebrow">REVERSE RENDERING · {sourceName}</div><p lang={result.sourceLanguage}>{result.reverseTranslation}</p></div></div>
            <details className="visit-original"><summary>Original {sourceName} message</summary><p lang={result.sourceLanguage}>{result.sourceText}</p></details>
            <p className="visit-review-caveat">{result.engine === "sample" ? "Prepared review aid." : "AI-generated review aid."} A similar reverse rendering does not establish translation accuracy.</p>
            {result.flags.length > 0 && <div className="review-flags" aria-label="Visit review notes">{result.flags.map((flag, index) => <div key={`${flag.code}-${index}`} className={`review-flag ${flag.severity}`}><Icon name={flag.severity === "info" ? "eye" : "warning"} size={15} /><div><p>{flag.message}</p>{flag.sourceSnippet && <blockquote>{flag.sourceSnippet}</blockquote>}</div></div>)}</div>}
            <div className="visit-share-row"><label className="review-confirmation"><input type="checkbox" aria-label="I have reviewed the original, translation, and reverse rendering." checked={state.reviewConfirmed} disabled={!result.canRelease} onChange={(event) => controller.setReviewConfirmed(event.target.checked)} /><span lang={result.speaker === "participant" ? state.locale : "en"}>{result.speaker === "participant" ? <>{patientActions[state.locale].review}<small className="visit-english-aid">I have reviewed the original, translation, and reverse rendering.</small></> : "I have reviewed the original, translation, and reverse rendering."}</span></label><button className="primary-button" aria-label="Share this turn" disabled={!state.reviewConfirmed || !result.canRelease} onClick={controller.share}><span lang={result.speaker === "participant" ? state.locale : "en"}>{result.speaker === "participant" ? patientActions[state.locale].share : "Share this turn"}</span><Icon name="arrow" size={16} /></button></div>
            {!result.canRelease && <p className="inline-error">This turn has a blocking review note and cannot be shared. Edit the original and try again.</p>}
          </div> : null}
        </section>}

        <section className="visit-conversation" aria-label="Shared conversation">
          <div className="visit-section-heading"><div><h2>Shared conversation</h2><p lang={state.locale}>{localized.shared}</p></div><span>{state.turns.length === 0 ? "Nothing shared yet" : `${state.turns.length} ${state.turns.length === 1 ? "turn" : "turns"}`}</span></div>
          {preparedOnly && <p className="visit-prepared-notice"><Icon name="eye" size={16} />Prepared sample conversation. These {SAMPLE_VISIT.length} fixture turns were loaded together; no live translation or individual review took place.</p>}
          {state.turns.length === 0 ? <div className="visit-conversation-empty"><div className="visit-empty-line"><SpeakerGlyph speaker="clinician" /><span /><SpeakerGlyph speaker="participant" /></div><h3>Two voices. One conversation.</h3><p>Translate a message above, review its wording, and share it here.<br />Each turn keeps the speaker’s original words alongside the translation.</p></div> : <ol className="visit-turns">{state.turns.map((turn, index) => <li key={turn.id}><article className={`visit-turn ${turn.speaker}`} data-speaker={turn.speaker} data-prepared={turn.prepared ? "true" : "false"}><div className="visit-turn-heading"><span><SpeakerGlyph speaker={turn.speaker} /><strong>{turn.speaker === "clinician" ? "Clinician" : "Participant"}</strong><small>TURN {String(index + 1).padStart(2, "0")}</small></span><span className="visit-turn-status">{turn.prepared ? "Prepared sample" : turn.engine === "sample" ? "Reviewed sample" : "Reviewed & shared"}</span></div><div className="visit-turn-texts"><div><div className="eyebrow">ORIGINAL · {languageName(turn.sourceLanguage)}</div><p lang={turn.sourceLanguage}>{turn.sourceText}</p></div><div><div className="eyebrow">TRANSLATION · {languageName(turn.targetLanguage)}</div><p lang={turn.targetLanguage}>{turn.translation}</p></div></div><div className="visit-turn-actions"><span><Icon name="arrow" size={12} />{turn.speaker === "clinician" ? "For participant" : "For clinician"}</span><button className="text-button" aria-label={`${playingId === turn.id ? "Stop audio for" : "Listen to translation of"} turn ${index + 1}`} disabled={!playbackAvailable} onClick={() => listen(turn)}>{playingId === turn.id ? <Icon name="stop" size={14} /> : <ListenGlyph />}{playingId === turn.id ? "Stop audio" : "Listen"}</button></div></article></li>)}</ol>}
          {playbackMessage && <p className="visit-audio-message" role="status">{playbackMessage}</p>}
        </section>
        <footer className="visit-footer"><span><Icon name="help" size={14} />Synthetic education prototype · No real patient information</span><button className="text-button" onClick={() => setHelpOpen(!helpOpen)}>Privacy & limitations</button><span>Turns stay in this session until you reset or refresh.</span></footer>
      </main>
  </div>;
}
