"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Engine, Locale } from "@/lib/types";
import { SAMPLE_VISIT } from "@/lib/visits/sample";
import { visitResultSchema, type VisitRequest, type VisitResult } from "@/lib/visits/types";

export type VisitSpeaker = "clinician" | "participant";
export interface VisitTurn {
  id: string;
  speaker: VisitSpeaker;
  sourceText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  engine: Engine;
  prepared: boolean;
}

interface VisitState {
  locale: Locale;
  engine: Engine;
  drafts: Record<VisitSpeaker, string>;
  status: "idle" | "loading" | "ready" | "error";
  result: VisitResult | null;
  error: string | null;
  activeRequestId: string | null;
  activeSpeaker: VisitSpeaker | null;
  reviewConfirmed: boolean;
  turns: VisitTurn[];
  sampleCursor: number;
}

type Action =
  | { type: "draft"; speaker: VisitSpeaker; text: string }
  | { type: "configure"; locale?: Locale; engine?: Engine }
  | { type: "start"; speaker: VisitSpeaker; requestId: string }
  | { type: "success"; result: VisitResult }
  | { type: "failure"; requestId: string; error: string }
  | { type: "review"; value: boolean }
  | { type: "share" }
  | { type: "cancel" }
  | { type: "reset" }
  | { type: "next-sample" }
  | { type: "prepared"; turns: VisitTurn[] };

const clearReview = { status: "idle" as const, result: null, error: null, activeRequestId: null, activeSpeaker: null, reviewConfirmed: false };
const emptyDrafts = () => ({ clinician: "", participant: "" });
function initialState(liveAvailable: boolean): VisitState {
  return { locale: "tr-TR", engine: liveAvailable ? "live" : "sample", drafts: emptyDrafts(), ...clearReview, turns: [], sampleCursor: 0 };
}

function reducer(state: VisitState, action: Action): VisitState {
  switch (action.type) {
    case "draft": return { ...state, ...clearReview, drafts: { ...state.drafts, [action.speaker]: action.text } };
    case "configure": return { ...state, ...clearReview, locale: action.locale ?? state.locale, engine: action.engine ?? state.engine, drafts: emptyDrafts(), turns: [], sampleCursor: 0 };
    case "start": return { ...state, ...clearReview, status: "loading", activeSpeaker: action.speaker, activeRequestId: action.requestId };
    case "success":
      if (state.activeRequestId !== action.result.requestId || state.locale !== action.result.locale || state.engine !== action.result.engine || state.activeSpeaker !== action.result.speaker || state.drafts[action.result.speaker].trim() !== action.result.sourceText) return state;
      return { ...state, status: "ready", result: action.result, error: null, reviewConfirmed: false, activeRequestId: null };
    case "failure": return state.activeRequestId === action.requestId ? { ...state, status: "error", result: null, error: action.error, activeRequestId: null, reviewConfirmed: false } : state;
    case "review": return { ...state, reviewConfirmed: Boolean(action.value && state.result?.canRelease && state.status === "ready") };
    case "share": {
      if (!state.result?.canRelease || !state.reviewConfirmed || state.status !== "ready" || state.turns.some((turn) => turn.id === state.result?.requestId)) return state;
      const result = state.result;
      return { ...state, ...clearReview, drafts: { ...state.drafts, [result.speaker]: "" }, turns: [...state.turns, { id: result.requestId, speaker: result.speaker, sourceText: result.sourceText, translation: result.translation, sourceLanguage: result.sourceLanguage, targetLanguage: result.targetLanguage, engine: result.engine, prepared: false }] };
    }
    case "cancel": return { ...state, ...clearReview };
    case "reset": return { ...state, ...clearReview, drafts: emptyDrafts(), turns: [], sampleCursor: 0 };
    case "next-sample": {
      const turn = SAMPLE_VISIT[state.sampleCursor % SAMPLE_VISIT.length];
      return { ...state, ...clearReview, engine: "sample", turns: state.engine === "sample" ? state.turns : [], drafts: { ...(state.engine === "sample" ? state.drafts : emptyDrafts()), [turn.speaker]: turn.speaker === "clinician" ? turn.english : turn.text[state.locale] }, sampleCursor: state.sampleCursor + 1 };
    }
    case "prepared": return { ...state, ...clearReview, engine: "sample", drafts: emptyDrafts(), turns: action.turns, sampleCursor: 0 };
  }
}

export function useVisits(liveAvailable: boolean) {
  const [state, dispatch] = useReducer(reducer, liveAvailable, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const invalidate = useCallback((action: Action) => {
    controller.current?.abort();
    controller.current = null;
    dispatch(action);
  }, []);
  const setDraft = useCallback((speaker: VisitSpeaker, text: string) => {
    if (stateRef.current.drafts[speaker] !== text) invalidate({ type: "draft", speaker, text });
  }, [invalidate]);
  const setLocale = useCallback((locale: Locale) => {
    if (stateRef.current.locale !== locale) invalidate({ type: "configure", locale });
  }, [invalidate]);
  const setEngine = useCallback((engine: Engine) => {
    if (stateRef.current.engine !== engine) invalidate({ type: "configure", engine });
  }, [invalidate]);

  const translate = useCallback(async (speaker: VisitSpeaker) => {
    controller.current?.abort();
    const current = stateRef.current;
    const text = current.drafts[speaker].trim();
    if (!text) return;
    const abort = new AbortController();
    controller.current = abort;
    const requestId = crypto.randomUUID();
    const payload: VisitRequest = { requestId, locale: current.locale, engine: current.engine, speaker, text };
    dispatch({ type: "start", speaker, requestId });
    const timeout = setTimeout(() => abort.abort("deadline"), 46_000);
    try {
      const response = await fetch("/api/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "This turn could not be translated. Please try again.");
      const parsed = visitResultSchema.safeParse(data);
      if (!parsed.success || parsed.data.requestId !== requestId || parsed.data.locale !== payload.locale || parsed.data.engine !== payload.engine || parsed.data.speaker !== payload.speaker || parsed.data.sourceText !== payload.text) throw new Error("The response did not match this message. Nothing has been shared. Please retry.");
      if (!abort.signal.aborted) dispatch({ type: "success", result: parsed.data });
    } catch (error) {
      if (abort.signal.aborted && abort.signal.reason !== "deadline") return;
      dispatch({ type: "failure", requestId, error: abort.signal.aborted ? "This request took too long. Nothing has been shared. Please retry." : error instanceof Error ? error.message : "A connection error occurred. Please retry." });
    } finally {
      clearTimeout(timeout);
      if (controller.current === abort) controller.current = null;
    }
  }, []);

  const openPrepared = useCallback(() => {
    const locale = stateRef.current.locale;
    const turns: VisitTurn[] = SAMPLE_VISIT.map((turn) => ({ id: `prepared-${locale}-${turn.id}`, speaker: turn.speaker, sourceText: turn.speaker === "clinician" ? turn.english : turn.text[locale], translation: turn.speaker === "clinician" ? turn.text[locale] : turn.english, sourceLanguage: turn.speaker === "clinician" ? "en-US" : locale, targetLanguage: turn.speaker === "clinician" ? locale : "en-US", engine: "sample", prepared: true }));
    invalidate({ type: "prepared", turns });
  }, [invalidate]);

  return { state, setDraft, setLocale, setEngine, translate, openPrepared,
    nextSample: () => invalidate({ type: "next-sample" }),
    cancel: () => invalidate({ type: "cancel" }),
    reset: () => invalidate({ type: "reset" }),
    setReviewConfirmed: (value: boolean) => dispatch({ type: "review", value }),
    share: () => dispatch({ type: "share" }),
  };
}
