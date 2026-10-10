"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Engine, Locale } from "@/lib/types";
import { documentResultSchema, matchesDocumentRequest, type DocumentRequest, type DocumentResult } from "@/lib/documents/types";

export interface DocumentState {
  locale: Locale;
  engine: Engine;
  text: string;
  acknowledged: boolean;
  status: "idle" | "loading" | "ready" | "error";
  result: DocumentResult | null;
  released: DocumentResult | null;
  error: string | null;
  reviewConfirmed: boolean;
  activeRequestId: string | null;
}

const cleared = { status: "idle" as const, result: null, released: null, error: null, reviewConfirmed: false, activeRequestId: null };
type Action =
  | { type: "configure"; patch: Partial<Pick<DocumentState, "locale" | "engine" | "text" | "acknowledged">> }
  | { type: "start"; requestId: string }
  | { type: "success"; result: DocumentResult }
  | { type: "failure"; requestId: string; message: string }
  | { type: "review"; value: boolean }
  | { type: "release" }
  | { type: "reset" }
  | { type: "cancel" };

function initialState(liveAvailable: boolean): DocumentState {
  return { locale: "tr-TR", engine: liveAvailable ? "live" : "sample", text: "", acknowledged: false, ...cleared };
}

function reducer(state: DocumentState, action: Action): DocumentState {
  switch (action.type) {
    case "configure": return { ...state, ...action.patch, ...cleared };
    case "start": return { ...state, ...cleared, status: "loading", activeRequestId: action.requestId };
    case "success":
      if (state.activeRequestId !== action.result.requestId || state.locale !== action.result.locale || state.engine !== action.result.engine) return state;
      return { ...state, status: "ready", result: action.result, error: null, activeRequestId: null, reviewConfirmed: false };
    case "failure": return state.activeRequestId === action.requestId ? { ...state, status: "error", result: null, released: null, error: action.message, reviewConfirmed: false, activeRequestId: null } : state;
    case "review": return { ...state, reviewConfirmed: Boolean(action.value && state.status === "ready" && state.result?.canRelease) };
    case "release": return state.status === "ready" && state.result?.canRelease && state.reviewConfirmed ? { ...state, released: state.result } : state;
    case "cancel": return { ...state, ...cleared };
    case "reset": return { ...initialState(state.engine === "live"), locale: state.locale, engine: state.engine };
  }
}

export function useDocuments(liveAvailable: boolean) {
  const [state, dispatch] = useReducer(reducer, liveAvailable, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const configure = useCallback((patch: Partial<Pick<DocumentState, "locale" | "engine" | "text" | "acknowledged">>) => {
    if (Object.entries(patch).every(([key, value]) => stateRef.current[key as keyof DocumentState] === value)) return;
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "configure", patch });
  }, []);

  const generate = useCallback(async (kind: "visit-summary" | "paste") => {
    controller.current?.abort();
    const current = stateRef.current;
    const requestId = crypto.randomUUID();
    dispatch({ type: "start", requestId });
    if (kind === "paste" && (!current.acknowledged || !current.text.trim() || current.text.length > 4_000 || current.engine === "sample")) {
      dispatch({ type: "failure", requestId, message: current.engine === "sample"
        ? "Pasted text needs Live Gemini. Sample mode only supports the prepared fictional documents."
        : "Use 1–4,000 characters of public or fictional English text, then confirm its source." });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    const payload: DocumentRequest = {
      requestId, locale: current.locale, engine: current.engine,
      source: kind === "visit-summary" ? { kind: "fixture", id: "visit-summary" } : { kind: "paste", text: current.text.trim(), acknowledged: true },
    };
    const timeout = setTimeout(() => abort.abort("deadline"), 46_000);
    try {
      const response = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: abort.signal });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = (data as { error?: { message?: unknown } })?.error?.message;
        throw new Error(typeof message === "string" ? message : "This explanation could not be prepared. Please retry.");
      }
      const parsed = documentResultSchema.safeParse(data);
      if (!parsed.success || !matchesDocumentRequest(parsed.data, payload)) throw new Error("The response did not match this document. Nothing has been shared. Please retry.");
      if (!abort.signal.aborted) dispatch({ type: "success", result: parsed.data });
    } catch (error) {
      if (abort.signal.aborted && abort.signal.reason !== "deadline") return;
      dispatch({ type: "failure", requestId, message: abort.signal.aborted ? "This request took too long. Nothing has been shared. Please retry." : error instanceof SyntaxError ? "The response was incomplete. Nothing has been shared. Please retry." : error instanceof Error ? error.message : "A connection error occurred. Please retry." });
    } finally {
      clearTimeout(timeout);
      if (controller.current === abort) controller.current = null;
    }
  }, []);

  const cancel = useCallback(() => { controller.current?.abort(); controller.current = null; dispatch({ type: "cancel" }); }, []);
  const reset = useCallback(() => { controller.current?.abort(); controller.current = null; dispatch({ type: "reset" }); }, []);
  return { state, generate, cancel, reset,
    setLocale: (locale: Locale) => configure({ locale }),
    setEngine: (engine: Engine) => configure({ engine }),
    setText: (text: string) => configure({ text, acknowledged: false }),
    setAcknowledged: (acknowledged: boolean) => configure({ acknowledged }),
    setReviewConfirmed: (value: boolean) => dispatch({ type: "review", value }),
    release: () => dispatch({ type: "release" }),
  };
}
