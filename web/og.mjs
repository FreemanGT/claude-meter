// node web/og.mjs — renders web/og.html → site/assets/og.png (1200×630, DPR 1).
import puppeteer from "puppeteer-core";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--allow-file-access-from-files", "--force-color-profile=srgb"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, "og.html")).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(here, "..", "site", "assets", "og.png") });
await browser.close();
console.log("wrote site/assets/og.png");
