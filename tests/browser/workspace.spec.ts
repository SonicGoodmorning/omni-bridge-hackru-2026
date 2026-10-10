import { expect, test } from "@playwright/test";
import { SAMPLE_CONVERSATION } from "../../src/lib/study";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Explanation engine").selectOption("sample");
});

test("a draft stays private until reviewed and released; switching language clears it", async ({ page }) => {
  const participant = page.getByRole("region", { name: "Participant view" });
  await expect(participant.getByText("Awaiting review")).toBeVisible();
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.getByText("Prepared sample", { exact: true })).toBeVisible();
  const share = page.getByRole("button", { name: "Share with participant", exact: true });
  await expect(share).toBeDisabled();
  await expect(participant.locator(".participant-translation")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "I have reviewed the source" }).check();
  await share.click();
  await expect(participant.locator(".participant-translation")).toContainText("%50");
  await page.getByLabel("Participant preferred language").selectOption("es-419");
  await expect(participant.locator(".participant-translation")).toHaveCount(0);
  await expect(participant.getByText("Awaiting review")).toBeVisible();
});

test("all five languages render and preserve the visit facts in sample consent", async ({ page }) => {
  await page.getByRole("button", { name: /03 Visits & procedures/ }).click();
  for (const locale of ["tr-TR", "es-419", "pt-BR", "hi-IN", "zh-CN"]) {
    await page.getByLabel("Participant preferred language").selectOption(locale);
    await page.getByRole("button", { name: "Create explanation", exact: true }).click();
    await page.getByRole("checkbox", { name: "I have reviewed the source" }).check();
    await page.getByRole("button", { name: "Share with participant", exact: true }).click();
    const text = page.getByRole("region", { name: "Participant view" }).locator(".participant-translation");
    await expect(text.locator("..")).toHaveAttribute("lang", locale);
    await expect(text).toContainText("5 mL");
    await expect(text).toContainText("60");
    await expect(text).toContainText("8");
    await expect(text).toContainText("4");
  }
});

test("conversation uses reviewed typed text and rejects unsupported sample input", async ({ page }) => {
  await page.getByRole("tab", { name: "Conversation", exact: true }).click();
  await page.getByLabel("ENGLISH SOURCE").fill(SAMPLE_CONVERSATION);
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.locator(".translated-draft")).toContainText("%50");
  await page.getByRole("checkbox", { name: "I have reviewed the source" }).check();
  await page.getByRole("button", { name: "Share with participant", exact: true }).click();
  await expect(page.locator(".participant-translation")).toContainText("%50");
  await page.getByLabel("ENGLISH SOURCE").fill("An arbitrary statement that is not the prepared sample.");
  await expect(page.locator(".participant-translation")).toHaveCount(0);
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText("prewritten conversation");
  await expect(page.locator(".participant-translation")).toHaveCount(0);
});

test("changing a section during a request prevents the stale response from appearing", async ({ page }) => {
  let complete: (() => void) | undefined;
  await page.route("**/api/bridge", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => { complete = resolve; });
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  await expect.poll(() => Boolean(complete)).toBe(true);
  await page.getByRole("button", { name: /06 Leaving the study/ }).click();
  await expect(page.getByRole("heading", { name: "Leaving the study", exact: true })).toBeVisible();
  complete?.();
  await expect(page.getByText("A moment to review.")).toBeVisible();
  await expect(page.locator(".translated-draft")).toHaveCount(0);
});

test("API failures and malformed successful responses never enable release", async ({ page }) => {
  await page.route("**/api/bridge", (route) => route.fulfill({ status: 429, json: { error: { code: "RATE_LIMITED", message: "Quota exhausted. Please retry.", retryable: true } } }));
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText("Quota exhausted");
  await expect(page.locator(".participant-translation")).toHaveCount(0);
  await page.unroute("**/api/bridge");
  await page.route("**/api/bridge", (route) => route.fulfill({ json: { translation: "Incomplete" } }));
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText("response was incomplete");
  await expect(page.locator(".participant-translation")).toHaveCount(0);
});

test("denied microphone permission keeps editable typed input available", async ({ page }) => {
  await page.addInitScript(() => {
    class DeniedSpeech {
      onerror?: (event: { error: string }) => void;
      onend?: () => void;
      start() { setTimeout(() => { this.onerror?.({ error: "not-allowed" }); this.onend?.(); }, 20); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: DeniedSpeech, configurable: true });
  });
  await page.reload();
  await page.getByLabel("Explanation engine").selectOption("sample");
  await page.getByRole("tab", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Use microphone", exact: true }).click();
  await expect(page.locator(".inline-error")).toContainText("permission was denied");
  await page.getByLabel("ENGLISH SOURCE").fill(SAMPLE_CONVERSATION);
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.locator(".translated-draft")).toBeVisible();
});

test("a finalized speech turn becomes editable source before an explicit send", async ({ page }) => {
  await page.addInitScript((transcript) => {
    class Speech {
      onresult?: (event: unknown) => void;
      onend?: () => void;
      start() {
        setTimeout(() => {
          this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript } }] });
          this.onend?.();
        }, 40);
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Speech, configurable: true });
  }, SAMPLE_CONVERSATION);
  await page.reload();
  await page.getByLabel("Explanation engine").selectOption("sample");
  await page.getByRole("tab", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Use microphone", exact: true }).click();
  await expect(page.getByLabel("ENGLISH SOURCE")).toHaveValue(SAMPLE_CONVERSATION);
  await expect(page.locator(".translated-draft")).toHaveCount(0);
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.locator(".translated-draft")).toBeVisible();
});

test("reset and mode changes discard queued speech from an earlier recording", async ({ page }) => {
  await page.addInitScript(() => {
    class Speech {
      onresult?: (event: unknown) => void;
      onend?: () => void;
      start() {
        const queuedResult = this.onresult;
        Object.assign(window, { emitLateSpeech: () => queuedResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Old recording content." } }] }) });
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Speech, configurable: true });
  });
  await page.reload();
  await page.getByRole("tab", { name: "Conversation", exact: true }).click();
  for (const transition of ["reset", "mode"]) {
    await page.getByRole("button", { name: "Use microphone", exact: true }).click();
    if (transition === "reset") await page.getByRole("button", { name: "New session", exact: true }).click();
    else {
      await page.getByRole("tab", { name: "Consent guide", exact: true }).click();
      await page.getByRole("tab", { name: "Conversation", exact: true }).click();
    }
    await page.getByLabel("ENGLISH SOURCE").fill("Fresh session text.");
    await page.evaluate(() => (window as typeof window & { emitLateSpeech: () => void }).emitLateSpeech());
    await expect(page.getByLabel("ENGLISH SOURCE")).toHaveValue("Fresh session text.");
  }
});

test("mobile workspace has no horizontal overflow and retains the review gate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "The CLEAR Study", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Create explanation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Share with participant", exact: true })).toBeDisabled();
});

test("API validates locale and never silently falls back from live to samples", async ({ request }) => {
  const invalid = await request.post("/api/bridge", { data: { requestId: "invalid", mode: "consent", sectionId: "randomization", locale: "unknown", engine: "sample" } });
  expect(invalid.status()).toBe(400);
  const sample = await request.post("/api/bridge", { data: { requestId: "api-sample", mode: "consent", sectionId: "randomization", locale: "tr-TR", engine: "sample" } });
  expect(sample.ok()).toBe(true);
  expect((await sample.json()).engine).toBe("sample");
  expect(sample.headers()["cache-control"]).toBe("no-store");
});
