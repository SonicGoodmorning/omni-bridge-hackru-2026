import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_VISIT } from "../../src/lib/visits/sample";
import type { Locale } from "../../src/lib/types";

const clinicianTurn = SAMPLE_VISIT.find((turn) => turn.speaker === "clinician")!;
const participantTurn = SAMPLE_VISIT.find((turn) => turn.speaker === "participant")!;
const locales: Locale[] = ["tr-TR", "es-419", "pt-BR", "hi-IN", "zh-CN"];
const reviewLabel = "I have reviewed the original, translation, and reverse rendering.";

async function openVisits(page: Page) {
  await page.goto("/visits");
  await expect(page.locator(".visits-shell")).not.toHaveAttribute("inert", "");
  await page.getByLabel("Explanation engine").selectOption("sample");
  await expect(page.getByLabel("Explanation engine")).toHaveValue("sample");
}

async function shareDraft(page: Page) {
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check();
  await page.getByRole("button", { name: "Share this turn", exact: true }).click();
}

async function installSpeechHarness(page: Page, denied = false) {
  await page.addInitScript((deny) => {
    class Speech {
      lang = "";
      onresult?: (event: unknown) => void;
      onerror?: (event: { error: string }) => void;
      onend?: () => void;
      start() {
        const result = this.onresult;
        const end = this.onend;
        const browser = window as typeof window & { recordedSpeechLanguages: string[]; queuedSpeechResults: (() => void)[]; emitSpeech: (text: string) => void; emitLateSpeech: () => void };
        browser.recordedSpeechLanguages ??= [];
        browser.queuedSpeechResults ??= [];
        browser.recordedSpeechLanguages.push(this.lang);
        browser.emitSpeech = (text) => {
          this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] });
          this.onend?.();
        };
        browser.emitLateSpeech = () => {
          result?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Stale recording text." } }] });
          end?.();
        };
        browser.queuedSpeechResults.push(browser.emitLateSpeech);
        if (deny) setTimeout(() => { this.onerror?.({ error: "not-allowed" }); this.onend?.(); }, 20);
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Speech, configurable: true });
  }, denied);
}

test("each speaker translates in the correct direction and shares only after review", async ({ page }) => {
  await openVisits(page);
  const conversation = page.getByRole("region", { name: "Shared conversation", exact: true });
  await expect(conversation.locator("article")).toHaveCount(0);
  await page.getByLabel("Clinician message", { exact: true }).fill(clinicianTurn.english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  const share = page.getByRole("button", { name: "Share this turn", exact: true });
  await expect(share).toBeDisabled();
  await expect(conversation.locator("article")).toHaveCount(0);
  await shareDraft(page);
  await expect(conversation.locator("article[data-speaker='clinician']")).toContainText(clinicianTurn.english);
  await expect(conversation.locator("article[data-speaker='clinician']")).toContainText(clinicianTurn.text["tr-TR"]);
  await expect(conversation.locator("article")).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.getByLabel("Participant message", { exact: true }).fill(participantTurn.text["tr-TR"]);
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await expect(conversation.locator("article")).toHaveCount(1);
  await shareDraft(page);
  await expect(conversation.locator("article[data-speaker='participant']")).toContainText(participantTurn.text["tr-TR"]);
  await expect(conversation.locator("article[data-speaker='participant']")).toContainText(participantTurn.english);
  await expect(conversation.locator("article")).toHaveCount(2);
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue("");
});

test("prepared conversations are labelled fixtures in all five languages", async ({ page }) => {
  await openVisits(page);
  const conversation = page.getByRole("region", { name: "Shared conversation", exact: true });
  for (const locale of locales) {
    await page.getByLabel("Participant preferred language").selectOption(locale);
    await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
    const turns = conversation.locator("article");
    await expect(turns).toHaveCount(SAMPLE_VISIT.length);
    await expect(conversation.locator("article[data-prepared='true']")).toHaveCount(SAMPLE_VISIT.length);
    await expect(conversation).toContainText(participantTurn.text[locale]);
    await expect(conversation).toContainText(participantTurn.english);
    await expect(conversation).toContainText(clinicianTurn.text[locale]);
  }
});

test("sample turns require an explicit send and arbitrary sample input stays an error", async ({ page }) => {
  await openVisits(page);
  const conversation = page.getByRole("region", { name: "Shared conversation", exact: true });
  await page.getByRole("button", { name: /^Use next sample turn/ }).click();
  await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue(clinicianTurn.english);
  await expect(conversation.locator("article")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.getByLabel("Participant message", { exact: true }).fill("A made-up utterance outside the fixed samples.");
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText(/sample|prepared|prewritten/i);
  await expect(conversation.locator("article")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
});

test("editing a draft removes its approval while preserving earlier shared turns", async ({ page }) => {
  await openVisits(page);
  const conversation = page.getByRole("region", { name: "Shared conversation", exact: true });
  await page.getByLabel("Clinician message", { exact: true }).fill(clinicianTurn.english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  await shareDraft(page);
  await page.getByLabel("Participant message", { exact: true }).fill(participantTurn.text["tr-TR"]);
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check();
  await page.getByLabel("Participant message", { exact: true }).fill("Changed source.");
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await expect(conversation.locator("article")).toHaveCount(1);
  await expect(conversation).toContainText(clinicianTurn.text["tr-TR"]);
});

test("a delayed answer cannot cross a language change into a new visit", async ({ page }) => {
  await openVisits(page);
  let complete: (() => void) | undefined;
  let delivered: (() => void) | undefined;
  const delivery = new Promise<void>((resolve) => { delivered = resolve; });
  await page.route("**/api/visits", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => { complete = resolve; });
    await route.fulfill({ response }).catch(() => {});
    delivered?.();
  });
  await page.getByLabel("Clinician message", { exact: true }).fill(clinicianTurn.english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  await expect.poll(() => Boolean(complete)).toBe(true);
  await page.getByLabel("Participant preferred language").selectOption("es-419");
  complete?.();
  await delivery;
  await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue("");
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
});

test("editing the other speaker during a request prevents its stale answer from sharing", async ({ page }) => {
  await openVisits(page);
  let complete: (() => void) | undefined;
  let delivered: (() => void) | undefined;
  const delivery = new Promise<void>((resolve) => { delivered = resolve; });
  await page.route("**/api/visits", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => { complete = resolve; });
    await route.fulfill({ response }).catch(() => {});
    delivered?.();
  });
  await page.getByLabel("Clinician message", { exact: true }).fill(clinicianTurn.english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  await expect.poll(() => Boolean(complete)).toBe(true);
  await page.getByLabel("Participant message", { exact: true }).fill(participantTurn.text["tr-TR"]);
  complete?.();
  await delivery;
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
});

test("microphones use each speaker's language and require an explicit translation action", async ({ page }) => {
  await installSpeechHarness(page);
  await openVisits(page);
  await page.getByRole("button", { name: "Record clinician", exact: true }).click();
  await expect(page.getByRole("button", { name: "Translate for participant", exact: true })).toBeDisabled();
  await page.evaluate((text) => (window as typeof window & { emitSpeech: (value: string) => void }).emitSpeech(text), clinicianTurn.english);
  await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue(clinicianTurn.english);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.getByLabel("Participant preferred language").selectOption("hi-IN");
  await page.getByRole("button", { name: "Record participant", exact: true }).click();
  await page.evaluate((text) => (window as typeof window & { emitSpeech: (value: string) => void }).emitSpeech(text), participantTurn.text["hi-IN"]);
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue(participantTurn.text["hi-IN"]);
  const languages = await page.evaluate(() => (window as typeof window & { recordedSpeechLanguages: string[] }).recordedSpeechLanguages);
  expect(languages).toEqual(["en-US", "hi-IN"]);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await shareDraft(page);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true })).toContainText(participantTurn.english);
});

test("overlong recognized speech keeps its final words and requires a deliberate shorter draft", async ({ page }) => {
  await installSpeechHarness(page);
  await openVisits(page);
  const recognized = `${"Synthetic practice sentence. ".repeat(150)}Do not change the plan.`;
  expect(recognized.length).toBeGreaterThan(4000);
  for (const speaker of ["clinician", "participant"] as const) {
    await page.getByRole("button", { name: `Record ${speaker}`, exact: true }).click();
    await page.evaluate((text) => (window as typeof window & { emitSpeech: (value: string) => void }).emitSpeech(text), recognized);
    const composer = page.getByRole("region", { name: speaker === "clinician" ? "Clinician speaking" : "Participant speaking", exact: true });
    const input = page.getByLabel(speaker === "clinician" ? "Clinician message" : "Participant message", { exact: true });
    const translate = page.getByRole("button", { name: speaker === "clinician" ? "Translate for participant" : "Translate for clinician", exact: true });
    await expect(input).toHaveValue(recognized);
    await expect(composer.locator(".inline-error")).toContainText("your transcript has been kept");
    await expect(translate).toBeDisabled();
    await input.fill(speaker === "clinician" ? clinicianTurn.english : participantTurn.text["tr-TR"]);
    await expect(composer.locator(".inline-error")).toHaveCount(0);
    await expect(translate).toBeEnabled();
  }
});

test("reset and language changes discard queued recognition callbacks", async ({ page }) => {
  await installSpeechHarness(page);
  await openVisits(page);
  for (const change of ["reset", "language"]) {
    await page.getByRole("button", { name: "Record participant", exact: true }).click();
    if (change === "reset") await page.getByRole("button", { name: "New session", exact: true }).click();
    else await page.getByLabel("Participant preferred language").selectOption("pt-BR");
    await page.getByLabel("Participant message", { exact: true }).fill("Fresh participant source.");
    await page.evaluate(() => (window as typeof window & { emitLateSpeech: () => void }).emitLateSpeech());
    await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue("Fresh participant source.");
    await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue("");
  }
});

test("a completed clinician recording cannot leak into the next participant recording", async ({ page }) => {
  await installSpeechHarness(page);
  await openVisits(page);
  await page.getByRole("button", { name: "Record clinician", exact: true }).click();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await page.getByRole("button", { name: "Record participant", exact: true }).click();
  await page.evaluate(() => (window as typeof window & { queuedSpeechResults: (() => void)[] }).queuedSpeechResults[0]());
  await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue("");
  await page.evaluate((text) => (window as typeof window & { emitSpeech: (value: string) => void }).emitSpeech(text), participantTurn.text["tr-TR"]);
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue(participantTurn.text["tr-TR"]);
});

test("denied microphone permission leaves both typed paths usable", async ({ page }) => {
  await installSpeechHarness(page, true);
  await openVisits(page);
  await page.getByRole("button", { name: "Record participant", exact: true }).click();
  await expect(page.locator(".inline-error")).toContainText("permission was denied");
  await page.getByLabel("Participant message", { exact: true }).fill(participantTurn.text["tr-TR"]);
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await shareDraft(page);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true })).toContainText(participantTurn.english);
  await expect(page.getByLabel("Clinician message", { exact: true })).toBeEditable();
});

test("failed and malformed visit responses never create a shareable turn", async ({ page }) => {
  await openVisits(page);
  await page.getByLabel("Participant message", { exact: true }).fill(participantTurn.text["tr-TR"]);
  await page.route("**/api/visits", (route) => route.fulfill({ status: 429, json: { error: { code: "RATE_LIMITED", message: "Visit quota exhausted. Please retry.", retryable: true } } }));
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText("Visit quota exhausted");
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.unroute("**/api/visits");
  await page.route("**/api/visits", (route) => route.fulfill({ json: { translation: "An incomplete response" } }));
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText(/response (?:was incomplete|did not match this message)/);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.unroute("**/api/visits");
  await page.route("**/api/visits", (route) => {
    const payload = route.request().postDataJSON();
    return route.fulfill({ json: { ...payload, sourceText: "A different participant message.", sourceLanguage: "tr-TR", targetLanguage: "en-US", translation: participantTurn.english, reverseTranslation: participantTurn.text["tr-TR"], flags: [], elapsedMs: 1, canRelease: true } });
  });
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText("did not match this message");
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Translate for clinician", exact: true })).toBeEnabled();
});

test("audio reads only shared translations and safely hands off between turns and recording", async ({ page }) => {
  await installSpeechHarness(page);
  await page.addInitScript(() => {
    class Utterance {
      lang = "";
      voice: unknown = null;
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const state = { utterances: [] as Utterance[], cancels: 0 };
    Object.assign(window, { mockVisitAudio: state });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [{ lang: "tr-TR", name: "Synthetic Turkish" }, { lang: "en-US", name: "Synthetic English" }],
      cancel: () => { state.cancels += 1; },
      speak: (utterance: Utterance) => { state.utterances.push(utterance); },
    }, configurable: true });
  });
  await openVisits(page);
  await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  expect(await page.evaluate(() => (window as typeof window & { mockVisitAudio: { utterances: unknown[] } }).mockVisitAudio.utterances.length)).toBe(0);
  await page.getByRole("button", { name: "Listen to translation of turn 1", exact: true }).click();
  await page.getByRole("button", { name: "Listen to translation of turn 2", exact: true }).click();
  const spoken = await page.evaluate(() => (window as typeof window & { mockVisitAudio: { utterances: { text: string; lang: string }[] } }).mockVisitAudio.utterances.map(({ text, lang }) => ({ text, lang })));
  expect(spoken).toEqual([{ text: clinicianTurn.text["tr-TR"], lang: "tr-TR" }, { text: participantTurn.english, lang: "en-US" }]);
  await page.evaluate(() => {
    const first = (window as typeof window & { mockVisitAudio: { utterances: { onerror?: () => void; onend?: () => void }[] } }).mockVisitAudio.utterances[0];
    first.onerror?.();
    first.onend?.();
  });
  await expect(page.getByRole("button", { name: "Stop audio for turn 2", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Record clinician", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop audio for turn 2", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Listen to translation of turn 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record clinician", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop audio for turn 1", exact: true })).toBeVisible();
});

test("mobile visits remain readable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openVisits(page);
  await expect(page.getByRole("heading", { name: "A conversation, both ways.", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(SAMPLE_VISIT.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("the main workspace links to the two-way visits area", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Conversation", exact: true }).first().click();
  await expect(page).toHaveURL(/\/visits$/);
  await expect(page.getByRole("heading", { name: "A conversation, both ways.", exact: true })).toBeVisible();
});

test("visit API enforces speaker direction and returns uncached sample data", async ({ request }) => {
  const invalid = await request.post("/api/visits", { data: { requestId: "invalid-visit", locale: "tr-TR", engine: "sample", speaker: "assistant", text: "Invent a response." } });
  expect(invalid.status()).toBe(400);
  const response = await request.post("/api/visits", { data: { requestId: "participant-sample", locale: "tr-TR", engine: "sample", speaker: "participant", text: participantTurn.text["tr-TR"] } });
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const result = await response.json();
  expect(result.sourceLanguage).toBe("tr-TR");
  expect(result.targetLanguage).toBe("en-US");
  expect(result.translation).toBe(participantTurn.english);
});
