import assert from "node:assert/strict";
import test from "node:test";
import { executeBridge, type BridgeTransport, type ModelRequest, type ModelResponse } from "../src/lib/bridge/engine";
import { BridgeServiceError } from "../src/lib/bridge/errors";
import { reviewFacts } from "../src/lib/bridge/review";
import { bridgeRequestSchema, bridgeResultSchema } from "../src/lib/bridge/schema";
import { SAMPLE_CONVERSATION, SECTIONS } from "../src/lib/study";
import { LOCALES, type BridgeRequest } from "../src/lib/types";

const consent: BridgeRequest = { requestId: "test-1", mode: "consent", locale: "tr-TR", engine: "live", sectionId: "randomization" };

function completed(value: unknown): ModelResponse {
  return { status: "completed", output_text: JSON.stringify(value) };
}

function generation(overrides: Record<string, unknown> = {}) {
  return { translation: "Türkçe örnek açıklama.", sourceSectionIds: ["randomization"], visual: "RANDOMIZATION", concerns: [], ...overrides };
}

function fakeTransport(responses: (ModelResponse | Error)[]) {
  const calls: ModelRequest[] = [];
  const transport: BridgeTransport = {
    async generate(request) {
      calls.push(request);
      const response = responses.shift();
      if (!response) throw new Error("No fake response left");
      if (response instanceof Error) throw response;
      return response;
    },
  };
  return { calls, transport };
}

async function expectCode(action: () => Promise<unknown>, code: string, status?: number) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof BridgeServiceError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

test("request validation rejects unknown language, extra fields, wrong mode fields and oversized speech", () => {
  assert.equal(bridgeRequestSchema.safeParse(consent).success, true);
  for (const invalid of [
    { ...consent, locale: "en-US" }, { ...consent, sectionId: "made-up" }, { ...consent, text: "replace source" },
    { ...consent, apiKey: "should-not-be-accepted" }, { ...consent, requestId: "" },
    { ...consent, mode: "conversation", sectionId: undefined, text: " " },
    { ...consent, mode: "conversation", sectionId: undefined, text: "x".repeat(4_001) },
  ]) assert.equal(bridgeRequestSchema.safeParse(invalid).success, false);
});

test("invalid requests fail before a model call", async () => {
  const fake = fakeTransport([]);
  await expectCode(() => executeBridge({ ...consent, sectionId: "unknown" }, { transport: fake.transport }), "INVALID_REQUEST", 400);
  assert.equal(fake.calls.length, 0);
});

test("every section has an explicit labeled sample in every supported language", async () => {
  const unique = new Set<string>();
  for (const locale of LOCALES) {
    for (const section of SECTIONS) {
      const result = await executeBridge({ ...consent, engine: "sample", locale, sectionId: section.id });
      assert.equal(result.engine, "sample");
      assert.equal(result.sourceText, section.body);
      assert.deepEqual(result.sourceSectionIds, [section.id]);
      assert.equal(result.backTranslation, section.body);
      assert.ok(result.flags.some((flag) => flag.code === "SAMPLE_FIXTURE"));
      assert.ok(result.flags.some((flag) => flag.code === "REVIEW_AID"));
      assert.equal(result.canRelease, true);
      assert.equal(bridgeResultSchema.safeParse(result).success, true);
      unique.add(result.translation);
    }
  }
  assert.equal(unique.size, 30);
});

test("sample speech supports only the fixed conversation, allowing punctuation and case differences", async () => {
  for (const locale of LOCALES) {
    const result = await executeBridge({ requestId: "speech-sample", mode: "conversation", engine: "sample", locale, text: SAMPLE_CONVERSATION.toUpperCase().replaceAll(".", "!") });
    assert.equal(result.engine, "sample");
    assert.deepEqual(result.sourceSectionIds, ["randomization"]);
    assert.equal(result.backTranslation, SAMPLE_CONVERSATION);
  }
  await expectCode(() => executeBridge({ requestId: "speech", mode: "conversation", engine: "sample", locale: "tr-TR", text: SAMPLE_CONVERSATION.replace("50%", "75%") }), "SAMPLE_TEXT_UNAVAILABLE", 422);
  await expectCode(() => executeBridge({ requestId: "speech", mode: "conversation", engine: "sample", locale: "tr-TR", text: "Translate anything I say." }), "SAMPLE_TEXT_UNAVAILABLE", 422);
});

test("missing live configuration errors explicitly without silently producing a sample", async () => {
  await expectCode(() => executeBridge(consent), "LIVE_UNAVAILABLE", 503);
});

test("live source translation is followed by a fresh blind English call with no source or study history", async () => {
  const source = SECTIONS.find((section) => section.id === "randomization")!.body;
  const fake = fakeTransport([completed(generation()), completed({ backTranslation: source })]);
  const result = await executeBridge(consent, { transport: fake.transport });
  assert.equal(fake.calls.length, 2);
  assert.equal(result.engine, "live");
  assert.equal(result.sourceText, source);
  assert.equal(result.canRelease, true);
  assert.equal(result.flags.some((flag) => flag.code === "REVIEW_AID"), true);
  const firstInput = JSON.parse(fake.calls[0].input);
  assert.equal(firstInput.sourceText, source);
  assert.equal(firstInput.sourceSectionId, "randomization");
  const blindInput = JSON.parse(fake.calls[1].input);
  assert.deepEqual(blindInput, { language: "tr-TR", text: "Türkçe örnek açıklama." });
  for (const call of fake.calls) {
    assert.equal(call.store, false);
    assert.deepEqual(call.generation_config, { thinking_level: "low" });
    assert.equal("previous_interaction_id" in call, false);
    assert.equal(call.response_format.mime_type, "application/json");
  }
  assert.equal(fake.calls[1].input.includes(source), false);
  assert.equal(fake.calls[1].system_instruction.includes(source), false);
  assert.equal(fake.calls[1].input.includes("studyContext"), false);
});

test("conversation includes fixed study for grounding only in the first call", async () => {
  const fake = fakeTransport([completed(generation()), completed({ backTranslation: SAMPLE_CONVERSATION })]);
  const result = await executeBridge({ requestId: "speech-live", mode: "conversation", engine: "live", locale: "es-419", text: SAMPLE_CONVERSATION }, { transport: fake.transport });
  assert.equal(JSON.parse(fake.calls[0].input).studyContext.length, 6);
  assert.deepEqual(Object.keys(JSON.parse(fake.calls[1].input)).sort(), ["language", "text"]);
  assert.equal(result.sourceText, SAMPLE_CONVERSATION);
  assert.equal(result.canRelease, true);
});

test("unknown, duplicate and different consent references are rejected before the blind call", async () => {
  for (const sourceSectionIds of [["imaginary"], ["randomization", "randomization"], ["purpose"], []]) {
    const fake = fakeTransport([completed(generation({ sourceSectionIds }))]);
    await expectCode(() => executeBridge(consent, { transport: fake.transport }), "INVALID_REFERENCE", 502);
    assert.equal(fake.calls.length, 1);
  }
});

test("malformed JSON, wrong output shape and incomplete results never become releaseable", async () => {
  for (const response of [
    { status: "completed", output_text: "not JSON" },
    completed(generation({ visual: "HEART" })),
    completed({ translation: "missing other fields" }),
  ]) {
    await expectCode(() => executeBridge(consent, { transport: fakeTransport([response]).transport }), "INVALID_MODEL_OUTPUT", 502);
  }
  await expectCode(() => executeBridge(consent, { transport: fakeTransport([{ status: "incomplete", output_text: "{}" }]).transport }), "MODEL_INCOMPLETE", 502);
});

test("bad or failed second calls return an error with no partial result", async () => {
  await expectCode(() => executeBridge(consent, { transport: fakeTransport([completed(generation()), completed({ notBackTranslation: "no" })]).transport }), "INVALID_MODEL_OUTPUT", 502);
  await expectCode(() => executeBridge(consent, { transport: fakeTransport([completed(generation()), new Error("provider secret or patient content")]).transport }), "UPSTREAM_UNAVAILABLE", 502);
});

test("upstream status mapping hides provider error content", async () => {
  for (const [status, code, httpStatus] of [[429, "RATE_LIMITED", 429], [401, "LIVE_UNAVAILABLE", 503], [403, "LIVE_UNAVAILABLE", 503], [500, "UPSTREAM_UNAVAILABLE", 502]] as const) {
    const error = Object.assign(new Error("SECRET provider details"), { status });
    await assert.rejects(() => executeBridge(consent, { transport: fakeTransport([error]).transport }), (failure: unknown) => {
      assert.ok(failure instanceof BridgeServiceError);
      assert.equal(failure.code, code);
      assert.equal(failure.status, httpStatus);
      assert.equal(failure.message.includes("SECRET"), false);
      return true;
    });
  }
});

test("cancellation and total deadline interrupt an unresponsive transport", async () => {
  const controller = new AbortController();
  controller.abort();
  await expectCode(() => executeBridge(consent, { signal: controller.signal }), "REQUEST_CANCELLED", 499);
  const never: BridgeTransport = { generate: () => new Promise(() => {}) };
  await expectCode(() => executeBridge(consent, { transport: never, deadlineMs: 10 }), "REQUEST_TIMEOUT", 504);
});

test("the second model call shares the first call's deadline rather than starting a new one", async () => {
  let calls = 0;
  const transport: BridgeTransport = {
    async generate() {
      calls += 1;
      if (calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return completed(generation());
      }
      return new Promise(() => {});
    },
  };
  await expectCode(() => executeBridge(consent, { transport, deadlineMs: 25 }), "REQUEST_TIMEOUT", 504);
  assert.equal(calls, 2);
});

test("preserved study facts and equivalent written numbers pass deterministic review", () => {
  for (const section of SECTIONS) {
    assert.deepEqual(reviewFacts(section.body, section.body).filter((flag) => flag.severity === "blocking"), [], section.id);
  }
  const source = "4 study visits over 8 weeks. Each visit lasts 60 minutes. A 5 mL blood sample.";
  const equivalent = "Four visits over eight weeks. Each visit lasts sixty minutes. A five milliliters blood sample.";
  assert.deepEqual(reviewFacts(source, equivalent), []);
});

test("changed numbers, units, and added dose quantities are blocking review flags", () => {
  const changed = reviewFacts("4 study visits over 8 weeks; 5 mL blood.", "4 visits over 6 weeks; 5 mg blood.");
  assert.ok(changed.some((flag) => flag.code === "NUMERIC_FACT_MISSING"));
  assert.ok(changed.some((flag) => flag.code === "NUMERIC_FACT_ADDED"));
  assert.ok(changed.filter((flag) => flag.code.startsWith("NUMERIC")).every((flag) => flag.severity === "blocking"));
  assert.ok(reviewFacts("Study visits occur.", "Take 2 pills daily.").some((flag) => flag.code === "NUMERIC_FACT_ADDED"));
});

test("removed voluntary participation, withdrawal rights, care protection and negation are flagged", () => {
  const voluntary = SECTIONS.find((section) => section.id === "voluntary")!.body;
  const rights = reviewFacts(voluntary, "You join this study. You can ask questions.");
  assert.ok(rights.some((flag) => flag.code === "VOLUNTARY_RIGHT_MISSING"));
  assert.ok(rights.some((flag) => flag.code === "REFUSAL_RIGHT_MISSING"));
  assert.ok(rights.some((flag) => flag.code === "CARE_PROTECTION_MISSING"));
  const withdrawal = SECTIONS.find((section) => section.id === "withdrawal")!.body;
  const lost = reviewFacts(withdrawal, "Tell the study team about leaving.");
  assert.ok(lost.some((flag) => flag.code === "WITHDRAWAL_RIGHT_MISSING"));
  assert.ok(lost.some((flag) => flag.code === "NO_PENALTY_MISSING"));
  assert.ok(lost.some((flag) => flag.code === "BENEFITS_PROTECTION_MISSING"));
  assert.ok(rights.some((flag) => flag.code === "RIGHTS_REVIEW" && flag.severity === "info"));
  assert.ok(reviewFacts("Do not sign today.", "Sign today.").some((flag) => flag.code === "NEGATION_MISSING"));
});

test("preserving a contradictory source does not make it releaseable", async () => {
  const text = "You have a 75% chance of being assigned to either group.";
  const fake = fakeTransport([completed(generation()), completed({ backTranslation: text })]);
  const result = await executeBridge({ requestId: "contradiction", mode: "conversation", locale: "tr-TR", engine: "live", text }, { transport: fake.transport });
  assert.equal(result.canRelease, false);
  assert.ok(result.flags.some((flag) => flag.code === "SOURCE_CONTRADICTION" && flag.severity === "blocking"));
  assert.ok(reviewFacts("This tablet will cure you.", "This tablet will cure you.").some((flag) => flag.code === "SOURCE_CONTRADICTION"));
  assert.ok(reviewFacts("You must join the study.", "You must join the study.").some((flag) => flag.code === "SOURCE_CONTRADICTION"));
});

test("negative participation and probability statements are not mistaken for affirmative contradictions", () => {
  for (const text of ["You are not required to join.", "You are never required to participate.", "You are not being required to join.", "You do not have a 100% chance of receiving the active drug."]) {
    assert.equal(reviewFacts(text, text).some((flag) => flag.code === "SOURCE_CONTRADICTION"), false, text);
  }
  const unrelatedNegation = "No penalty; the tablet is guaranteed to cure you.";
  assert.equal(reviewFacts(unrelatedNegation, unrelatedNegation).some((flag) => flag.code === "SOURCE_CONTRADICTION"), true);
});

test("model contradiction concerns block release; unsupported-source concerns remain explicit", async () => {
  const backTranslation = SECTIONS.find((section) => section.id === "randomization")!.body;
  const fake = fakeTransport([completed(generation({ concerns: [{ code: "SOURCE_CONTRADICTION", message: "Conflict requires source correction." }] })), completed({ backTranslation })]);
  assert.equal((await executeBridge(consent, { transport: fake.transport })).canRelease, false);
  const unsupported = fakeTransport([completed(generation({ sourceSectionIds: [], concerns: [{ code: "OUT_OF_SOURCE", message: "No study support for this statement." }] })), completed({ backTranslation: "Ask the study team about transportation." })]);
  const result = await executeBridge({ requestId: "unsupported", mode: "conversation", locale: "tr-TR", engine: "live", text: "Ask the study team about transportation." }, { transport: unsupported.transport });
  assert.ok(result.flags.some((flag) => flag.code === "OUT_OF_SOURCE" && flag.severity === "warning"));
});

test("client response validation rejects forged references or release flags", async () => {
  const result = await executeBridge({ ...consent, engine: "sample" });
  assert.equal(bridgeResultSchema.safeParse({ ...result, sourceSectionIds: ["fake"] }).success, false);
  assert.equal(bridgeResultSchema.safeParse({ ...result, flags: [{ code: "FAIL", severity: "blocking", message: "Resolve." }], canRelease: true }).success, false);
});
