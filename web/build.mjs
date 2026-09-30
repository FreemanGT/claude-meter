#!/usr/bin/env node
// node web/build.mjs — stitches web/index.html + web/sections/<id>.html → site/index.html.
// Also: one <link> per section stylesheet, and FAQPage JSON-LD parsed from #faq <details>.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..", "site");
export const SECTIONS = ["stage", "wall", "loop", "yours", "privacy", "faq", "finale"];

let html = readFileSync(join(here, "index.html"), "utf8");
const missing = [];

html = html.replace(/<!-- @section:([a-z-]+) -->/g, (_, id) => {
  const f = join(here, "sections", `${id}.html`);
  if (!existsSync(f)) {
    missing.push(id);
    return `<section id="${id}" class="s s--${id}" data-section="${id}" aria-label="${id}"></section>`;
  }
  return readFileSync(f, "utf8").trim();
});

html = html.replace("<!-- @section-css -->", SECTIONS
  .filter((id) => existsSync(join(site, "css", `${id}.css`)))
  .map((id) => `<link rel="stylesheet" href="/css/${id}.css">`).join("\n"));

// <link rel=modulepreload> for main.js's whole module graph (static imports, the dynamic island.js and
// section imports), so the browser fetches it in one parallel wave instead of a 4-level waterfall.
const js = join(site, "js");
const graph = new Set();
const walk = (rel) => {
  if (graph.has(rel) || !existsSync(join(js, rel))) return;
  graph.add(rel);
  const src = readFileSync(join(js, rel), "utf8");
  const dir = dirname(rel);
  for (const [, spec] of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+\.js)["']/g)) walk(join(dir, spec));
};
walk("main.js");
SECTIONS.forEach((id) => walk(`${id}.js`));
html = html.replace("<!-- @modulepreload -->", [...graph].filter((f) => f !== "main.js")
  .map((f) => `<link rel="modulepreload" href="/js/${f}">`).join("\n"));

// FAQPage JSON-LD from the #faq section's <details>, so the text is identical to the page.
const text = (s) => s
  .replace(/<svg[\s\S]*?<\/svg>/g, "")
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "’")
  .replace(/&#8209;|\u2011/g, "-")   // non-breaking hyphens are typography: crawlers should see "API-key", "sign-in"
  .replace(/\s+/g, " ").trim();
const faqSection = (html.match(/<section[^>]*id="faq"[\s\S]*?<\/section>/) || [""])[0];
const qa = [...faqSection.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)].map(([, inner]) => {
  const summary = (inner.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || ["", ""])[1];
  const q = summary.match(/class="[^"]*\bfaq__q\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|h3|p|div)>/);
  const question = text(q ? q[1] : summary).replace(/^\d{1,3}%\s*/, "");
  const answer = text(inner.replace(/<summary[\s\S]*?<\/summary>/, ""));
  return { question, answer };
}).filter((x) => x.question && x.answer);

html = html.replace("<!-- @faq-jsonld -->", qa.length
  ? `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: qa.map((x) => ({ "@type": "Question", name: x.question, acceptedAnswer: { "@type": "Answer", text: x.answer } })),
    }).replace(/</g, "\\u003c")}</script>`
  : "");

writeFileSync(join(site, "index.html"), html);
const h1 = (html.match(/<h1[\s>]/g) || []).length;
console.log(`built site/index.html · ${(html.length / 1024).toFixed(1)} KB · ${qa.length} FAQ entries · ${h1} <h1> · ${graph.size - 1} modulepreloads`);
if (missing.length) console.error(`\x1b[31mWARNING: missing section files → empty placeholders: ${missing.join(", ")}\x1b[0m`);
if (h1 !== 1) console.error(`\x1b[31mWARNING: expected exactly one <h1>, found ${h1}\x1b[0m`);
if (qa.length && qa.length !== 10) console.error(`\x1b[33mnote: FAQ has ${qa.length} entries (SPEC says 10)\x1b[0m`);
