"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useJargonExplanation } from "@/hooks/use-jargon-explanation";
import { LANGUAGES, languageDirection, speechLocale } from "@/lib/types";
import { Icon } from "./icons";
import { useSession } from "./session-provider";

export function JargonWorkspace() {
  const session = useSession();
  const explanation = useJargonExplanation(session.locale, session.sessionEpoch);
  const language = LANGUAGES.find((item) => item.locale === session.locale)!;
  const plainEnglish = session.locale === "en-US";
  const [audioMessage, setAudioMessage] = useState("");
  useEffect(() => { window.speechSynthesis?.cancel(); setAudioMessage(""); return () => window.speechSynthesis?.cancel(); }, [explanation.result]);
  function speak() {
    if (!explanation.result) return;
    if (!("speechSynthesis" in window)) { setAudioMessage("Audio is unavailable in this browser. The written explanation is ready to read."); return; }
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === speechLocale(session.locale).toLowerCase()) ?? voices.find((item) => item.lang.split("-")[0] === session.locale.split("-")[0]);
    if (!voice) { setAudioMessage("No voice is available for this language on this device. Use the written explanation."); return; }
    const utterance = new SpeechSynthesisUtterance(explanation.result.translation);
    utterance.lang = speechLocale(session.locale); utterance.voice = voice;
    utterance.onerror = () => setAudioMessage("Audio could not finish. Use the written explanation.");
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setAudioMessage("");
  }
  return <main className="care-workspace jargon-workspace">
    <header className="care-heading"><div><p className="eyebrow">UNDERSTAND THE WORDS</p><h1>Explain medical jargon</h1><p>Understand a term or sentence in {plainEnglish ? "everyday English" : language.name}.</p></div><Link href="/" className="text-button">Back to conversation <Icon name="arrow" size={16} /></Link></header>
    <div className="jargon-layout">
      <form className="jargon-composer" onSubmit={(event) => { event.preventDefault(); void explanation.explain(); }}>
        <label htmlFor="jargon-question">Medical term or question in English</label>
        <p>Use fictional or public text. Only the text you enter and the selected language go to Gemini; your patient profile is not included.</p>
        <textarea className="resize-none" id="jargon-question" value={explanation.text} onChange={(event) => explanation.setText(event.target.value)} maxLength={4_000} rows={7} placeholder="What does idiopathic tachycardia mean?" lang="en" dir="ltr" />
        <div className="jargon-input-meta"><span>{explanation.text.length.toLocaleString()} / 4,000</span><button type="button" className="text-button" disabled={!explanation.text} onClick={() => explanation.setText("")}>Clear</button></div>
        <div className="jargon-actions"><button type="submit" className="primary-button" disabled={!session.liveAvailable || !explanation.text.trim() || explanation.status === "loading"}><Icon name="arrow" size={17} />{explanation.status === "loading" ? "Explaining…" : plainEnglish ? "Explain in plain English" : `Explain in ${language.name}`}</button>{explanation.status === "loading" && <button className="text-button" type="button" onClick={explanation.cancel}>Cancel</button>}</div>
        {!session.liveAvailable && <p className="care-error" role="status">Live explanations are unavailable. Configure the server Gemini API key to use this tool. English prepared conversations are available in Conversation.</p>}
        {explanation.error && <p className="care-error" role="alert">{explanation.error}</p>}
      </form>
      <section className="jargon-result" aria-label="Plain-language explanation" aria-live="polite" aria-busy={explanation.status === "loading"}>
        <p className="eyebrow">{plainEnglish ? "PLAIN ENGLISH" : language.nativeName}</p>
        {explanation.result ? <>
          {explanation.result.flags.some((flag) => flag.severity !== "info") && <p className="care-error" role="status">This explanation needs closer review. Check the notes below for ambiguity or changed details.</p>}
          <p className="jargon-explanation" lang={session.locale} dir={languageDirection(session.locale)}>{explanation.result.translation}</p>
          <div className="jargon-actions"><button className="text-button" onClick={speak}><Icon name="mic" size={16} />Read aloud</button><button className="text-button" onClick={() => window.speechSynthesis?.cancel()}>Stop audio</button></div>
          {audioMessage && <p role="status" className="jargon-small">{audioMessage}</p>}
          <details className="jargon-review"><summary>English rendering and review notes</summary><p lang="en" dir="ltr">{explanation.result.reverseTranslation}</p><ul>{explanation.result.flags.map((flag, index) => <li key={`${flag.code}-${index}`}>{flag.message}</li>)}</ul></details>
        </> : <div className="jargon-empty"><h2>{explanation.status === "loading" ? "Finding clearer words…" : "Your explanation appears here."}</h2><p>{explanation.status === "loading" ? "Your explanation and independent English rendering are being prepared." : "Enter the wording you want to understand. Your explanation will appear here in the language selected above."}</p></div>}
        <p className="jargon-boundary">General AI explanation. Your care team can explain what it means for your own health. Explanations stay separate from clinician messages and action plans.</p>
      </section>
    </div>
  </main>;
}
