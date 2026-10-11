import type { BridgeTransport, ModelRequest, ModelResponse } from "../bridge/engine";
import { BridgeServiceError } from "../bridge/errors";
import type { ReviewFlag } from "../types";
import { JARGON_EXPLANATION_POLICY, VISIT_REVERSE_POLICY, VISIT_TRANSLATION_POLICY, visitBlindInput, visitGenerationInput } from "./prompts";
import { reviewVisit } from "./review";
import { sampleVisit } from "./sample";
import { visitRequestSchema, visitResultSchema, visitReverseJsonSchema, visitReverseSchema, visitTranslationJsonSchema, visitTranslationSchema, type VisitResult } from "./types";

export interface VisitOptions {
  transport?: BridgeTransport;
  signal?: AbortSignal;
  deadlineMs?: number;
  model?: string;
  now?: () => number;
  /** Server-selected purpose; never accepted from the conversation API payload. */
  purpose?: "jargon";
}

function parseModel(response: ModelResponse): unknown {
  if (response.status !== "completed") throw new BridgeServiceError("MODEL_INCOMPLETE", "The translation did not finish. Nothing new was shared. Please retry.", 502, true);
  try {
    if (!response.output_text) throw new Error("empty");
    return JSON.parse(response.output_text);
  } catch {
    throw new BridgeServiceError("INVALID_MODEL_OUTPUT", "The engine returned an unreadable translation. Nothing new was shared. Please retry.", 502, true);
  }
}

function abortError(signal: AbortSignal): BridgeServiceError {
  return signal.reason instanceof BridgeServiceError ? signal.reason
    : new BridgeServiceError("REQUEST_CANCELLED", "The translation was cancelled. Nothing new was shared.", 499, true);
}

async function cancellable<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw abortError(signal);
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try { return await Promise.race([run(), aborted]); }
  finally { signal.removeEventListener("abort", onAbort); }
}

function safeUpstreamError(error: unknown) {
  if (error instanceof BridgeServiceError) return error;
  const status = typeof error === "object" && error !== null
    ? "status" in error ? error.status : "statusCode" in error ? error.statusCode : undefined
    : undefined;
  if (Number(status) === 429) return new BridgeServiceError("RATE_LIMITED", "The live engine is busy or its quota is exhausted. Wait briefly and retry, or explicitly choose Sample mode.", 429, true);
  if ([401, 403].includes(Number(status))) return new BridgeServiceError("LIVE_UNAVAILABLE", "The live engine could not authenticate. Check the server configuration or explicitly choose Sample mode.", 503, false);
  return new BridgeServiceError("UPSTREAM_UNAVAILABLE", "The live engine could not finish. Nothing new was shared. Please retry or explicitly choose Sample mode.", 502, true);
}

export async function executeVisit(input: unknown, options: VisitOptions = {}): Promise<VisitResult> {
  const parsed = visitRequestSchema.safeParse(input);
  if (!parsed.success) throw new BridgeServiceError("INVALID_REQUEST", "Choose a valid speaker, language, engine, and reviewed utterance (maximum 4,000 characters).", 400, false);
  const request = parsed.data;
  const now = options.now ?? Date.now;
  const started = now();
  if (options.signal?.aborted) throw abortError(options.signal);
  if (request.engine === "sample") return visitResultSchema.parse(sampleVisit(request, Math.max(0, now() - started)));
  if (!options.transport) throw new BridgeServiceError("LIVE_UNAVAILABLE", "Live AI is not configured. Add a server-side GEMINI_API_KEY or explicitly choose Sample mode.", 503, false);

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new BridgeServiceError("REQUEST_TIMEOUT", "The live translation took too long. Nothing new was shared. Please retry.", 504, true)), options.deadlineMs ?? 45_000);
  const model = options.model ?? "gemini-3.5-flash-lite";
  const call = (system_instruction: string, text: string, schema: Record<string, unknown>) => {
    const modelRequest: ModelRequest = { model, system_instruction, input: text, response_format: { type: "text", mime_type: "application/json", schema }, generation_config: { thinking_level: "low" }, store: false };
    return cancellable(() => options.transport!.generate(modelRequest, controller.signal), controller.signal);
  };

  try {
    const first = visitTranslationSchema.safeParse(parseModel(await call(options.purpose === "jargon" ? JARGON_EXPLANATION_POLICY : VISIT_TRANSLATION_POLICY, visitGenerationInput(request), visitTranslationJsonSchema)));
    if (!first.success) throw new BridgeServiceError("INVALID_MODEL_OUTPUT", "The translation did not match the required format. Nothing new was shared. Please retry.", 502, true);
    const second = visitReverseSchema.safeParse(parseModel(await call(VISIT_REVERSE_POLICY, visitBlindInput(request, first.data.translation), visitReverseJsonSchema)));
    if (!second.success) throw new BridgeServiceError("INVALID_MODEL_OUTPUT", "The reverse translation did not match the required format. Nothing new was shared. Please retry.", 502, true);
    const flags: ReviewFlag[] = first.data.concerns.map((concern) => ({ ...concern, severity: "warning" }));
    if (request.speaker === "clinician" && request.patientContext && options.purpose !== "jargon") flags.push({ code: "PATIENT_CONTEXT", severity: "info", message: "Self-reported patient context was supplied. Check any familiar example against the original and the patient’s stated restrictions. Examples do not change clinical instructions." });
    const review = reviewVisit(request, first.data.translation, second.data.reverseTranslation);
    flags.push(...review.filter((flag) => options.purpose !== "jargon" || !["QUESTION_REVIEW", "REVIEW_AID"].includes(flag.code)));
    if (options.purpose === "jargon") flags.push({ code: "GENERAL_EXPLANATION", severity: "info", message: "General AI-generated explanation, not a clinician message or personal medical advice. The independent English rendering helps review wording; it does not verify medical accuracy." });
    return visitResultSchema.parse({
      requestId: request.requestId, locale: request.locale, engine: "live", speaker: request.speaker, sourceText: request.text,
      sourceLanguage: request.speaker === "clinician" ? "en-US" : request.locale,
      targetLanguage: request.speaker === "clinician" ? request.locale : "en-US",
      translation: first.data.translation, reverseTranslation: second.data.reverseTranslation, flags,
      elapsedMs: Math.max(0, now() - started), canRelease: !flags.some((flag) => flag.severity === "blocking"),
    });
  } catch (error) {
    if (controller.signal.aborted) throw abortError(controller.signal);
    throw safeUpstreamError(error);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}
