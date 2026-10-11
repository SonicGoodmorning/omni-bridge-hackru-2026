"use client";

import { useEffect, useRef, useState } from "react";
import type { VisitTurn } from "./use-visits";
import type { Locale } from "@/lib/types";
import type { PatientContext } from "@/lib/patient/profile";
import { actionPlanRequestSchema, actionPlanResultSchema, type ActionPlanResult } from "@/lib/action-plan/types";

import { LEGACY_PLAN_STORAGE_KEY, savedPlanSchema, planFingerprint, type SavedPlan } from "@/lib/action-plan/storage";

type VisitPlanBinding = { visitId: string | null; patientId: string; savedPlan: SavedPlan | null;
  save: (id: string, value: SavedPlan) => boolean; remove: (id: string) => boolean };
export function useActionPlan(turns: VisitTurn[], locale: Locale, context: PatientContext | undefined, binding: VisitPlanBinding) {
  const dataKey = JSON.stringify({ turns, locale, context });
  const sourceKey = `${binding.visitId}:${binding.patientId}:${dataKey}`;
  const bindingRef = useRef(binding); bindingRef.current = binding;
  const currentKey = useRef(sourceKey); currentKey.current = sourceKey;
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ key: string; status: "idle" | "loading" | "ready" | "error"; result: ActionPlanResult | null; error: string }>({ key: sourceKey, status: "idle", result: null, error: "" });
  const [approved, setApproved] = useState(false);
  const [remember, setRemember] = useState(false);
  const [legacySaved, setLegacySaved] = useState<SavedPlan | null>(null);
  const saved = binding.savedPlan ?? legacySaved;
  const isLegacyPlan = !binding.savedPlan && Boolean(legacySaved);
  const [storageMessage, setStorageMessage] = useState("");
  const storageGeneration = useRef(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGACY_PLAN_STORAGE_KEY);
      if (raw) {
        const parsed = raw.length < 1_000_000 ? savedPlanSchema.safeParse(JSON.parse(raw)) : null;
        if (parsed?.success) setLegacySaved(parsed.data);
        else setStorageMessage("The saved plan could not be read. Generate a new one.");
      }
    } catch { setStorageMessage("Saved plans are unavailable in this browser. You can download a reviewed plan instead."); }
  }, []);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  useEffect(() => {
    controller.current?.abort(); controller.current = null;
    setApproved(false); setCompleted({}); setRemember(false); setStorageMessage(""); storageGeneration.current += 1;
    setState({ key: sourceKey, status: "idle", result: null, error: "" });
    return () => { controller.current?.abort(); };
  }, [sourceKey]);
  const valid = state.key === sourceKey;
  const result = valid ? state.result : null;
  useEffect(() => {
    if (!remember || !approved || !result) return;
    const generation = ++storageGeneration.current;
    let disposed = false;
    const visitId = bindingRef.current.visitId;
    void planFingerprint(dataKey).then((hash) => {
      if (disposed || currentKey.current !== sourceKey || generation !== storageGeneration.current || !visitId || bindingRef.current.visitId !== visitId) return;
      const value: SavedPlan = { version: 1, fingerprint: hash, result, completed };
      if (bindingRef.current.save(visitId, value)) setStorageMessage("Plan, patient snapshot and checkmarks saved with this visit. Other visits are unchanged.");
      else { setRemember(false); setStorageMessage("This plan could not be saved to the browser. It remains in memory. Download it before leaving and check Visit history for the storage error."); }
    }).catch(() => { if (!disposed) { setRemember(false); setStorageMessage("Browser saving is unavailable. Download a reviewed copy instead."); } });
    return () => { disposed = true; };
  }, [remember, approved, result, completed, sourceKey, dataKey]);
  async function restoreSaved() {
    if (!saved) return;
    const key = sourceKey;
    try {
      if (await planFingerprint(dataKey) !== saved.fingerprint) { setStorageMessage("This saved plan does not match the current transcript, language and AI context. Open its original visit in Visit history. The saved copy is unchanged."); return; }
      if (currentKey.current !== key) return;
      controller.current?.abort(); controller.current = null;
      setState({ key, status: "ready", result: saved.result, error: "" });
      setCompleted(saved.completed); setApproved(false); setRemember(!isLegacyPlan);
      setStorageMessage(isLegacyPlan ? "Older plan restored. Review it, then choose browser saving to link it and the patient snapshot to this visit. The old copy is kept." : "Visit plan and checkmarks restored. Review again before activating the checklist.");
    } catch { setStorageMessage("The saved plan could not be restored. Generate a new one."); }
  }
  function forgetSaved() {
    storageGeneration.current += 1; setRemember(false);
    if (binding.savedPlan && binding.visitId) {
      const removed = binding.remove(binding.visitId);
      setStorageMessage(removed ? "This visit’s saved plan and checkmarks removed. Its transcript and patient snapshot remain." : "Removal could not be saved to the browser. Check Visit history for the storage error.");
    } else {
      try { localStorage.removeItem(LEGACY_PLAN_STORAGE_KEY); setLegacySaved(null); setStorageMessage("Older saved plan removed. The current session checklist remains available."); }
      catch { setStorageMessage("Browser storage could not be updated. Clear site data to remove the saved plan."); }
    }
  }
  function setRememberPlan(value: boolean) {
    if (!value) forgetSaved();
    else if (binding.visitId) { setRemember(true); setStorageMessage("Saving this reviewed plan, its patient snapshot and checkmarks with this visit…"); }
    else setStorageMessage("Share a conversation turn before saving a visit plan.");
  }
  function cancel() {
    controller.current?.abort(); controller.current = null;
    setState({ key: sourceKey, status: "idle", result: null, error: "" }); setApproved(false); setCompleted({});
  }
  async function generate() {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const key = sourceKey;
    const payload = { requestId: crypto.randomUUID(), locale, turns, patientContext: context };
    setApproved(false); setCompleted({});
    const validated = actionPlanRequestSchema.safeParse(payload);
    if (!validated.success) { setState({ key, status: "error", result: null, error: validated.error.issues[0]?.message || "Share a clinician instruction first." }); controller.current = null; return; }
    setState({ key, status: "loading", result: null, error: "" });
    const timer = setTimeout(() => abort.abort("deadline"), 46_000);
    try {
      const response = await fetch("/api/action-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "Your plan could not be generated. Please retry.");
      const parsed = actionPlanResultSchema.safeParse(data);
      if (!parsed.success || parsed.data.requestId !== payload.requestId || parsed.data.locale !== locale || JSON.stringify(parsed.data.sourceTurnIds) !== JSON.stringify(turns.map((turn) => turn.id))) throw new Error("This plan did not match the current conversation. Please retry.");
      if (!abort.signal.aborted && currentKey.current === key) setState({ key, status: "ready", result: parsed.data, error: "" });
    } catch (error) {
      if (currentKey.current !== key || (abort.signal.aborted && abort.signal.reason !== "deadline")) return;
      setState({ key, status: "error", result: null, error: abort.signal.aborted ? "Plan generation took too long. Your conversation is kept. Please retry." : error instanceof Error ? error.message : "Connection lost. Please retry." });
    } finally { clearTimeout(timer); if (controller.current === abort) controller.current = null; }
  }
  return { result, remember, setRemember: setRememberPlan, hasSavedPlan: Boolean(saved), isLegacyPlan, restoreSaved, forgetSaved, storageMessage, status: valid ? state.status : "idle" as const, error: valid ? state.error : "", approved: Boolean(valid && approved), completed: valid ? completed : {}, generate, cancel,
    approve: (value: boolean) => { if (result && !result.actions.some((action) => !action.canCheck)) setApproved(value); },
    toggle: (id: string, occurrence: string) => { if (valid && approved && result?.actions.some((action) => action.id === id && action.canCheck)) setCompleted((current) => ({ ...current, [`${id}:${occurrence}`]: !current[`${id}:${occurrence}`] })); },
    resetProgress: () => setCompleted({}),
  };
}
