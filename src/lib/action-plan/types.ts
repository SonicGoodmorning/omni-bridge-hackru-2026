import { z } from "zod";
import { LOCALES } from "../types";
import { patientContextSchema } from "../patient/profile";

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(1).max(2000);
export const planTurnSchema = z.object({
  id, speaker: z.enum(["clinician", "participant"]), sourceText: z.string().min(1).max(4000),
  translation: z.string().min(1).max(20000), sourceLanguage: z.string().max(30), targetLanguage: z.string().max(30),
  engine: z.enum(["live", "sample"]), prepared: z.boolean(),
}).strict();
export const actionPlanRequestSchema = z.object({
  requestId: id, locale: z.enum(LOCALES), turns: z.array(planTurnSchema).min(1).max(100),
  patientContext: patientContextSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.turns.map((turn) => turn.id)).size !== value.turns.length) ctx.addIssue({ code: "custom", message: "Turn IDs must be unique." });
  if (!value.turns.some((turn) => turn.speaker === "clinician")) ctx.addIssue({ code: "custom", message: "A shared clinician instruction is needed." });
  if (value.turns.some((turn) => turn.sourceLanguage !== (turn.speaker === "clinician" ? "en-US" : value.locale) || turn.targetLanguage !== (turn.speaker === "clinician" ? value.locale : "en-US"))) ctx.addIssue({ code: "custom", message: "Every turn must match the session language." });
  if (value.turns.reduce((total, turn) => total + turn.sourceText.length + turn.translation.length, 0) > 100_000) ctx.addIssue({ code: "custom", message: "This conversation exceeds the 100,000-character plan limit. Nothing will be truncated." });
});
const medicationSchema = z.object({ name: z.string().max(200), dose: z.string().max(200), route: z.string().max(200), timing: z.string().max(300) }).strict();
export const generatedPlanSchema = z.object({
  actions: z.array(z.object({
    id, sourceTurnId: id, sourceQuote: z.string().trim().min(1).max(4000),
    kind: z.enum(["medication", "diet", "appointment", "activity", "other"]),
    englishText: text, patientText: text, timingEnglish: text, timingPatient: text,
    recurrence: z.enum(["daily", "once", "as-directed"]),
    needsClarification: z.boolean(), clarificationEnglish: z.string().max(2000), clarificationPatient: z.string().max(2000),
    medication: medicationSchema,
  }).strict()).max(24),
  questions: z.array(z.object({ sourceTurnIds: z.array(id).min(1).max(100), englishText: text, patientText: text }).strict()).max(24),
}).strict();
export const planReverseSchema = z.object({
  actions: z.array(z.object({ id, englishText: text, timingEnglish: text, clarificationEnglish: z.string().max(2000) }).strict()).max(24),
  questions: z.array(z.object({ index: z.number().int().nonnegative(), englishText: text }).strict()).max(24),
}).strict();
const flag = z.object({ code: z.string(), severity: z.enum(["info", "warning", "blocking"]), message: z.string(), sourceSnippet: z.string().optional() }).strict();
export const actionPlanResultSchema = z.object({
  requestId: id, locale: z.enum(LOCALES), createdAt: z.string(), elapsedMs: z.number().nonnegative(),
  actions: z.array(generatedPlanSchema.shape.actions.element.extend({ reverseText: text, reverseTiming: text, reverseClarification: z.string(), flags: z.array(flag), canCheck: z.boolean() }).strict()).max(24),
  questions: z.array(generatedPlanSchema.shape.questions.element.extend({ reverseText: text }).strict()).max(24),
  sourceTurnIds: z.array(id).min(1).max(100),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.actions.map((action) => action.id)).size !== value.actions.length) ctx.addIssue({ code: "custom", message: "Action IDs must be unique." });
  for (const action of value.actions) {
    if (action.canCheck && (action.needsClarification || action.flags.some((flag) => flag.severity === "blocking") || (action.kind === "medication" && Object.values(action.medication).some((part) => !part.trim())))) ctx.addIssue({ code: "custom", message: "An unclear or blocked action cannot become a checklist step." });
  }
});
export type ActionPlanRequest = z.infer<typeof actionPlanRequestSchema>;
export type ActionPlanResult = z.infer<typeof actionPlanResultSchema>;
// Keep the model schema small; enforce all length, ID, and collection limits with Zod after generation.
function modelSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(modelSchema);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["$schema", "minLength", "maxLength", "minItems", "maxItems", "pattern", "minimum", "maximum"].includes(key)).map(([key, child]) => [key, modelSchema(child)]));
  return value;
}
export const planGenerationJsonSchema = modelSchema(z.toJSONSchema(generatedPlanSchema)) as Record<string, unknown>;
export const planReverseJsonSchema = modelSchema(z.toJSONSchema(planReverseSchema)) as Record<string, unknown>;
