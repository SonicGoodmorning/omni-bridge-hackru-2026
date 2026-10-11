import { SECTIONS, STUDY } from "../study";
import type { BridgeRequest, BridgeResult, ReviewFlag } from "../types";
import { BridgeServiceError } from "./errors";
import { BACK_TRANSLATION_POLICY, TRANSLATION_POLICY, blindRenderingInput, generationInput } from "./prompts";
import { reviewFacts } from "./review";
import { sampleBridge } from "./sample";
import { backTranslationJsonSchema, backTranslationSchema, bridgeRequestSchema, bridgeResultSchema, translationJsonSchema, translationSchema } from "./schema";

export interface ModelRequest {
  model: string;
  system_instruction: string;
  input: string;
  generation_config: { thinking_level: "low" };
  response_format: { type: "text"; mime_type: "application/json"; schema: Record<string, unknown> };
  store: false;
}

export interface ModelResponse {
  status?: string;
  output_text?: string;
}

export interface BridgeTransport {
  generate(request: ModelRequest, signal: AbortSignal): Promise<ModelResponse>;
}

interface BridgeOptions {
  transport?: BridgeTransport;
  signal?: AbortSignal;
  deadlineMs?: number;
  model?: string;
  now?: () => number;
}

function parseModel(response: ModelResponse): unknown {
  if (response.status !== "completed") {
    throw new BridgeServiceError("MODEL_INCOMPLETE", "The AI did not complete the response. Nothing new was released. Please retry.", 502, true);
  }
  try {
    if (!response.output_text) throw new Error("empty");
    return JSON.parse(response.output_text);
  } catch {
    throw new BridgeServiceError("INVALID_MODEL_OUTPUT", "The AI returned an unreadable response. Nothing new was released. Please retry.", 502, true);
  }
}

function abortError(signal: AbortSignal): BridgeServiceError {
  return signal.reason instanceof BridgeServiceError
    ? signal.reason
    : new BridgeServiceError("REQUEST_CANCELLED", "This request was cancelled. Nothing new was released.", 499, true);
}

async function cancellable<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw abortError(signal);
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([run(), aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function safeUpstreamError(error: unknown): BridgeServiceError {
  if (error instanceof BridgeServiceError) return error;
  const status = typeof error === "object" && error !== null
    ? ("status" in error ? error.status : "statusCode" in error ? error.statusCode : undefined)
    : undefined;
  if (Number(status) === 429) return new BridgeServiceError("RATE_LIMITED", "The live engine is busy or its quota is exhausted. Wait briefly and retry, or explicitly choose Sample mode.", 429, true);
  if (Number(status) === 401 || Number(status) === 403) return new BridgeServiceError("LIVE_UNAVAILABLE", "The live engine could not authenticate. Check the server configuration or explicitly choose Sample mode.", 503, false);
  return new BridgeServiceError("UPSTREAM_UNAVAILABLE", "The live engine could not finish. Nothing new was released. Please retry or explicitly choose Sample mode.", 502, true);
}

export async function executeBridge(input: unknown, options: BridgeOptions = {}): Promise<BridgeResult> {
  const parsed = bridgeRequestSchema.safeParse(input);
  if (!parsed.success) throw new BridgeServiceError("INVALID_REQUEST", "Provide a valid language, engine, and study section or reviewed transcript (maximum 4,000 characters).", 400, false);
  const request: BridgeRequest = parsed.data;
  const now = options.now ?? Date.now;
  const started = now();
  if (options.signal?.aborted) throw abortError(options.signal);
  if (request.engine === "sample") {
    return bridgeResultSchema.parse(sampleBridge(request, Math.max(0, now() - started)));
  }
  if (!options.transport) throw new BridgeServiceError("LIVE_UNAVAILABLE", "Live AI is not configured. Add a server-side GEMINI_API_KEY or explicitly choose Sample mode.", 503, false);

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new BridgeServiceError("REQUEST_TIMEOUT", "The live engine took too long. Nothing new was released. Please retry.", 504, true)), options.deadlineMs ?? 45_000);
  const model = options.model ?? "gemini-3.5-flash-lite";
  const sourceText = request.mode === "consent" ? SECTIONS.find((section) => section.id === request.sectionId)!.body : request.text!;
  const call = (system_instruction: string, modelInput: string, schema: Record<string, unknown>) => cancellable(
    () => options.transport!.generate({ model, system_instruction, input: modelInput, response_format: { type: "text", mime_type: "application/json", schema }, generation_config: { thinking_level: "low" }, store: false }, controller.signal),
    controller.signal,
  );

  try {
    const first = translationSchema.safeParse(parseModel(await call(TRANSLATION_POLICY, generationInput(request, sourceText), translationJsonSchema)));
    if (!first.success) throw new BridgeServiceError("INVALID_MODEL_OUTPUT", "The AI response did not match the required format. Nothing new was released. Please retry.", 502, true);
    const translation = first.data;
    const knownIds = new Set(SECTIONS.map((section) => section.id));
    if (translation.sourceSectionIds.some((id) => !knownIds.has(id))
      || new Set(translation.sourceSectionIds).size !== translation.sourceSectionIds.length
      || (request.mode === "consent" && (translation.sourceSectionIds.length !== 1 || translation.sourceSectionIds[0] !== request.sectionId))) {
      throw new BridgeServiceError("INVALID_REFERENCE", "The AI referenced a different or unknown study section. Nothing new was released. Please retry.", 502, true);
    }
    const second = backTranslationSchema.safeParse(parseModel(await call(BACK_TRANSLATION_POLICY, blindRenderingInput(request.locale, translation.translation), backTranslationJsonSchema)));
    if (!second.success) throw new BridgeServiceError("INVALID_MODEL_OUTPUT", "The English rendering did not match the required format. Nothing new was released. Please retry.", 502, true);
    const flags: ReviewFlag[] = translation.concerns.map((concern) => ({ ...concern, severity: concern.code === "SOURCE_CONTRADICTION" ? "blocking" : "warning" }));
    if (request.patientContext) flags.push({ code: "PATIENT_CONTEXT", severity: "info", message: "Self-reported patient context was supplied. Check any familiar example against the original and the patient’s stated restrictions. Examples do not change clinical instructions." });
    flags.push(...reviewFacts(sourceText, second.data.backTranslation));
    if (request.mode === "conversation" && translation.sourceSectionIds.length === 0 && !flags.some((flag) => flag.code === "OUT_OF_SOURCE")) {
      flags.push({ code: "OUT_OF_SOURCE", severity: "warning", message: "No fixed study section supports this conversation. Review the source and ask the study team to clarify." });
    }
    flags.push({ code: "REVIEW_AID", severity: "info", message: "Blind English rendering and checks are review aids, not proof of translation accuracy. Review the source before releasing." });
    return bridgeResultSchema.parse({
      requestId: request.requestId, mode: request.mode, locale: request.locale, engine: "live", studyVersion: STUDY.version,
      sourceText, sourceSectionIds: translation.sourceSectionIds, translation: translation.translation,
      backTranslation: second.data.backTranslation, flags, visual: translation.visual,
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
