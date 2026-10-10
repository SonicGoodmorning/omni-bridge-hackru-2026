import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { BridgeTransport } from "./engine";

export function createGeminiTransport(apiKey: string): BridgeTransport {
  const client = new GoogleGenAI({ apiKey });
  return {
    async generate(request, signal) {
      return client.interactions.create(request, { signal, timeout_ms: 45_000, retries: { strategy: "none" } });
    },
  };
}
