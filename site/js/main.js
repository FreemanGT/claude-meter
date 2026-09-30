// Claude Meter — boot. Owns motion wiring, global chrome and the section registry.
// Sections export `default function init(root, ctx) → cleanup?` (see web/FOUNDATION.md).
import * as G from "./lib/gsap.js";
import * as motion from "./lib/motion.js";
import * as smooth from "./lib/smooth.js";
import * as split from "./lib/split.js";
import * as numbers from "./lib/numbers.js";
import * as format from "./lib/format.js";
import * as magneticM from "./lib/magnetic.js";
import * as cursor from "./lib/cursor.js";
import * as marqueeM from "./lib/marquee.js";
import * as reveal from "./lib/reveal.js";
import * as pin from "./lib/pin.js";
import * as night from "./lib/night.js";
import * as loop from "./lib/loop.js";
import * as meterM from "./lib/meter.js";
import * as notch from "./lib/notch-path.js";
import * as menu from "./lib/menu.js";
import * as banner from "./lib/banner.js";
import * as band from "./lib/band.js";
import * as cta from "./lib/cta.js";
import * as squashM from "./lib/squash.js";
import * as scribbleM from "./lib/scribble.js";
import * as demoM from "./lib/demo.js";
import { runIntro } from "./lib/intro.js";
import { initNav } from "./lib/nav.js";
import { initSignup } from "./lib/signup.js";

const { gsap, ScrollTrigger, SplitText } = G;
export const SECTIONS = ["stage", "wall", "loop", "yours", "privacy", "faq", "finale"];

// `lenis` is a live binding in smooth.js: sections read ctx.lenis instead, so it is left out of lib.
const { lenis: _lenis, initSmooth: _i, destroySmooth: _d, ...smoothKit } = smooth;

/** Every shared utility, flat: ctx.lib.revealLines, ctx.lib.Roller, ctx.lib.pinScene, … */
export const lib = Object.freeze({
  ...motion, ...smoothKit, ...split, ...numbers, ...format, ...magneticM, ...cursor, ...marqueeM, ...reveal, ...pin,
  ...night, ...loop, ...meterM, ...notch, ...menu, ...banner, ...band, ...cta, ...squashM, ...scribbleM, ...demoM,
  untracked: G.untracked, loadDrag: G.loadDrag,
});

const html = document.documentElement;
// The CTA contract (data-cta="mac" | "windows" | "github"), bound at once: a Download click must never
// wait for fonts or sections. Before this runs, the Mac links still download (their href is the fallback).
initSignup();
const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(() => fn({ didTimeout: true, timeRemaining: () => 0 }), 60));
const cancelIdle = (id) => ("cancelIdleCallback" in window ? cancelIdleCallback(id) : clearTimeout(id));

async function loadIsland() {
  try {
    const m = await import("./lib/island.js");
    if (typeof m.Island !== "function") throw new Error("island.js has no Island export");
    return m.Island;
  } catch (e) {
    console.error("[main] island.js unavailable — islands disabled", e);
    return null;
  }
}

async function loadSections() {
  return Promise.all(SECTIONS.map((id) => import(`./${id}.js`).then((m) => m.default, (e) => {
    console.error(`[main] ${id}.js failed to load`, e);
    return null;
  })));
}

async function boot() {
  const [Island, inits] = await Promise.all([loadIsland(), loadSections()]);
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

  // Once per page: things that don't depend on motion preference.
  meterM.meter.define(SECTIONS);
  band.initBand();
  smooth.bindAnchors();
  smooth.keepPosition();
  // Offscreen sections pause their CSS loops (base.css .is-off): a parked page runs nothing.
  const offIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("is-off", !e.isIntersecting)), { rootMargin: "10% 0px" });
  SECTIONS.forEach((id) => { const el = document.getElementById(id); el && offIO.observe(el); });

  let firstRun = true;
  const mm = gsap.matchMedia();
  mm.add({
    motion: "(prefers-reduced-motion: no-preference)",
    reduced: "(prefers-reduced-motion: reduce)",
    mobile: "(max-width: 767px)",
  }, (mmCtx) => {
    const { reduced, mobile } = mmCtx.conditions;
    html.dataset.motion = reduced ? "reduced" : "full";
    const cleanups = [];
    let dead = false, idleId = 0, next = 1;

    const lenis = reduced ? null : smooth.initSmooth();
    cleanups.push(() => smooth.destroySmooth());

    // The intro only plays on the very first run (never after a breakpoint/preference flip).
    const intro = firstRun ? runIntro({ heroScale: motion.heroScale() }) : { skipped: true, wings: Promise.resolve(), reveal: Promise.resolve(), done: Promise.resolve() };
    if (!firstRun) document.getElementById("intro")?.remove();

    const navIsland = initNav({ Island, reduced, mobile });
    cleanups.push(() => navIsland.destroy());

    const ctx = { gsap, ScrollTrigger, SplitText, reduced, mobile, lenis, meter: meterM.meter, navIsland, Island, intro, lib, add: null };

    const initSection = (i) => {
      const id = SECTIONS[i], root = document.getElementById(id), init = inits[i];
      if (!root || !init) return;
      let cleanup;
      const gctx = gsap.context(() => {}, root);
      const sctx = { ...ctx, add: (fn) => gctx.add(fn) };
      try { gctx.add(() => { cleanup = init(root, sctx); }); }
      catch (e) { console.error(`[main] ${id} init failed`, e); }
      cleanups.push(() => { try { typeof cleanup === "function" && cleanup(); } catch (e) { console.error(e); } gctx.revert(); });
    };

    // Everything below the hero, once every section has its pins (their spacing moves what follows).
    const finish = () => {
      cleanups.push(meterM.initMeter(SECTIONS, { reduced, lenis }));
      cleanups.push(reveal.initReveals(document));
      cleanups.push(cursor.initCursorTag());
      navIsland.settle();
      ScrollTrigger.refresh();
    };
    const flush = () => {
      if (dead || next >= SECTIONS.length) return;
      cancelIdle(idleId);
      mmCtx.add(() => { while (next < SECTIONS.length) initSection(next++); finish(); });
    };

    // The hero first, so it is live at once; the rest in idle slices (no single long boot task), before
    // anyone can scroll that far. A hash, an in-page link or a rebuild needs the final layout now.
    initSection(0);
    cleanups.push(cta.initCtas(document));
    window.__cm = { lenis, ScrollTrigger, gsap, meter: meterM.meter, navIsland, lib }; // QA + console debugging
    if (!firstRun || location.hash || scrollY > innerHeight) flush();
    else {
      const pump = (deadline) => {
        if (dead || next >= SECTIONS.length) return;
        mmCtx.add(() => { do initSection(next++); while (next < SECTIONS.length && deadline.timeRemaining() > 12); });
        if (next < SECTIONS.length) idleId = idle(pump);
        else mmCtx.add(finish);
      };
      // Start after the intro and the hero's line reveal, so section builds (long tasks on phones) don't
      // land on top of the first impression. The stage pin is 300% long: nobody scrolls past it first.
      intro.done.then(() => setTimeout(() => { if (!dead && next < SECTIONS.length) idleId = idle(pump); }, 700));
      const onLink = (e) => e.target.closest?.('a[href^="#"]') && flush();
      document.addEventListener("click", onLink, true);   // capture: runs before bindAnchors measures
      addEventListener("keydown", flush, { once: true });
      cleanups.push(() => { document.removeEventListener("click", onLink, true); removeEventListener("keydown", flush); });
    }
    firstRun = false;

    return () => {
      dead = true;
      cancelIdle(idleId);
      cleanups.reverse().forEach((fn) => { try { fn && fn(); } catch (e) { console.error(e); } });
    };
  });
}

boot().catch((e) => {
  console.error("[main] boot failed", e);
  html.classList.remove("is-intro");
  document.getElementById("intro")?.remove();
});
