import { BridgeServiceError } from "@/lib/bridge/errors";
import { createGeminiTransport } from "@/lib/bridge/gemini";
import type { BridgeError } from "@/lib/types";
import { executeVisit } from "@/lib/visits/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 24_000) throw new BridgeServiceError("INVALID_REQUEST", "The request is too large.", 400, false);
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 24_000) throw new BridgeServiceError("INVALID_REQUEST", "The request is too large.", 400, false);
    let input: unknown;
    try { input = JSON.parse(body); }
    catch { throw new BridgeServiceError("INVALID_REQUEST", "Send a valid JSON request.", 400, false); }
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const result = await executeVisit(input, {
      transport: apiKey ? createGeminiTransport(apiKey) : undefined,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite", signal: request.signal,
    });
    return Response.json(result, { headers });
  } catch (error) {
    const failure = error instanceof BridgeServiceError ? error
      : new BridgeServiceError("INTERNAL_ERROR", "The translation could not be completed. Nothing new was shared.", 500, true);
    const body: BridgeError = { error: { code: failure.code, message: failure.message, retryable: failure.retryable } };
    return Response.json(body, { status: failure.status, headers });
  }
}
