import type { BridgeTransport } from "../bridge/engine";
import { BridgeServiceError } from "../bridge/errors";
import { clarificationCopy } from "./copy";
import { reviewVisit } from "../visits/review";
import type { ReviewFlag } from "../types";
import { ACTION_PLAN_POLICY, ACTION_PLAN_REVERSE_POLICY } from "./prompts";
import { actionPlanRequestSchema, actionPlanResultSchema, generatedPlanSchema, planGenerationJsonSchema, planReverseJsonSchema, planReverseSchema, type ActionPlanResult } from "./types";

export async function executeActionPlan(input: unknown, options: { transport?: BridgeTransport; model?: string; signal?: AbortSignal }): Promise<ActionPlanResult> {
  const parsed = actionPlanRequestSchema.safeParse(input);
  if (!parsed.success) throw new BridgeServiceError("INVALID_REQUEST", parsed.error.issues[0]?.message || "Use a complete shared conversation of up to 100 turns.", 400, false);
  if (!options.transport) throw new BridgeServiceError("LIVE_UNAVAILABLE", "Action plans need Gemini. Configure the server GEMINI_API_KEY to generate a plan from your conversation.", 503, false);
  const request = parsed.data;
  const started = Date.now();
  const deadline = AbortSignal.timeout(45_000);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  const invalid = () => new BridgeServiceError("INVALID_MODEL_OUTPUT", "The plan could not be matched to the conversation. No checklist was created. Retry or clarify the clinician's instructions.", 502, true);
  async function call(policy: string, data: unknown, schema: Record<string, unknown>): Promise<unknown> {
    signal.throwIfAborted();
    // Race against cancellation even if an upstream transport fails to honor its signal.
    let onAbort = () => {};
    const aborted = new Promise<never>((_, reject) => { onAbort = () => reject(signal.reason); signal.addEventListener("abort", onAbort, { once: true }); });
    try {
      const response = await Promise.race([options.transport!.generate({ model: options.model || "gemini-3.5-flash-lite", system_instruction: policy, input: JSON.stringify(data), generation_config: { thinking_level: "low" }, response_format: { type: "text", mime_type: "application/json", schema }, store: false }, signal), aborted]);
      if (response.status !== "completed" || !response.output_text) throw invalid();
      try { return JSON.parse(response.output_text); } catch { throw invalid(); }
    } finally { signal.removeEventListener("abort", onAbort); }
  }
  try {
    const first = generatedPlanSchema.safeParse(await call(ACTION_PLAN_POLICY, { targetLanguage: request.locale, patientContext: request.patientContext, turns: request.turns.map((turn) => ({ id: turn.id, speaker: turn.speaker, sourceLanguage: turn.sourceLanguage, sourceText: turn.sourceText, ...(turn.speaker === "participant" ? { englishRendering: turn.translation } : {}) })) }, planGenerationJsonSchema));
    if (!first.success || new Set(first.data.actions.map((a) => a.id)).size !== first.data.actions.length) throw invalid();
    if (!first.data.actions.length && !first.data.questions.length && request.turns.some((turn) => turn.speaker === "clinician" && /\b(?:please|avoid|bring|take|schedule|return|write down|do not|don't)\b/i.test(turn.sourceText))) throw new BridgeServiceError("INCOMPLETE_EXTRACTION", "The engine returned no steps even though the conversation may contain instructions. No plan was accepted. Retry or ask the clinician to state each instruction clearly.", 502, true);
    const turns = new Map(request.turns.map((turn) => [turn.id, turn]));
    const evidence = new Map<string, string>();
    for (const action of first.data.actions) {
      const source = turns.get(action.sourceTurnId);
      if (!source || source.speaker !== "clinician" || !source.sourceText.includes(action.sourceQuote)) throw invalid();
      // Expand an exact excerpt to its containing sentence(s). A clipped "take" cannot hide "do not".
      evidence.set(action.id, action.sourceQuote);
      const start = source.sourceText.indexOf(action.sourceQuote);
      const end = start + action.sourceQuote.length;
      let sentenceStart = 0;
      let sentenceEnd = source.sourceText.length;
      for (const match of source.sourceText.matchAll(/[.!?](?=\s|$)/g)) {
        if (match.index < start) sentenceStart = match.index + 1;
        if (match.index >= end - 1) { sentenceEnd = match.index + 1; break; }
      }
      action.sourceQuote = source.sourceText.slice(sentenceStart, sentenceEnd).trim();
      if (action.medication && Object.values(action.medication).some((part) => part && !action.sourceQuote.includes(part))) throw invalid();
    }
    if (first.data.questions.some((question) => question.sourceTurnIds.some((id) => !turns.has(id)))) throw invalid();
    const second = planReverseSchema.safeParse(await call(ACTION_PLAN_REVERSE_POLICY, { sourceLanguage: request.locale, actions: first.data.actions.map((a) => ({ id: a.id, text: a.patientText, timing: a.timingPatient, clarification: a.clarificationPatient })), questions: first.data.questions.map((q, index) => ({ index, text: q.patientText })) }, planReverseJsonSchema));
    if (!second.success) throw invalid();
    const reversed = new Map(second.data.actions.map((a) => [a.id, a]));
    const questions = new Map(second.data.questions.map((q) => [q.index, q]));
    if (second.data.actions.length !== first.data.actions.length || reversed.size !== first.data.actions.length || first.data.actions.some((a) => !reversed.has(a.id)) || second.data.questions.length !== first.data.questions.length || questions.size !== first.data.questions.length || first.data.questions.some((_, index) => !questions.has(index))) throw invalid();
    const missingTiming = (text: string) => /\b(?:not specified|unspecified|unknown|not given|not provided)\b/i.test(text);
    const hasConversationConflict = first.data.actions.some((a) => a.needsClarification || missingTiming(a.timingEnglish));
    const actions = first.data.actions.map((action) => {
      const reverse = reversed.get(action.id)!;
      const flags: ReviewFlag[] = reviewVisit({ requestId: request.requestId, engine: "live", locale: request.locale, speaker: "clinician", text: evidence.get(action.id)! }, action.patientText, reverse.englishText).filter((flag) => flag.severity !== "info");
      flags.push(...reviewVisit({ requestId: request.requestId, engine: "live", locale: request.locale, speaker: "clinician", text: action.sourceQuote }, action.patientText, reverse.englishText).filter((flag) => flag.code === "NEGATION_MISSING"));
      flags.push(...reviewVisit({ requestId: request.requestId, engine: "live", locale: request.locale, speaker: "clinician", text: action.englishText }, action.patientText, reverse.englishText).filter((flag) => flag.severity !== "info").map((flag) => ({ ...flag, message: `Checklist rendering: ${flag.message}` })));
      flags.push(...reviewVisit({ requestId: request.requestId, engine: "live", locale: request.locale, speaker: "clinician", text: action.timingEnglish }, action.timingPatient, reverse.timingEnglish).filter((flag) => flag.severity !== "info").map((flag) => ({ ...flag, message: `Timing rendering: ${flag.message}` })));
      if (action.kind !== "medication" && /\b(?:mg|mcg|milligrams?|micrograms?|pills?|capsules?|tablets?|inject|orally|by mouth)\b/i.test(action.sourceQuote)) flags.push({ code: "POSSIBLE_MEDICATION", severity: "blocking", message: "This may be a medication instruction. Confirm its identity, dose, route and timing before using the plan." });
      if (action.recurrence === "daily" && !/\b(?:daily|every day|each day|per day|a day|once a day|twice a day|(?:every|each) (?:morning|afternoon|evening|night))\b/i.test(action.sourceQuote)) flags.push({ code: "UNSUPPORTED_RECURRENCE", severity: "blocking", message: "Daily repetition is not explicit in the quoted instruction. Ask the clinician to specify frequency." });
      if (missingTiming(action.timingEnglish)) flags.push({ code: "MISSING_TIMING", severity: "blocking", message: "The plan did not retain when this step applies. Clarify the timing or regenerate with a complete instruction." });
      if (action.needsClarification) flags.push({ code: "NEEDS_CLARIFICATION", severity: "blocking", message: action.clarificationEnglish || "Ask the clinician to clarify this instruction." });
      if (action.kind === "medication" && (!action.medication || Object.values(action.medication).some((part) => !part.trim()))) flags.push({ code: "INCOMPLETE_MEDICATION", severity: "blocking", message: "Confirm the medicine name, dose, route, and timing with the clinician before using this step." });
      if (action.kind !== "medication" && Object.values(action.medication).some((part) => part.trim())) flags.push({ code: "MEDICATION_CATEGORY", severity: "blocking", message: "A medicine instruction was categorized inconsistently. Clarify it before using the plan." });
      if (action.medication && [action.medication.name, action.medication.dose].some((part) => part && (!action.englishText.toLowerCase().includes(part.toLowerCase()) || !reverse.englishText.toLowerCase().includes(part.toLowerCase())))) flags.push({ code: "MEDICATION_CHANGED", severity: "blocking", message: "The medicine name or dose differs between the source and checklist renderings. Regenerate after clarification." });
      // All actions remain paused if any instruction needs clarification: conflicts may span turns.
      if (hasConversationConflict && !action.needsClarification) flags.push({ code: "PLAN_CLARIFICATION", severity: "blocking", message: "Resolve the plan's unclear instructions before activating this checklist." });
      const blocked = flags.some((f) => f.severity === "blocking");
      const localized = clarificationCopy[request.locale];
      return { ...action, ...(missingTiming(action.timingEnglish) ? { timingPatient: localized.timing } : {}), ...(blocked && !action.clarificationPatient ? { clarificationPatient: localized.question, clarificationEnglish: "Can you clarify this step and when it should be followed?" } : {}), reverseText: reverse.englishText, reverseTiming: reverse.timingEnglish, reverseClarification: reverse.clarificationEnglish, flags, canCheck: !blocked };
    });
    const resultQuestions = first.data.questions.map((q, index) => ({ ...q, reverseText: questions.get(index)!.englishText }));
    for (const action of actions) {
      if (!action.canCheck && resultQuestions.length < 24 && !resultQuestions.some((q) => q.sourceTurnIds.includes(action.sourceTurnId))) resultQuestions.push({ sourceTurnIds: [action.sourceTurnId], englishText: "Can you clarify this step and when it should be followed?", patientText: clarificationCopy[request.locale].question, reverseText: "Can you clarify this step and when it should be followed? (Authored clarification prompt, not a model reverse rendering.)" });
    }
    return actionPlanResultSchema.parse({ requestId: request.requestId, locale: request.locale, createdAt: new Date().toISOString(), elapsedMs: Date.now() - started, actions, questions: resultQuestions, sourceTurnIds: request.turns.map((turn) => turn.id) });
  } catch (error) {
    if (signal.aborted) throw new BridgeServiceError(deadline.aborted ? "REQUEST_TIMEOUT" : "REQUEST_CANCELLED", deadline.aborted ? "The plan took too long. Your conversation is still available. Please retry." : "Plan generation cancelled.", deadline.aborted ? 504 : 499, true);
    if (error instanceof BridgeServiceError) throw error;
    const status = Number(typeof error === "object" && error !== null && "status" in error ? error.status : 0);
    if (status === 429) throw new BridgeServiceError("RATE_LIMITED", "Gemini is busy or its quota is exhausted. Your conversation is kept; retry shortly.", 429, true);
    if ([401, 403].includes(status)) throw new BridgeServiceError("LIVE_UNAVAILABLE", "Gemini could not authenticate. Check the server configuration.", 503, false);
    throw new BridgeServiceError("UPSTREAM_UNAVAILABLE", "The plan could not be generated. Your conversation is kept; please retry.", 502, true);
  }
}
