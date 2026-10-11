import { z } from "zod";
import { actionPlanResultSchema } from "./types";

// Kept for importing the previous single-plan browser slot without destroying it.
export const LEGACY_PLAN_STORAGE_KEY = "omni-bridge-action-plan-v1";
export const savedPlanSchema = z.object({
  version: z.literal(1), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  result: actionPlanResultSchema,
  completed: z.record(z.string().max(300), z.boolean()).refine((value) => Object.keys(value).length <= 10_000),
}).strict();
export type SavedPlan = z.infer<typeof savedPlanSchema>;
export async function planFingerprint(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
