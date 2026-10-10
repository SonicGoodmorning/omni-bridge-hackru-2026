import { expect, test, type Page } from "@playwright/test";
import { resolveDocumentSource } from "../../src/lib/documents/source";
import type { DocumentRequest, DocumentResult } from "../../src/lib/documents/types";

const reviewLabel = "I have reviewed the source, explanation, and English reverse rendering.";
const acknowledgeLabel = "I confirm this text is public or fictional and contains no private personal information.";
const locales = ["tr-TR", "es-419", "pt-BR", "hi-IN", "zh-CN"];

async function shareDocument(page: Page) {
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check();
  await page.getByRole("button", { name: "Show to participant", exact: true }).click();
}
async function choosePaste(page: Page, text: string) {
  await page.getByLabel("Document source", { exact: true }).selectOption("paste");
  await page.getByLabel("Public or fictional English text", { exact: true }).fill(text);
}
// Responses are mocked; enable the option so these checks also work without credentials.
async function chooseMockLive(page: Page) {
  await page.getByLabel("Explanation engine").locator("option[value=live]").evaluate((option) => { (option as HTMLOptionElement).disabled = false; });
  await page.getByLabel("Explanation engine").selectOption("live");
}
function liveResult(payload: DocumentRequest): DocumentResult {
  const source = resolveDocumentSource(payload.source);
  return {
    requestId: payload.requestId, locale: payload.locale, engine: payload.engine, source,
    blocks: source.paragraphs.map((paragraph) => ({ id: paragraph.id, sourceParagraphIds: [paragraph.id], translation: `Kurgusal açıklama: ${paragraph.text}`, backTranslation: paragraph.text })),
    flags: [{ code: "REVIEW_AID", severity: "info", message: "Mocked test response; review the source." }], elapsedMs: 1, canRelease: true,
  };
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".shared-app")).not.toHaveAttribute("inert", "");
  await page.getByLabel("Explanation engine").selectOption("sample");
});

test("consent draft stays private until reviewed; language changes clear approval and participant text", async ({ page }) => {
  await page.getByRole("tab", { name: "Participant", exact: true }).click();
  await expect(page.getByRole("region", { name: "Participant explanation" })).toContainText("Waiting for review");
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect(page.locator(".doc-draft-intro")).toContainText("PREPARED SAMPLE");
  await expect(page.getByRole("button", { name: "Show to participant", exact: true })).toBeDisabled();
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check();
  await expect(page.getByRole("region", { name: "Coordinator review" }).getByRole("status")).toHaveText("Reviewed");
  await page.getByRole("button", { name: "Show to participant", exact: true }).click();
  await expect(page.locator(".doc-participant-block")).toContainText("%50");
  await page.getByLabel("Participant preferred language").selectOption("es-419");
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
});

test("trial procedures and visit summary preserve numerical facts in all five sample languages", async ({ page }) => {
  await page.getByRole("button", { name: /03 Visits & procedures/ }).click();
  for (const locale of locales) {
    await page.getByLabel("Participant preferred language").selectOption(locale);
    await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
    await shareDocument(page);
    const released = page.locator(".doc-released");
    await expect(released).toHaveAttribute("lang", locale);
    for (const fact of ["5 mL", "60", "8", "4"]) await expect(released).toContainText(fact);
  }
  await page.getByLabel("Document source", { exact: true }).selectOption("visit-summary");
  for (const locale of locales) {
    await page.getByLabel("Participant preferred language").selectOption(locale);
    await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
    await expect(page.locator(".doc-review-block")).toHaveCount(3);
    await shareDocument(page);
    const released = page.locator(".doc-released");
    await expect(released).toHaveAttribute("lang", locale);
    await expect(page.locator(".doc-participant-block")).toHaveCount(3);
    for (const fact of ["148/94", "mmHg", "10 mg", "2", "4"]) await expect(released).toContainText(fact);
  }
});

test("document, selected question paragraph and shared conversation persist across navigation", async ({ page }) => {
  await page.getByLabel("Document source", { exact: true }).selectOption("visit-summary");
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await shareDocument(page);
  await page.getByLabel("Question source paragraph", { exact: true }).selectOption("visit-plan");
  await page.getByRole("button", { name: "Use question: Can you explain this part?", exact: true }).click();
  const question = await page.getByLabel("Participant question", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Discuss this question", exact: true }).click();
  await expect(page).toHaveURL(/\/visits$/);
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue(question);
  await expect(page.getByRole("complementary", { name: "Question source", exact: true })).toContainText("lisinopril 10 mg");
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
  await page.getByRole("link", { name: "Document guide", exact: true }).click();
  await expect(page.locator(".doc-participant-block")).toHaveCount(3);
  await expect(page.getByLabel("Question source paragraph", { exact: true })).toHaveValue("visit-plan");
  await expect(page.getByLabel("Participant question", { exact: true })).toHaveValue(question);
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(8);
  await page.getByRole("link", { name: "Document guide", exact: true }).click();
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(8);
});

test("reset and source changes clear work while preserving language and reading preferences", async ({ page }) => {
  await page.getByLabel("Participant preferred language").selectOption("pt-BR");
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByLabel("Text size", { exact: true }).selectOption("extra-large");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await shareDocument(page);
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  await page.getByRole("link", { name: "Document guide", exact: true }).click();
  await page.getByLabel("Document source", { exact: true }).selectOption("visit-summary");
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await expect(page.getByLabel("Participant preferred language")).toHaveValue("pt-BR");
  await expect(page.locator(".shared-app")).toHaveClass(/text-size-extra-large/);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
  await page.getByRole("link", { name: "Document guide", exact: true }).click();
  await expect(page.getByLabel("Document source", { exact: true })).toHaveValue("consent");
});

test("a sample document question survives switching to live and is sent only on explicit translate", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/visits", (route) => {
    requests += 1;
    const payload = route.request().postDataJSON();
    return route.fulfill({ json: { ...payload, sourceText: payload.text, text: undefined, sourceLanguage: payload.locale, targetLanguage: "en-US", translation: "Can you explain this part?", reverseTranslation: payload.text, flags: [], elapsedMs: 1, canRelease: true } });
  });
  await page.getByRole("tab", { name: "Participant", exact: true }).click();
  await page.getByRole("button", { name: "Use question: Can you explain this part?", exact: true }).click();
  const question = await page.getByLabel("Participant question", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Discuss this question", exact: true }).click();
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue(question);
  await chooseMockLive(page);
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue(question);
  await expect(page.getByRole("complementary", { name: "Question source", exact: true })).toContainText("50% chance");
  expect(requests).toBe(0);
  await page.getByRole("link", { name: "Document guide", exact: true }).click();
  await expect(page.getByLabel("Participant question", { exact: true })).toHaveValue(question);
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Translate for clinician", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "I have reviewed the original, translation, and reverse rendering.", exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
});

test("reading size retains the exact shared draft and performs no model request", async ({ page }) => {
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await shareDocument(page);
  const text = await page.locator(".doc-released").textContent();
  let requests = 0;
  page.on("request", (request) => { if (/\/api\/(?:bridge|documents)$/.test(request.url())) requests += 1; });
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByLabel("Text size", { exact: true }).selectOption("large");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".doc-released")).toHaveText(text!);
  await expect(page.locator(".document-guide")).toHaveClass(/text-large/);
  expect(requests).toBe(0);
});

test("paste keeps overlong input, clears acknowledgment on edit and requires live mode", async ({ page }) => {
  const text = "Synthetic public note. ".repeat(200);
  await choosePaste(page, text);
  await expect(page.getByLabel("Public or fictional English text", { exact: true })).toHaveValue(text);
  await expect(page.locator("#paste-count")).toContainText("your input has been kept");
  await page.getByRole("checkbox", { name: acknowledgeLabel, exact: true }).check();
  await expect(page.getByRole("button", { name: "Prepare explanation", exact: true })).toBeDisabled();
  await page.getByLabel("Public or fictional English text", { exact: true }).fill("A short synthetic public note.");
  await expect(page.getByRole("checkbox", { name: acknowledgeLabel, exact: true })).not.toBeChecked();
  await page.getByRole("checkbox", { name: acknowledgeLabel, exact: true }).check();
  await expect(page.getByRole("button", { name: "Prepare explanation", exact: true })).toBeDisabled();
  await page.route("**/api/documents", (route) => route.fulfill({ json: liveResult(route.request().postDataJSON()) }));
  await chooseMockLive(page);
  await expect(page.getByRole("button", { name: "Prepare explanation", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect(page.locator(".doc-translated-draft")).toContainText("A short synthetic public note.");
});

test("mocked live paste has exact evidence; editing clears shared approval and questions", async ({ page }) => {
  await page.route("**/api/documents", (route) => route.fulfill({ json: liveResult(route.request().postDataJSON()) }));
  await chooseMockLive(page);
  const text = "Fictional record: 12 units.\n\nThis paragraph is a public example.";
  await choosePaste(page, text);
  await page.getByRole("checkbox", { name: acknowledgeLabel, exact: true }).check();
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect(page.locator(".doc-review-block")).toHaveCount(2);
  await page.locator(".doc-evidence").first().getByText("Compare source evidence", { exact: true }).click();
  await expect(page.locator(".doc-evidence").first().locator("blockquote")).toHaveText("Fictional record: 12 units.");
  await shareDocument(page);
  await page.getByLabel("Participant question", { exact: true }).fill("Bu bölüm ne demek?");
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await page.getByLabel("Public or fictional English text", { exact: true }).fill(`${text} Edited.`);
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Participant", exact: true }).click();
  await expect(page.getByLabel("Participant question", { exact: true })).toHaveValue("");
});

test("delayed document result cannot survive a pasted-source edit", async ({ page }) => {
  let complete: (() => void) | undefined; let finish: (() => void) | undefined;
  const delivered = new Promise<void>((resolve) => { finish = resolve; });
  await page.route("**/api/documents", async (route) => {
    const result = liveResult(route.request().postDataJSON());
    await new Promise<void>((resolve) => { complete = resolve; });
    await route.fulfill({ json: result }).catch(() => {}); finish?.();
  });
  await chooseMockLive(page);
  await choosePaste(page, "The original fictional text.");
  await page.getByRole("checkbox", { name: acknowledgeLabel, exact: true }).check();
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect.poll(() => Boolean(complete)).toBe(true);
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await page.getByLabel("Public or fictional English text", { exact: true }).fill("Fresh fictional text.");
  complete?.(); await delivered;
  await expect(page.locator(".doc-translated-draft")).toHaveCount(0);
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await expect(page.getByLabel("Public or fictional English text", { exact: true })).toHaveValue("Fresh fictional text.");
});

test("delayed consent response cannot survive a section change", async ({ page }) => {
  let complete: (() => void) | undefined; let finish: (() => void) | undefined;
  const delivered = new Promise<void>((resolve) => { finish = resolve; });
  await page.route("**/api/bridge", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => { complete = resolve; });
    await route.fulfill({ response }).catch(() => {}); finish?.();
  });
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect.poll(() => Boolean(complete)).toBe(true);
  await page.getByRole("button", { name: /06 Leaving the study/ }).click();
  complete?.(); await delivered;
  await expect(page.locator(".doc-translated-draft")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Leaving the study", exact: true })).toBeVisible();
});

test("wrong source revision, malformed success and quota errors never enable sharing", async ({ page }) => {
  await choosePaste(page, "A public fictional note.");
  await page.getByRole("checkbox", { name: acknowledgeLabel, exact: true }).check();
  await page.route("**/api/documents", (route) => {
    const result = liveResult(route.request().postDataJSON()); result.source.revision = "wrong-revision";
    return route.fulfill({ json: result });
  });
  await chooseMockLive(page);
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect(page.locator(".doc-error")).toContainText("did not match this document");
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await page.unroute("**/api/documents");
  await page.route("**/api/documents", (route) => route.fulfill({ json: { translation: "Incomplete" } }));
  await page.getByRole("region", { name: "Coordinator review", exact: true }).getByRole("button", { name: "Retry explanation", exact: true }).click();
  await expect(page.locator(".doc-error")).toContainText("did not match this document");
  await page.unroute("**/api/documents");
  await page.route("**/api/documents", (route) => route.fulfill({ status: 429, json: { error: { code: "RATE_LIMITED", message: "Quota exhausted. Please retry.", retryable: true } } }));
  await page.getByRole("region", { name: "Coordinator review", exact: true }).getByRole("button", { name: "Retry explanation", exact: true }).click();
  await expect(page.locator(".doc-error")).toContainText("Quota exhausted");
  await expect(page.locator(".doc-participant-block")).toHaveCount(0);
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await expect(page.getByLabel("Public or fictional English text", { exact: true })).toHaveValue("A public fictional note.");
});

test("glossary terms have word boundaries and keyboard close returns trigger focus", async ({ page }) => {
  await choosePaste(page, "This fictional example is involuntary, not voluntary. The amount is 5 mg.");
  const voluntary = page.getByRole("button", { name: "Explain term: voluntary", exact: true });
  await expect(voluntary).toHaveCount(1);
  await voluntary.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary", { name: "Glossary explanation", exact: true })).toContainText("Optional");
  await expect(page.locator("#doc-glossary")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(voluntary).toBeFocused();
  await expect(page.locator("#doc-glossary")).toHaveCount(0);
  await page.getByRole("button", { name: "Explain term: mg", exact: true }).click();
  await expect(page.locator("#doc-glossary")).not.toContainText("10 mg");
});

test("mobile tabs keep the gate, restore source scroll and avoid horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("region", { name: "Original document", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Coordinator review", exact: true })).not.toBeVisible();
  await page.getByLabel("Document source", { exact: true }).selectOption("visit-summary");
  await page.locator("#doc-pane-source").evaluate((pane) => { pane.scrollTop = 200; });
  await expect.poll(() => page.locator("#doc-pane-source").evaluate((pane) => pane.scrollTop)).toBe(200);
  const scroll = await page.locator("#doc-pane-source").evaluate((pane) => pane.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Participant", exact: true }).click();
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await expect.poll(() => page.locator("#doc-pane-source").evaluate((pane) => pane.scrollTop)).toBe(scroll);
  await page.getByRole("button", { name: "Prepare explanation", exact: true }).click();
  await expect(page.getByRole("region", { name: "Coordinator review", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show to participant", exact: true })).toBeDisabled();
  await shareDocument(page);
  await expect(page.getByRole("region", { name: "Participant explanation", exact: true })).toBeVisible();
  await expect(page.locator(".doc-participant-block")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("APIs enforce input acknowledgment, sample boundaries and no-store responses", async ({ request }) => {
  for (const source of [{ kind: "fixture", id: "unknown" }, { kind: "paste", text: "Synthetic public note.", acknowledged: false }]) {
    const response = await request.post("/api/documents", { data: { requestId: "api-invalid", locale: "tr-TR", engine: "sample", source } });
    expect(response.status()).toBe(400); expect(response.headers()["cache-control"]).toBe("no-store");
  }
  const rejected = await request.post("/api/documents", { data: { requestId: "api-paste", locale: "tr-TR", engine: "sample", source: { kind: "paste", text: "Synthetic public note.", acknowledged: true } } });
  expect(rejected.status()).toBe(422); expect(rejected.headers()["cache-control"]).toBe("no-store");
  const sample = await request.post("/api/documents", { data: { requestId: "api-sample", locale: "tr-TR", engine: "sample", source: { kind: "fixture", id: "visit-summary" } } });
  expect(sample.ok()).toBe(true); expect(sample.headers()["cache-control"]).toBe("no-store"); expect((await sample.json()).blocks).toHaveLength(3);
  const invalidConsent = await request.post("/api/bridge", { data: { requestId: "invalid", mode: "consent", sectionId: "randomization", locale: "unknown", engine: "sample" } });
  expect(invalidConsent.status()).toBe(400);
});
