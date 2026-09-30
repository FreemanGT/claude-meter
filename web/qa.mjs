#!/usr/bin/env node
/*
  Claude Meter QA — headless Chrome screenshots + error report.

  node web/qa.mjs [options]
    --url <u>          page to load (default http://localhost:4321/)
    --viewport <v>     desktop (1440×900) | mobile (390×844) | both (default) | WxH (e.g. 1024x768)
    --reduced          emulate prefers-reduced-motion: reduce
    --steps <N>        scroll the page in N equal steps (default: 400px steps, as SPEC §8)
    --wait <ms>        settle time per step (default 350)
    --out <dir>        output dir (default <scratchpad>/qa/<run-id>)
    --run <name>       run id used for the default out dir (default: timestamp)
    --frames <spec>    capture 10 frames at 60ms at each position; comma list of
                       <px> | <pct>% (of max scroll) | <sectionId>:<progress> (pinned section progress 0..1)
                       e.g. --frames stage:.26,stage:.72,wall:.42,finale:.75
    --only-frames      skip the step pass (frames only)
    --intro            let the intro play and capture it (14 frames from first paint; default: skipped)
    --overflow         check scrollWidth ≤ innerWidth at 320,375,390,768,1024,1440,1920
    --full             also save a full-page screenshot per viewport
  Prints console errors, page errors, failed requests, long tasks (>50ms after load) and exits 1 on errors.
  Look at the screenshots with the Read tool: "it ran" is not "it's right".
*/
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCRATCH = "/private/tmp/claude-501/-Users-freemansmain-Ai-Projects-Claude-Meter/0edf6b4a-3ed0-477f-a4e0-4b3091556a85/scratchpad";

const args = process.argv.slice(2);
const flag = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };

const url = opt("url", "http://localhost:4321/");
const vpArg = opt("viewport", "both");
const reduced = flag("reduced");
const steps = opt("steps") ? parseInt(opt("steps"), 10) : 0;
const wait = parseInt(opt("wait", "350"), 10);
const run = opt("run", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19));
const out = opt("out", join(SCRATCH, "qa", run));
const frames = (opt("frames", "") || "").split(",").filter(Boolean);
const VPS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const viewports = vpArg === "both" ? ["desktop", "mobile"] : [vpArg];
mkdirSync(out, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { errors: [], warnings: [], longTasks: [], overflow: [], shots: 0 };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });

async function openPage(vpName) {
  const page = await browser.newPage();
  const vp = VPS[vpName] || (() => { const [w, h] = vpName.split("x").map(Number); return { width: w, height: h }; })();
  await page.setViewport({ deviceScaleFactor: 1, ...vp });
  if (vp.isMobile) await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }]);
  const tag = `[${vpName}${reduced ? "/reduced" : ""}]`;
  // api.github.com (the star count) is best-effort and rate-limited per IP: a 403 there must not fail the gate.
  const ignored = (u = "") => u.endsWith(".dmg") || u.startsWith("https://api.github.com/");
  page.on("console", (m) => {
    if (m.type() === "error" && ignored(m.location()?.url)) report.warnings.push(`${tag} ignored: ${m.text()} ${m.location()?.url}`);
    else if (m.type() === "error") report.errors.push(`${tag} console: ${m.text()}`);
    else if (m.type() === "warn") report.warnings.push(`${tag} warn: ${m.text()}`);
  });
  page.on("pageerror", (e) => report.errors.push(`${tag} pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (!ignored(r.url())) report.errors.push(`${tag} requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !ignored(r.url())) report.errors.push(`${tag} HTTP ${r.status()}: ${r.url()}`); });
  await page.evaluateOnNewDocument((skipIntro) => {
    if (skipIntro) try { sessionStorage.setItem("cm-intro", "1"); } catch {}
    window.__longTasks = [];
    addEventListener("load", () => {
      setTimeout(() => new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__longTasks.push(Math.round(e.duration)))).observe({ type: "longtask" }), 1500);
    });
  }, !flag("intro"));
  if (flag("intro")) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let f = 0; f < 14; f++) {
      await page.screenshot({ path: join(out, `${vpName}-intro-${String(f).padStart(2, "0")}.png`) });
      report.shots++;
      await sleep(70);
    }
  } else await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(900);
  return { page, tag };
}

// Scroll that works with or without Lenis (main.js exposes window.__cm for QA).
const scrollTo = (page, y) => page.evaluate((y) => {
  const l = window.__cm?.lenis;
  if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  window.__cm?.ScrollTrigger?.update();
}, y);

async function resolvePos(page, spec) {
  return page.evaluate((spec) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (/^\d+$/.test(spec)) return +spec;
    if (spec.endsWith("%")) return (parseFloat(spec) / 100) * max;
    const [id, p] = spec.split(":");
    const el = document.getElementById(id);
    const ST = window.__cm?.ScrollTrigger;
    const st = ST && ST.getAll().find((s) => s.pin && el && (s.trigger === el || el.contains(s.trigger)));
    if (st) return st.start + parseFloat(p) * (st.end - st.start);
    return el ? el.getBoundingClientRect().top + scrollY + parseFloat(p || 0) * el.offsetHeight : 0;
  }, spec);
}

for (const vpName of viewports) {
  const { page, tag } = await openPage(vpName);
  const prefix = `${vpName}${reduced ? "-reduced" : ""}`;
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  console.log(`${tag} ${url} · scroll height ${max + (VPS[vpName]?.height || 0)}px`);

  if (!flag("only-frames")) {
    const ys = [];
    if (steps > 0) for (let i = 0; i <= steps; i++) ys.push(Math.round((max * i) / steps));
    else for (let y = 0; y < max; y += 400) ys.push(y);
    if (ys[ys.length - 1] !== max) ys.push(max);
    for (const [i, y] of ys.entries()) {
      await scrollTo(page, y);
      await sleep(wait);
      await page.screenshot({ path: join(out, `${prefix}-${String(i).padStart(3, "0")}-y${y}.png`) });
      report.shots++;
    }
  }

  for (const spec of frames) {
    const y = await resolvePos(page, spec);
    await scrollTo(page, Math.max(0, y - 200));
    await sleep(wait);
    await scrollTo(page, y);
    for (let f = 0; f < 10; f++) {
      await page.screenshot({ path: join(out, `${prefix}-frames-${spec.replace(/[:%.]/g, "_")}-${f}.png`) });
      report.shots++;
      await sleep(60);
    }
  }

  if (flag("full")) {
    await scrollTo(page, 0); await sleep(wait);
    await page.screenshot({ path: join(out, `${prefix}-full.png`), fullPage: true });
  }

  const lt = await page.evaluate(() => window.__longTasks);
  if (lt.length) report.longTasks.push(`${tag} ${lt.length} long tasks: ${lt.join(", ")}ms`);
  await page.close();
}

if (flag("overflow")) {
  for (const w of [320, 375, 390, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 900 });
    await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("cm-intro", "1"); } catch {} });
    await page.goto(url, { waitUntil: "networkidle0" });
    await sleep(600);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    if (r.sw > r.iw) report.overflow.push(`${w}px: scrollWidth ${r.sw} > ${r.iw}`);
    await page.close();
  }
}

await browser.close();
console.log(`\nshots: ${report.shots} → ${out}`);
for (const k of ["errors", "longTasks", "overflow", "warnings"]) {
  if (!report[k].length) { console.log(`${k}: none`); continue; }
  console.log(`${k} (${report[k].length}):`);
  [...new Set(report[k])].slice(0, 40).forEach((l) => console.log("  " + l));
}
process.exit(report.errors.length || report.overflow.length ? 1 : 0);
