/**
 * Re-record the silent, captioned sample walkthrough.
 * Start the production app first: npm run build && npm run start -- --port 3001
 * Run: PLAYWRIGHT_BROWSERS_PATH=/private/tmp/omni-playwright node scripts/record-demo.mjs
 * Optional: DEMO_URL and PLAYWRIGHT_CHROME_PATH override the local defaults.
 * Add --screenshots-only to refresh the stills without recording another video.
 * This uses the actual prepared-sample UI; it never simulates live Gemini or speech.
 */
import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= "/private/tmp/omni-playwright";
const { chromium } = await import("@playwright/test");
const baseURL = process.env.DEMO_URL || "http://127.0.0.1:3001";
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const screenshotsOnly = process.argv.includes("--screenshots-only");
const output = path.resolve("docs");
const screenshots = path.join(output, "screenshots");
const temporaryVideo = await mkdtemp(path.join(tmpdir(), "omni-bridge-recording-"));
await mkdir(screenshots, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
  ...(screenshotsOnly ? {} : { recordVideo: { dir: temporaryVideo, size: { width: 1440, height: 960 } } }),
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);

async function selectSample(target = page) {
  await target.goto(baseURL, { waitUntil: "networkidle" });
  await target.getByLabel("Explanation engine").selectOption("sample");
}

async function createDraft() {
  await page.getByRole("button", { name: /^(Create|Regenerate) explanation$/ }).click();
  await page.getByText("Prepared sample", { exact: true }).waitFor();
  await page.locator(".review-heading-row").scrollIntoViewIfNeeded();
}

async function releaseDraft(target = page) {
  const checkbox = target.getByRole("checkbox", { name: "I have reviewed the source" });
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.check();
  const share = target.getByRole("button", { name: "Share with participant", exact: true });
  await share.scrollIntoViewIfNeeded();
  await share.click();
  await target.locator(".participant-translation").waitFor();
  await target.locator(".participant-panel").evaluate((element) => { element.scrollTop = 0; });
}

async function changeLocale(locale) {
  await page.getByLabel("Participant preferred language").selectOption(locale);
  await page.locator(".coordinator-column").evaluate((element) => { element.scrollTop = 0; });
}

async function verifyParticipantLayout(target, label, expectedHeight) {
  const geometry = await target.locator(".participant-panel").evaluate((panel) => {
    const actions = panel.querySelector(".participant-actions").getBoundingClientRect();
    const footer = panel.querySelector(".participant-bottom").getBoundingClientRect();
    return { actionsBottom: actions.bottom, footerTop: footer.top, panelHeight: panel.getBoundingClientRect().height, scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight };
  });
  if (geometry.actionsBottom > geometry.footerTop + 1) throw new Error(`${label}: copy controls overlap the participant footer.`);
  if (expectedHeight && Math.abs(geometry.panelHeight - expectedHeight) > 1) throw new Error(`${label}: desktop workspace height changed unexpectedly.`);
  console.log(`${label} layout verified: ${JSON.stringify(geometry)}`);
}

async function caption(title, body) {
  await page.evaluate(({ title, body }) => {
    let caption = document.getElementById("recording-caption");
    if (!caption) {
      caption = document.createElement("aside");
      caption.id = "recording-caption";
      caption.setAttribute("aria-hidden", "true");
      Object.assign(caption.style, {
        position: "fixed", left: "100px", bottom: "18px", right: "28px", zIndex: "10000",
        pointerEvents: "none", background: "rgba(23, 62, 50, 0.97)", color: "#f8fbf5",
        borderRadius: "8px", padding: "17px 22px", fontFamily: "Arial, Helvetica, sans-serif",
        boxShadow: "0 6px 30px rgba(15, 44, 30, .1)", display: "grid",
        gridTemplateColumns: "190px 1fr", columnGap: "24px", alignItems: "center",
      });
      document.body.append(caption);
    }
    caption.replaceChildren();
    const label = document.createElement("div");
    Object.assign(label.style, { fontSize: "10px", letterSpacing: "1.4px", lineHeight: "1.7", color: "#c2d7b9" });
    label.textContent = "OMNI-BRIDGE\nPREPARED SAMPLE DEMO";
    label.style.whiteSpace = "pre-line";
    const content = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = title;
    Object.assign(heading.style, { display: "block", fontWeight: "500", fontSize: "18px", marginBottom: "5px" });
    const description = document.createElement("p");
    description.textContent = body;
    Object.assign(description.style, { margin: "0", fontSize: "13px", lineHeight: "1.5", color: "#cfdec7" });
    content.append(heading, description);
    caption.append(label, content);
  }, { title, body });
}

async function scene(seconds, title, body, action) {
  const start = Date.now();
  await caption(title, body);
  console.log(`Scene: ${title}`);
  if (action) await action();
  const remaining = seconds * 1000 - (Date.now() - start);
  if (remaining > 0) await page.waitForTimeout(remaining);
}

try {
  if (!screenshotsOnly) {
  await selectSample();
  console.log(`Recording started: ${baseURL} · 180-second prepared sample walkthrough`);

  await scene(12, "A clinical research conversation, in two views.", "A coordinator reviews explanations before sharing them. This recording uses prepared samples, not live Gemini or microphone input.");
  await scene(12, "Start with the original study document.", "The fictional CLEAR Study stays visible. Highlights call attention to numbers, uncertainty, and participant rights.", async () => {
    await page.getByRole("button", { name: /02 Group assignment/ }).click();
  });
  await scene(14, "Create a Turkish explanation. Keep the draft private.", "The participant still sees a waiting screen while the coordinator reviews the draft and its English rendering.", createDraft);
  await scene(16, "Review first. Then share.", "The coordinator explicitly reviews the wording. The participant receives a plain-language explanation and the study’s 50/50 assignment diagram.", releaseDraft);
  await scene(16, "Switching languages clears the previous explanation.", "Select Spanish, generate another prepared sample, and review it before sharing. Language changes never reuse an old draft.", async () => {
    await changeLocale("es-419");
    await page.waitForTimeout(1800);
    await createDraft();
    await page.waitForTimeout(2200);
    await releaseDraft();
  });
  await scene(16, "Explain study procedures in Portuguese.", "The source and translated sample retain 4 visits, 8 weeks, approximately 60 minutes, and the 5 mL sample size.", async () => {
    await changeLocale("pt-BR");
    await page.getByRole("button", { name: /03 Visits & procedures/ }).click();
    await createDraft();
    await page.waitForTimeout(2000);
    await releaseDraft();
  });
  await scene(14, "The same reviewed workflow, in Hindi.", "Five language options share one deliberate process. These prepared translations demonstrate the interface, not clinical validation.", async () => {
    await changeLocale("hi-IN");
    await createDraft();
    await page.waitForTimeout(1800);
    await releaseDraft();
  });
  await scene(14, "And in Mandarin.", "Readable text and a simple visit sequence support a conversation with the research team.", async () => {
    await changeLocale("zh-CN");
    await createDraft();
    await page.waitForTimeout(1800);
    await releaseDraft();
  });
  await scene(18, "Use a reviewed, typed conversation source.", "This is real editable input using the supported sample script. The microphone remains available in supported browsers, but is not used in this recording.", async () => {
    await changeLocale("tr-TR");
    await page.getByRole("tab", { name: "Conversation", exact: true }).click();
    await page.getByRole("button", { name: "Clear transcript", exact: true }).click();
    await page.getByLabel("ENGLISH SOURCE").pressSequentially("You have a 50% chance of being assigned to either group. Neither you nor the researcher chooses the group. You may receive a placebo, which has no active study drug.", { delay: 28 });
  });
  await scene(16, "Check the conversation draft against its source.", "Review notes and the English rendering help inspection. They do not independently verify translation accuracy.", async () => {
    await createDraft();
    await page.waitForTimeout(2500);
    await releaseDraft();
  });
  await scene(20, "Participant choice stays central.", "The withdrawal section explains leaving at any time without penalty and preserving regular care. Missing study policy is not invented.", async () => {
    await page.getByRole("tab", { name: "Consent guide", exact: true }).click();
    await page.getByRole("button", { name: /06 Leaving the study/ }).click();
    await createDraft();
    await page.waitForTimeout(2500);
    await releaseDraft();
  });
  await scene(12, "Reset for a fresh education session.", "Omni-Bridge supports understanding and questions. It does not collect consent, replace qualified interpretation, or provide personal medical advice.", async () => {
    await page.getByRole("button", { name: "New session", exact: true }).click();
    await page.locator(".coordinator-column").evaluate((element) => { element.scrollTop = 0; });
  });

  const video = page.video();
  await context.close();
  const videoPath = await video.path();
  await rename(videoPath, path.join(output, "demo.webm"));
  console.log("Saved docs/demo.webm");
  } else {
    await context.close();
  }

  const stills = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const still = await stills.newPage();
  await selectSample(still);
  await still.waitForTimeout(800);
  await still.screenshot({ path: path.join(screenshots, "desktop-workspace.png"), animations: "disabled" });
  await still.getByRole("button", { name: "Create explanation", exact: true }).click();
  await still.getByText("Prepared sample", { exact: true }).waitFor();
  await releaseDraft(still);
  await still.locator(".coordinator-column").evaluate((element) => { element.scrollTop = 0; });
  await still.waitForTimeout(800);
  await verifyParticipantLayout(still, "Desktop", 865);
  await still.screenshot({ path: path.join(screenshots, "desktop.png"), animations: "disabled" });
  await still.setViewportSize({ width: 390, height: 844 });
  await still.evaluate(() => window.scrollTo(0, 0));
  await still.waitForTimeout(1000);
  await still.screenshot({ path: path.join(screenshots, "mobile.png"), animations: "disabled" });
  await still.locator(".participant-panel").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await still.waitForTimeout(1000);
  await verifyParticipantLayout(still, "Mobile");
  await still.screenshot({ path: path.join(screenshots, "mobile-participant.png"), animations: "disabled" });
  const overflow = await still.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error("Mobile screenshot has horizontal overflow.");
  await stills.close();
  console.log("Saved desktop-workspace.png, desktop.png, mobile.png, mobile-participant.png; mobile has no horizontal overflow.");
} finally {
  await browser.close();
  await rm(temporaryVideo, { recursive: true, force: true });
}
