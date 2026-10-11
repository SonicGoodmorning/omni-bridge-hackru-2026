import assert from "node:assert/strict";
import test from "node:test";
import { bridgeReducer, initialBridgeState } from "../src/lib/bridge-state";
import type { BridgeResult } from "../src/lib/types";

const result: BridgeResult = {
  requestId: "request-1", mode: "consent", locale: "tr-TR", engine: "sample", studyVersion: "DEMO-1.0",
  sourceText: "Source", sourceSectionIds: ["randomization"], translation: "Çeviri", backTranslation: "Rendering",
  flags: [], visual: "RANDOMIZATION", elapsedMs: 1, canRelease: true,
};

function turkishState() {
  return bridgeReducer(initialBridgeState(false), { type: "configure", patch: { locale: "tr-TR" } });
}

test("participant stays empty until a current draft is reviewed and explicitly released", () => {
  let state = turkishState();
  state = bridgeReducer(state, { type: "start", requestId: result.requestId });
  state = bridgeReducer(state, { type: "success", result });
  assert.equal(state.released, null);
  state = bridgeReducer(state, { type: "release" });
  assert.equal(state.released, null);
  state = bridgeReducer(state, { type: "review", value: true });
  state = bridgeReducer(state, { type: "release" });
  assert.equal(state.released, result);
});

test("changing any source configuration invalidates drafts, release, and pending responses", () => {
  let state = turkishState();
  state = bridgeReducer(state, { type: "start", requestId: result.requestId });
  state = bridgeReducer(state, { type: "success", result });
  state = bridgeReducer(state, { type: "review", value: true });
  state = bridgeReducer(state, { type: "release" });
  assert.equal(state.released, result, "configuration checks must start with a released draft");
  for (const patch of [{ locale: "es-419" as const }, { sectionId: "withdrawal" }, { text: "New source" }, { mode: "conversation" as const }, { engine: "live" as const }]) {
    const changed = bridgeReducer(state, { type: "configure", patch });
    assert.equal(changed.result, null);
    assert.equal(changed.released, null);
    assert.equal(changed.reviewConfirmed, false);
    assert.equal(changed.activeRequestId, null);
  }
});

test("old and cancelled requests cannot overwrite newer work", () => {
  let state = bridgeReducer(turkishState(), { type: "start", requestId: "request-2" });
  assert.equal(bridgeReducer(state, { type: "success", result }), state);
  assert.equal(bridgeReducer(state, { type: "failure", requestId: "request-1", message: "Old error" }), state);
  state = bridgeReducer(state, { type: "cancel" });
  assert.equal(bridgeReducer(state, { type: "success", result: { ...result, requestId: "request-2" } }), state);
});

test("blocking result can never be released", () => {
  let state = bridgeReducer(turkishState(), { type: "start", requestId: result.requestId });
  state = bridgeReducer(state, { type: "success", result: { ...result, canRelease: false } });
  assert.equal(state.result?.canRelease, false, "a blocking draft must actually have been received");
  state = bridgeReducer(state, { type: "review", value: true });
  state = bridgeReducer(state, { type: "release" });
  assert.equal(state.reviewConfirmed, false);
  assert.equal(state.released, null);
});

test("a failed retry disables release and cannot publish a previous draft", () => {
  let state = bridgeReducer(turkishState(), { type: "start", requestId: result.requestId });
  state = bridgeReducer(state, { type: "success", result });
  assert.equal(state.result, result, "retry starts from a successfully received draft");
  state = bridgeReducer(state, { type: "start", requestId: "retry" });
  state = bridgeReducer(state, { type: "failure", requestId: "retry", message: "Timeout" });
  state = bridgeReducer(state, { type: "review", value: true });
  state = bridgeReducer(state, { type: "release" });
  assert.equal(state.released, null);
  assert.equal(state.result, null);
  assert.equal(state.status, "error");
});

test("default English session rejects a Turkish response even with the current request ID", () => {
  const state = bridgeReducer(initialBridgeState(false), { type: "start", requestId: result.requestId });
  assert.equal(state.locale, "en-US");
  assert.equal(bridgeReducer(state, { type: "success", result }), state);
});
