import { BridgeServiceError } from "@/lib/bridge/errors";
import { createGeminiTransport } from "@/lib/bridge/gemini";
import { executeActionPlan } from "@/lib/action-plan/engine";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (Number(request.headers.get("content-length")) > 500_000) throw new BridgeServiceError("INVALID_REQUEST", "The conversation is too large. No text was truncated.", 413, false);
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 500_000) throw new BridgeServiceError("INVALID_REQUEST", "The conversation is too large. No text was truncated.", 413, false);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { throw new BridgeServiceError("INVALID_REQUEST", "Send a valid JSON request.", 400, false); }
    const key = process.env.GEMINI_API_KEY?.trim();
    const result = await executeActionPlan(input, { transport: key ? createGeminiTransport(key) : undefined, model: process.env.GEMINI_MODEL?.trim(), signal: request.signal });
    return Response.json(result, { headers });
  } catch (error) {
    const failure = error instanceof BridgeServiceError ? error : new BridgeServiceError("INTERNAL_ERROR", "The plan could not be generated. Your conversation is still available.", 500, true);
    return Response.json({ error: { code: failure.code, message: failure.message, retryable: failure.retryable } }, { status: failure.status, headers });
  }
}
