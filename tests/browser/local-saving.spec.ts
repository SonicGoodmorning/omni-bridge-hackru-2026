import { test, expect } from "@playwright/test";
import { CONVERSATION_STORAGE_KEY } from "../../src/lib/local-conversation";
import { SAMPLE_VISIT } from "../../src/lib/visits/sample";
async function prepared(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Explanation engine").selectOption("sample");
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("saved in this browser");
}
test("shared history survives refresh and a new tab, while drafts and review stay private", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("Explanation engine").selectOption("sample");
  await page.getByLabel("Participant preferred language").selectOption("es-419");
  await page.getByLabel("Clinician message", { exact: true }).fill(SAMPLE_VISIT[0].english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  await page.getByRole("checkbox", { name: "I have reviewed the original, translation, and reverse rendering.", exact: true }).check();
  await page.getByRole("button", { name: "Share this turn", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("saved in this browser");
  await page.getByLabel("Clinician message", { exact: true }).fill(SAMPLE_VISIT[0].english);
  await page.getByRole("button", { name: "Translate for participant", exact: true }).click();
  await page.getByRole("checkbox", { name: "I have reviewed the original, translation, and reverse rendering.", exact: true }).check();
  const stored = await page.evaluate((key) => localStorage.getItem(key), CONVERSATION_STORAGE_KEY);
  expect(JSON.parse(stored!).turns).toHaveLength(1);
  expect(stored).not.toContain("reviewConfirmed"); expect(stored).not.toContain('"drafts"');
  await page.reload();
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(1);
  await expect(page.getByLabel("Participant preferred language")).toHaveValue("es-419");
  await expect(page.getByLabel("Explanation engine")).toHaveValue("sample");
  await expect(page.getByLabel("Clinician message", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Share this turn", exact: true })).toHaveCount(0);
  const other = await context.newPage(); await other.goto("/");
  await expect(other.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(1);
  await other.close();
});
test("Delete saved conversation and New session remove persisted turns", async ({ page }) => {
  for (const label of ["Delete saved conversation", "New session"]) {
    await prepared(page);
    await page.getByRole("button", { name: "Menu", exact: true }).click(); await page.getByRole("button", { name: label, exact: true }).click();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), CONVERSATION_STORAGE_KEY)).toBeNull();
    await page.reload(); await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(0);
  }
});
test("invalid stored data and unavailable browser storage leave a usable app", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{"version":999}'), CONVERSATION_STORAGE_KEY);
  await page.goto("/"); await expect(page.getByRole("status")).toContainText("could not be loaded");
  await page.getByLabel("Clinician message", { exact: true }).fill("Still editable");
  await page.getByRole("button", { name: "Menu", exact: true }).click(); await page.getByRole("button", { name: "Delete saved conversation", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), CONVERSATION_STORAGE_KEY)).toBeNull();
});
test("blocked storage reports failure without losing the current conversation", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("blocked", "QuotaExceededError"); }; });
  await page.goto("/"); await page.getByLabel("Explanation engine").selectOption("sample");
  await page.getByRole("button", { name: "Try a sample", exact: true }).click(); await page.getByRole("button", { name: "Open prepared conversation", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("only in memory");
  await expect(page.getByRole("region", { name: "Shared conversation", exact: true }).locator("article")).toHaveCount(SAMPLE_VISIT.length);
});
