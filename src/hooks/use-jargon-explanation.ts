"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { visitResultSchema, type VisitResult } from "@/lib/visits/types";

export function useJargonExplanation(locale: Locale, epoch: number) {
  const [text, setText] = useState("");
  const key = JSON.stringify([locale, epoch, text]);
  const currentKey = useRef(key); currentKey.current = key;
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ key: string; status: "idle" | "loading" | "ready" | "error"; result: VisitResult | null; error: string }>({ key, status: "idle", result: null, error: "" });
  useEffect(() => {
    controller.current?.abort(); controller.current = null;
    return () => { controller.current?.abort(); controller.current = null; };
  }, [key]);
  function cancel() {
    controller.current?.abort(); controller.current = null;
    setState({ key, status: "idle", result: null, error: "" });
  }
  async function explain() {
    if (!text.trim() || text.length > 4_000) return;
    controller.current?.abort();
    const active = new AbortController(); controller.current = active;
    const requestId = crypto.randomUUID();
    setState({ key, status: "loading", result: null, error: "" });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; active.abort(); }, 50_000);
    try {
      const response = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, signal: active.signal, body: JSON.stringify({ requestId, locale, text: text.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body?.error?.message === "string" ? body.error.message : "The explanation could not be completed. Please retry.");
      const parsed = visitResultSchema.safeParse(body);
      if (!parsed.success || parsed.data.requestId !== requestId || parsed.data.locale !== locale || parsed.data.sourceText !== text.trim() || parsed.data.speaker !== "clinician" || parsed.data.engine !== "live") throw new Error("The explanation did not match this request. Please retry.");
      if (currentKey.current === key && controller.current === active && !active.signal.aborted) setState({ key, status: "ready", result: parsed.data, error: "" });
    } catch (error) {
      if (currentKey.current === key && controller.current === active && (!active.signal.aborted || timedOut)) setState({ key, status: "error", result: null, error: timedOut ? "The explanation took too long. Please retry." : error instanceof Error ? error.message : "The explanation could not be completed. Please retry." });
    } finally {
      clearTimeout(timer);
      if (controller.current === active) controller.current = null;
    }
  }
  return { text, setText, explain, cancel, status: state.key === key ? state.status : "idle", result: state.key === key ? state.result : null, error: state.key === key ? state.error : "" };
}
