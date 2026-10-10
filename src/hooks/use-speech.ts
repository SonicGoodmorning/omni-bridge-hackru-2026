"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } }
interface RecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => RecognitionInstance;

const MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone permission was denied. Allow access in your browser, or type your explanation below.",
  "service-not-allowed": "Speech recognition is not available in this browser. You can type your explanation below.",
  "audio-capture": "No microphone was found. Connect one, or type your explanation below.",
  "no-speech": "No speech was detected. Try again, or type your explanation below.",
  network: "Speech recognition could not connect. Check your connection, or type your explanation below.",
};

export function useSpeech({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [isListening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<RecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    setSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
    return () => {
      const instance = recognition.current;
      recognition.current = null;
      if (instance) {
        instance.onend = null;
        instance.onerror = null;
        instance.onresult = null;
        instance.abort();
      }
    };
  }, []);

  const start = useCallback((language = "en-US") => {
    if (recognition.current) return;
    const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) { setError("Speech recognition is not supported here. Use Chrome, or type your explanation below."); return; }
    setError(null);
    setInterim("");
    const instance = new Recognition();
    recognition.current = instance;
    instance.lang = language;
    instance.continuous = false;
    instance.interimResults = true;
    instance.onresult = (event) => {
      if (recognition.current !== instance) return;
      let draft = "";
      const final: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final.push(result[0].transcript.trim());
        else draft += result[0].transcript;
      }
      setInterim(draft);
      if (final.length) onTranscriptRef.current(final.join(" "));
    };
    instance.onerror = (event) => {
      if (recognition.current !== instance) return;
      if (event.error !== "aborted") setError(MESSAGES[event.error] || "Speech recognition stopped. You can still type your explanation below.");
      setListening(false);
      setInterim("");
    };
    instance.onend = () => {
      if (recognition.current !== instance) return;
      recognition.current = null;
      setListening(false);
      setInterim("");
    };
    try { instance.start(); setListening(true); }
    catch { recognition.current = null; setListening(false); setError("The microphone could not start. Try again, or type your explanation below."); }
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    const instance = recognition.current;
    recognition.current = null;
    if (instance) {
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      instance.abort();
    }
    setListening(false);
    setInterim("");
    setError(null);
  }, []);

  return { start, stop, cancel, isListening, interim, error, supported };
}
