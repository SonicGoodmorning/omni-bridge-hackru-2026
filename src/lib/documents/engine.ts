import type { BridgeTransport, ModelRequest, ModelResponse } from "../bridge/engine";
import { BridgeServiceError } from "../bridge/errors";
import type { ReviewFlag } from "../types";
import { documentBlindInput, documentGenerationInput, DOCUMENT_REVERSE_POLICY, DOCUMENT_TRANSLATION_POLICY } from "./prompts";
import { reviewDocument } from "./review";
import { sampleDocument } from "./sample";
import { resolveDocumentSource } from "./source";
import {
  documentRequestSchema, documentResultSchema, documentReverseJsonSchema, documentReverseSchema,
  documentTranslationJsonSchema, documentTranslationSchema, type DocumentResult,
} from "./types";

export interface DocumentOptions { transport?: BridgeTransport; signal?: AbortSignal; deadlineMs?: number; model?: string; now?: () => number }

const invalidOutput = () => new BridgeServiceError("INVALID_MODEL_OUTPUT", "The explanation did not match the document or required format. Nothing new was shared. Please retry.", 502, true);
function parseModel(response: ModelResponse): unknown {
  if (response.status !== "completed") throw new BridgeServiceError("MODEL_INCOMPLETE", "The explanation did not finish. Nothing new was shared. Please retry.", 502, true);
  try { if (!response.output_text) throw new Error("empty"); return JSON.parse(response.output_text); }
  catch { throw invalidOutput(); }
}
function abortError(signal: AbortSignal) {
  return signal.reason instanceof BridgeServiceError ? signal.reason : new BridgeServiceError("REQUEST_CANCELLED", "The explanation was cancelled. Nothing new was shared.", 499, true);
}
async function cancellable<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw abortError(signal);
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError(signal)); signal.addEventListener("abort", onAbort, { once: true });
  });
  try { return await Promise.race([run(), aborted]); }
  finally { signal.removeEventListener("abort", onAbort); }
}
function safeError(error: unknown) {
  if (error instanceof BridgeServiceError) return error;
  const status = typeof error === "object" && error !== null ? "status" in error ? error.status : "statusCode" in error ? error.statusCode : undefined : undefined;
  if (Number(status) === 429) return new BridgeServiceError("RATE_LIMITED", "The live engine is busy or its quota is exhausted. Wait briefly and retry, or explicitly choose Sample mode.", 429, true);
  if ([401, 403].includes(Number(status))) return new BridgeServiceError("LIVE_UNAVAILABLE", "The live engine could not authenticate. Check the server configuration or explicitly choose Sample mode.", 503, false);
  return new BridgeServiceError("UPSTREAM_UNAVAILABLE", "The live engine could not finish. Nothing new was shared. Please retry or explicitly choose Sample mode.", 502, true);
}

export async function executeDocument(input: unknown, options: DocumentOptions = {}): Promise<DocumentResult> {
  const parsed = documentRequestSchema.safeParse(input);
  if (!parsed.success) throw new BridgeServiceError("INVALID_REQUEST", "Choose a valid language, engine, and fictional document, or acknowledge public or fictional English text of up to 4,000 characters.", 400, false);
  const request = parsed.data;
  const source = resolveDocumentSource(request.source);
  const now = options.now ?? Date.now;
  const started = now();
  if (options.signal?.aborted) throw abortError(options.signal);
  if (request.engine === "sample") return documentResultSchema.parse(sampleDocument(request, source, Math.max(0, now() - started)));
  if (!options.transport) throw new BridgeServiceError("LIVE_UNAVAILABLE", "Live AI is not configured. Add a server-side GEMINI_API_KEY or explicitly choose Sample mode.", 503, false);

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new BridgeServiceError("REQUEST_TIMEOUT", "The live explanation took too long. Nothing new was shared. Please retry.", 504, true)), options.deadlineMs ?? 45_000);
  const call = (system_instruction: string, text: string, schema: Record<string, unknown>) => {
    const modelRequest: ModelRequest = {
      model: options.model ?? "gemini-3.5-flash-lite", system_instruction, input: text,
      response_format: { type: "text", mime_type: "application/json", schema }, generation_config: { thinking_level: "low" }, store: false,
    };
    return cancellable(() => options.transport!.generate(modelRequest, controller.signal), controller.signal);
  };
  try {
    const first = documentTranslationSchema.safeParse(parseModel(await call(DOCUMENT_TRANSLATION_POLICY, documentGenerationInput(request, source), documentTranslationJsonSchema)));
    if (!first.success) throw invalidOutput();
    const firstById = new Map(first.data.blocks.map((block) => [block.id, block]));
    if (first.data.blocks.length !== source.paragraphs.length || firstById.size !== source.paragraphs.length
      || source.paragraphs.some((p) => firstById.get(p.id)?.sourceParagraphIds[0] !== p.id)) throw invalidOutput();
    const ordered = source.paragraphs.map((p) => firstById.get(p.id)!);
    const second = documentReverseSchema.safeParse(parseModel(await call(DOCUMENT_REVERSE_POLICY, documentBlindInput(request.locale, ordered), documentReverseJsonSchema)));
    if (!second.success) throw invalidOutput();
    const secondById = new Map(second.data.blocks.map((block) => [block.id, block]));
    if (second.data.blocks.length !== ordered.length || secondById.size !== ordered.length || ordered.some((block) => !secondById.has(block.id))) throw invalidOutput();
    const blocks = ordered.map((block) => ({ ...block, backTranslation: secondById.get(block.id)!.backTranslation }));
    const flags: ReviewFlag[] = [
      ...first.data.concerns.map((concern) => ({ ...concern, severity: "warning" as const })),
      ...reviewDocument(request, source, blocks),
    ];
    const result = documentResultSchema.safeParse({
      requestId: request.requestId, locale: request.locale, engine: "live", source, blocks, flags,
      elapsedMs: Math.max(0, now() - started), canRelease: !flags.some((flag) => flag.severity === "blocking"),
    });
    if (!result.success) throw invalidOutput();
    return result.data;
  } catch (error) {
    if (controller.signal.aborted) throw abortError(controller.signal);
    throw safeError(error);
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener("abort", onExternalAbort);
  }
}
