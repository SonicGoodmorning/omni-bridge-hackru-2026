import { BridgeServiceError } from "@/lib/bridge/errors";
import { createGeminiTransport } from "@/lib/bridge/gemini";
import { executeVisit } from "@/lib/visits/engine";
import { visitRequestSchema } from "@/lib/visits/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const explanationRequest = visitRequestSchema.pick({ requestId: true, locale: true, text: true }).strict();

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (Number(request.headers.get("content-length")) > 32_000) throw new BridgeServiceError("INVALID_REQUEST", "The request is too large.", 400, false);
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 32_000) throw new BridgeServiceError("INVALID_REQUEST", "The request is too large.", 400, false);
    let input: unknown;
    try { input = JSON.parse(body); }
    catch { throw new BridgeServiceError("INVALID_REQUEST", "Send a valid JSON request.", 400, false); }
    const parsed = explanationRequest.safeParse(input);
    if (!parsed.success) throw new BridgeServiceError("INVALID_REQUEST", "Choose a supported language and enter a term or question in English (maximum 4,000 characters).", 400, false);
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const result = await executeVisit({ ...parsed.data, speaker: "clinician", engine: "live" }, {
      purpose: "jargon", transport: apiKey ? createGeminiTransport(apiKey) : undefined,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite", signal: request.signal,
    });
    return Response.json(result, { headers });
  } catch (error) {
    const failure = error instanceof BridgeServiceError ? error : new BridgeServiceError("INTERNAL_ERROR", "The explanation could not be completed. Please retry.", 500, true);
    return Response.json({ error: { code: failure.code, message: failure.message, retryable: failure.retryable } }, { status: failure.status, headers });
  }
}
