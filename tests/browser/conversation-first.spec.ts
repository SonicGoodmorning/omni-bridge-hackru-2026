import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_VISIT } from "../../src/lib/visits/sample";
const first = SAMPLE_VISIT[0];
const second = SAMPLE_VISIT[1];
const reviewLabel = "I have reviewed the original, translation, and reverse rendering.";
async function role(page: Page, value: "clinician" | "participant") {
  const button = page.getByRole("group", { name: "Speaking as" }).getByRole("button", { name: value === "clinician" ? /^Clinician/ : /^Participant/ });
  if (await button.getAttribute("aria-pressed") !== "true") await button.click();
}
async function translateAndShare(page: Page, speaker: "clinician" | "participant", text: string) {
  await role(page, speaker);
  await page.getByLabel(speaker === "clinician" ? "Clinician message" : "Participant message", { exact: true }).fill(text);
  await page.getByRole("button", { name: speaker === "clinician" ? "Translate for participant" : "Translate for clinician", exact: true }).click();
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check();
  await page.getByRole("button", { name: "Share this turn", exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.goto("/"); await page.getByLabel("Explanation engine").selectOption("sample"); await page.getByLabel("Participant preferred language").selectOption("tr-TR"); });

test("home is Conversation, legacy visits redirects, and Documents preserves each speaker draft", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Conversation", exact: true })).toBeVisible();
  await expect(page.locator(".visit-composer textarea")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Open prepared conversation", exact: true })).toHaveCount(0);
  await page.getByLabel("Clinician message", { exact: true }).fill("Clinician draft.");
  await role(page, "participant"); await page.getByLabel("Participant message", { exact: true }).fill("Katılımcı taslağı.");
  await page.getByRole("link", { name: "Documents", exact: true }).click(); await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByLabel("Document source")).toHaveValue("consent");
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await expect(page.getByLabel("Participant message", { exact: true })).toHaveValue("Katılımcı taslağı.");
  await role(page, "clinician"); await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue("Clinician draft.");
  await page.goto("/visits"); await expect(page).toHaveURL(/\/$/);
});

test("switching speakers invalidates an approved draft but keeps inputs and history", async ({ page }) => {
  await translateAndShare(page, "clinician", first.english);
  await page.getByLabel("Clinician message", { exact: true }).fill(first.english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check();
  await role(page, "participant");
  await expect(page.getByRole("checkbox", { name: reviewLabel, exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(1);
  await role(page, "clinician"); await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue(first.english);
});

test("participant display excludes drafts and English reverse text, supports both speakers and traps focus", async ({ page }) => {
  const displayButton = page.getByRole("button", { name: "Participant display", exact: true });
  await expect(displayButton).toBeDisabled();
  await translateAndShare(page, "clinician", first.english);
  await translateAndShare(page, "participant", second.text["tr-TR"]);
  await page.getByLabel("Participant message", { exact: true }).fill("UNSHARED PRIVATE DRAFT");
  let requests = 0; page.on("request", (request) => { if (request.url().includes("/api/")) requests++; });
  await displayButton.click();
  const display = page.getByRole("dialog", { name: "Participant display", exact: true });
  await expect(display.locator(".display-text")).toHaveText(second.text["tr-TR"]);
  await expect(display).not.toContainText(second.english); await expect(display).not.toContainText("UNSHARED PRIVATE DRAFT");
  await expect(display.getByRole("button", { name: "Next shared turn" })).toBeDisabled();
  await display.getByRole("button", { name: "Previous shared turn" }).click();
  await expect(display.locator(".display-text")).toHaveText(first.text["tr-TR"]);
  await expect(display).not.toContainText(first.english);
  await display.getByRole("button", { name: "Close participant display" }).focus(); await page.keyboard.press("Shift+Tab");
  expect(await display.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape"); await expect(display).toHaveCount(0); await expect(displayButton).toBeFocused();
  expect(requests).toBe(0);
});

test("prepared sample display renders all six sample languages and language changes clear it", async ({ page }) => {
  for (const locale of ["en-US", "tr-TR", "es-419", "pt-BR", "hi-IN", "zh-CN"] as const) {
    await page.getByLabel("Participant preferred language").selectOption(locale);
    if (await page.getByRole("button", { name: "Try a sample" }).getAttribute("aria-expanded") !== "true") await page.getByRole("button", { name: "Try a sample" }).click();
    await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
    await page.getByRole("button", { name: "Participant display", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Participant display", exact: true });
    await expect(dialog).toHaveAttribute("lang", locale); await expect(dialog).toContainText("Prepared sample");
    const last = SAMPLE_VISIT.at(-1)!; await expect(dialog.locator(".display-text")).toHaveText(locale === "en-US" ? last.english : last.text[locale]);
    await page.getByLabel("Participant preferred language").selectOption(locale === "tr-TR" ? "es-419" : "tr-TR", { force: true });
    await expect(dialog).toHaveCount(0); await expect(page.getByRole("button", { name: "Participant display", exact: true })).toBeDisabled();
  }
});

test("mobile review is modal and participant display remains usable with extra-large text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Clinician message", { exact: true }).fill(first.english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review this turn", exact: true });
  await expect(review).toBeVisible(); expect(await review.evaluate((node) => node.matches(":modal"))).toBe(true);
  await page.keyboard.press("Escape"); await expect(review).toHaveCount(0);
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await page.getByRole("checkbox", { name: reviewLabel, exact: true }).check(); await page.getByRole("button", { name: "Share this turn", exact: true }).click();
  await page.getByRole("button", { name: "Menu", exact: true }).click(); await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByLabel("Text size", { exact: true }).selectOption("extra-large"); await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Participant display", exact: true }).click();
  const display = page.getByRole("dialog", { name: "Participant display", exact: true });
  await expect(display.locator(".display-text")).toHaveText(first.text["tr-TR"]);
  expect(await display.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
});
