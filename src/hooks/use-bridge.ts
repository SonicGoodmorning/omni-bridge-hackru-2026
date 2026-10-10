"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { bridgeReducer, initialBridgeState } from "@/lib/bridge-state";
import type { BridgeMode, BridgeRequest, BridgeResult, Engine, Locale } from "@/lib/types";
import { bridgeResultSchema } from "@/lib/bridge/schema";

export function useBridge(liveAvailable: boolean) {
  const [state, dispatch] = useReducer(bridgeReducer, liveAvailable, initialBridgeState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const configure = useCallback((patch: Parameters<typeof bridgeReducer>[1] & { type: "configure" }) => {
    if (Object.entries(patch.patch).every(([key, value]) => stateRef.current[key as keyof typeof state] === value)) return;
    controller.current?.abort();
    dispatch(patch);
  }, []);

  const generate = useCallback(async () => {
    controller.current?.abort();
    const current = stateRef.current;
    const abort = new AbortController();
    controller.current = abort;
    const requestId = crypto.randomUUID();
    const payload: BridgeRequest = {
      requestId, mode: current.mode, locale: current.locale, engine: current.engine,
      ...(current.mode === "consent" ? { sectionId: current.sectionId } : { text: current.text.trim() }),
    };
    dispatch({ type: "start", requestId });
    const timeout = setTimeout(() => abort.abort("deadline"), 46_000);
    try {
      const response = await fetch("/api/bridge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "The explanation could not be prepared. Please try again.");
      const validated = bridgeResultSchema.safeParse(data);
      if (!validated.success || validated.data.requestId !== requestId) {
        throw new Error("The response was incomplete. Nothing has been shared. Please try again.");
      }
      const result: BridgeResult = validated.data;
      if (!abort.signal.aborted) dispatch({ type: "success", result });
    } catch (error) {
      if (abort.signal.aborted && abort.signal.reason !== "deadline") return;
      dispatch({ type: "failure", requestId, message: abort.signal.aborted
        ? "This request took too long. Nothing has been shared. Please retry."
        : error instanceof Error ? error.message : "A connection error occurred. Please retry." });
    } finally {
      clearTimeout(timeout);
      if (controller.current === abort) controller.current = null;
    }
  }, []);

  const cancel = useCallback(() => { controller.current?.abort(); dispatch({ type: "cancel" }); }, []);
  const reset = useCallback(() => { controller.current?.abort(); dispatch({ type: "reset" }); }, []);

  return {
    state,
    setMode: (mode: BridgeMode) => configure({ type: "configure", patch: { mode } }),
    setLocale: (locale: Locale) => configure({ type: "configure", patch: { locale } }),
    setSection: (sectionId: string) => configure({ type: "configure", patch: { sectionId } }),
    setText: (text: string) => configure({ type: "configure", patch: { text } }),
    setEngine: (engine: Engine) => configure({ type: "configure", patch: { engine } }),
    setReviewConfirmed: (value: boolean) => dispatch({ type: "review", value }),
    release: () => dispatch({ type: "release" }),
    generate, cancel, reset,
  };
}
