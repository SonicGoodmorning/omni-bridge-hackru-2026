import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined,
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
  await page.goto(pathToFileURL(resolve("docs/demo-slides.html")).href);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "docs/demo-slides.pdf", printBackground: true, preferCSSPageSize: true });
  console.log("Exported docs/demo-slides.pdf");
} finally {
  await browser.close();
}
