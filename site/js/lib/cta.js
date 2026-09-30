// The CTA system (SPEC §5.4), shared by every section:
//   .cta        the Mac download: a NotchShape that hangs from a hairline and opens like a peek
//   .cta-ghost  Windows: the same notch, dashed (dashed = forecast on this site), hanging under the primary
//   .gh-chip    GitHub: octocat + label + a live, rolling star count ([data-stars])
// and the contract behind them (sections only write markup):
//   data-cta="mac" → the Mac email dialog · data-cta="windows" → the waitlist dialog · data-cta="github" → the repo
// The dialogs live in lib/signup.js and load on the first intent (hover, focus or tap on a [data-cta]).
import { gsap } from "./gsap.js";
import { reduced, finePointer, SPR } from "./motion.js";
import { notchPath } from "./notch-path.js";
import { magnetic } from "./magnetic.js";
import { Roller } from "./numbers.js";

export const REPO = "https://github.com/FreemanGT/claude-meter";
export const DMG = "/ClaudeMeter.dmg";
/** Below this the count reads as "nobody uses this": the chip shows its label alone (web/build.mjs agrees). */
export const MIN_STARS = 20;
/** No Mac in hand: a phone or a tablet (iPadOS reports "Macintosh", but with touch points). */
export const noMac = () => !!navigator.userAgentData?.mobile || /iPhone|iPod|iPad|Android/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
export const ARROW = { down: "M12 7.5v8m-3.5-3.5L12 15.5l3.5-3.5", up: "M12 16.5v-8m-3.5 3.5L12 8.5l3.5 3.5" };
const API = "https://api.github.com/repos/FreemanGT/claude-meter";
const NS = "http://www.w3.org/2000/svg";

// m: the hero tab · l · xl: the finale's island, which stays open (.cta--open) with the meta inside
const SIZES = { m: { w: 272, h: 56, rt: 10, rb: 22 }, l: { w: 320, h: 68, rt: 12, rb: 26 }, xl: { w: 440, h: 80, rt: 12, rb: 30 } };
const OPEN = 30; // extra height when open (56 → 86)
const GHOST = { rt: 8, rb: 20 };
let uid = 0;

export function initCtas(scope = document) {
  if (noMac()) scope.querySelectorAll('[data-cta="mac"]').forEach(away);
  const kills = [
    ...[...scope.querySelectorAll(".cta:not([data-cta-bound])")].map(bind),
    ...[...scope.querySelectorAll(".cta-ghost:not([data-cta-bound])")].map(bindGhost),
  ];
  return () => kills.forEach((k) => k());
}

/** Phones and tablets can't open a .dmg: every Mac CTA says what it does there (lib/signup.js hands the link to
 *  their Mac), and its arrow points up, the way the link goes. One name for one action, wherever it is tapped. */
function away(a) {
  const l = a.querySelector(".cta__label, .band__dl-label");
  if (l) l.textContent = "Get it on your Mac";
  a.querySelectorAll("path").forEach((p) => { if (p.getAttribute("d") === ARROW.down) p.setAttribute("d", ARROW.up); });
  const al = a.getAttribute("aria-label");
  if (al) a.setAttribute("aria-label", "Get Claude Meter on your Mac");
}

// Installing is a .dmg, a drag and an open, never "one click" (and the Mac CTA now asks for an email).
const CURSOR = { "free · one click": "free · .dmg · v1.2", "v1.2 · one click": "macOS 14.4+ · free" };

/** Focus ring on the notch path, two-tone like the global :focus-visible (teal, then ink outside it). */
function focusPaths(svg) {
  svg.querySelectorAll(".cta__foc").forEach((p) => p.remove());
  const mk = (cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("class", cls); svg.append(p); return p; };   // after the fill: .cta__shape path:first-of-type stays the fill
  const ink = mk("cta__foc cta__foc--ink"), teal = mk("cta__foc");
  return (w, h, rt, rb) => [[teal, 2.5], [ink, 5]].forEach(([p, o]) => {
    p.setAttribute("d", notchPath(w + 2 * o, h + o, rt, rb + o).slice(0, -1));   // open top: the hairline is the edge
    p.setAttribute("transform", `translate(${-o} 0)`);
  });
}

function bind(a) {
  a.setAttribute("data-cta-bound", "");
  if (CURSOR[a.dataset.cursor]) a.dataset.cursor = CURSOR[a.dataset.cursor];
  const size = SIZES[a.classList.contains("cta--xl") ? "xl" : a.classList.contains("cta--l") ? "l" : "m"];
  const always = a.classList.contains("cta--open");
  const submit = a.type === "submit";   // a form's submit: the form decides when to play the click (fire())
  const hang = a.parentElement;
  const svg = a.querySelector(".cta__shape");
  const [fill, hot] = svg.querySelectorAll("path:not(.cta__foc)");
  const ringFocus = focusPaths(svg);
  const val = a.querySelector(".cta__ring .val");
  const label = a.querySelector(".cta__label");
  const meta = a.querySelector(".cta__meta");
  const row = a.querySelector(".cta__row");
  const baseLabel = label.textContent;
  const id = `cta-kl-${++uid}`;
  const pad = 2; // room for the flare + stroke
  // Width: the size's width, shrunk to the column; the full column on phones with .cta-hang--full.
  let W = size.w;
  const fit = () => {
    const avail = hang.clientWidth || size.w;
    W = a.closest(".cta-hang--full") && innerWidth < 768 ? avail : Math.min(size.w, avail);
    svg.setAttribute("width", W + pad * 2);
    svg.setAttribute("height", size.h + OPEN + pad);
    svg.setAttribute("viewBox", `${-pad} 0 ${W + pad * 2} ${size.h + OPEN + pad}`);
    a.style.setProperty("--cta-w", `${W}px`);
    hang.style.setProperty("--cta-w", `${W}px`);   // a .cta-ghost hanging under the tab reads these
  };
  fit();
  svg.querySelector("defs")?.remove(); // re-bind after a breakpoint flip
  svg.insertAdjacentHTML("afterbegin", `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" r="140" cx="-999" cy="-999"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`);
  hot.setAttribute("stroke", `url(#${id})`);
  const grad = svg.querySelector("radialGradient");

  const geo = { h: size.h, ring: 46 };
  const draw = () => {
    const d = notchPath(W, geo.h, size.rt, size.rb);
    fill.setAttribute("d", d); hot.setAttribute("d", d);
    ringFocus(W, geo.h, size.rt, size.rb);
    a.style.setProperty("--cta-h", `${geo.h}px`);
    hang.style.setProperty("--cta-h", `${geo.h}px`);
  };
  const ring = () => {
    val.style.strokeDashoffset = String(100 - geo.ring);
    a.classList.toggle("is-hot", geo.ring > 85);
  };
  a.style.setProperty("--cta-h0", `${size.h}px`);
  a.style.setProperty("--cta-h1", `${size.h + OPEN}px`);
  hang.style.setProperty("--cta-rt", `${size.rt}px`);
  hang.style.setProperty("--cta-rb", `${size.rb}px`);

  const ro = new ResizeObserver(() => { const w = W; fit(); if (W !== w) draw(); });
  ro.observe(hang);

  // The label rolls (numbers.js Roller: changed characters roll, shared ones stay: "Download for Mac" → "Downloading…").
  let roller = null, restore = 0;
  const roll = (text) => {
    if (reduced()) { (roller ? roller.set(text, { instant: true }) : (label.textContent = text)); return; }
    (roller ||= new Roller(label, { value: label.textContent })).set(text);
  };
  /** The click, on demand: 120ms shake, the ring springs back to 0, the label rolls to `text` (and back after `hold` ms). */
  a.ctaFire = (text, { hold = 2400 } = {}) => {
    if (!reduced()) {
      gsap.fromTo(a, { x: 0 }, { keyframes: { x: [0, -4, 4, -2, 0] }, duration: 0.12, ease: "none" });
      gsap.fromTo(geo, { ring: geo.ring }, { ring: 0, ...SPR.open, onUpdate: ring, overwrite: "auto" });
    }
    clearTimeout(restore);
    if (text) roll(text);
    if (text && hold) restore = setTimeout(() => roll(baseLabel), hold);
  };
  a.ctaReset = () => { clearTimeout(restore); roll(baseLabel); };

  if (reduced()) {
    geo.h = size.h + OPEN; draw(); ring();
    a.classList.add("is-open", "is-static");
    return () => { ro.disconnect(); clearTimeout(restore); a.removeAttribute("data-cta-bound"); };
  }
  if (always) { geo.h = size.h + OPEN; a.classList.add("is-open"); }
  else gsap.set(meta, { opacity: 0, filter: "blur(4px)", scaleX: 0.6 });
  draw(); ring();

  let openTl = null;
  const open = () => {
    if (!always) {
      a.classList.add("is-open");
      gsap.to(geo, { h: size.h + OPEN, ...SPR.open, onUpdate: draw, overwrite: "auto" });
      gsap.to(meta, { opacity: 1, filter: "blur(0px)", scaleX: 1, duration: 0.3, delay: 0.06, ease: "settle", overwrite: "auto" });
    }
    gsap.to(geo, { ring: 100, duration: 0.5, ease: "power2.inOut", onUpdate: ring, overwrite: "auto" });
    openTl && openTl.kill();
    openTl = gsap.timeline().to(a.querySelector(".cta__ring .arrow"), { y: 2, duration: 0.14, yoyo: true, repeat: 3, ease: "power1.inOut" });
  };
  // Keyboard focus opens it like a hover; a programmatic focus (a dialog handing focus back) doesn't.
  const onFocus = () => { if (a.matches(":focus-visible")) open(); };
  const close = () => {
    if (a.matches(":hover") || a.matches(":focus-visible")) return;
    if (!always) {
      a.classList.remove("is-open");
      gsap.to(geo, { h: size.h, ...SPR.close, onUpdate: draw, overwrite: "auto" });
      gsap.to(meta, { opacity: 0, filter: "blur(4px)", scaleX: 0.3, duration: 0.18, overwrite: "auto" });
    }
    gsap.to(geo, { ring: 46, duration: 0.5, ease: "power2.inOut", onUpdate: ring, overwrite: "auto" });
  };
  const press = () => gsap.to(row, { scale: 0.97, duration: 0.12, ease: "settle" });
  const release = () => gsap.to(row, { scale: 1, ...SPR.play });
  // A plain .dmg link rolls to "Downloading…"; a data-cta link only shakes (the signup dialog takes it from
  // there); any other button only shakes and lets its owner say what happened.
  const dmg = a.tagName === "A" && /\.dmg$/.test(a.getAttribute("href") || "") && !a.dataset.cta;
  const click = () => { if (!submit) a.ctaFire(dmg ? "Downloading…" : null); };

  a.addEventListener("pointerenter", open);
  a.addEventListener("focus", onFocus);
  a.addEventListener("pointerleave", close);
  a.addEventListener("blur", close);
  a.addEventListener("pointerdown", press);
  a.addEventListener("pointerup", release);
  a.addEventListener("pointercancel", release);
  a.addEventListener("click", click);

  // Key light: a second rim lit from the pointer, fading in within 220px.
  let raf = 0, px = 0, py = 0;
  const kl = () => {
    raf = 0;
    const r = svg.getBoundingClientRect();
    const x = px - r.left - pad, y = py - r.top;
    grad.setAttribute("cx", x); grad.setAttribute("cy", y);
    const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom);
    hot.style.opacity = String(Math.max(0, 1 - Math.hypot(dx, dy) / 220) * 0.55);
  };
  const onMove = (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(kl); };
  const fine = finePointer();
  if (fine) window.addEventListener("pointermove", onMove, { passive: true });
  const unmag = magnetic(a, { strength: 0.3, radius: 40, max: [6, 6], inner: row });   // the label never leaves its tab

  return () => {
    ro.disconnect();
    unmag();
    clearTimeout(restore);
    cancelAnimationFrame(raf);
    if (fine) window.removeEventListener("pointermove", onMove);
    a.removeEventListener("pointerenter", open); a.removeEventListener("focus", onFocus);
    ["pointerleave", "blur"].forEach((t) => a.removeEventListener(t, close));
    a.removeEventListener("pointerdown", press); a.removeEventListener("pointerup", release);
    a.removeEventListener("pointercancel", release); a.removeEventListener("click", click);
    a.removeAttribute("data-cta-bound");
  };
}

/** .cta-ghost: draws its open, dashed notch at its real size (the markup's path is the no-JS fallback). */
function bindGhost(g) {
  g.setAttribute("data-cta-bound", "");
  const svg = g.querySelector(".cta-ghost__shape");
  if (!svg) return () => g.removeAttribute("data-cta-bound");
  const path = svg.querySelector("path:not(.cta__foc)");
  const ringFocus = focusPaths(svg);
  const draw = () => {
    const w = g.offsetWidth, h = g.offsetHeight;
    if (!w || !h) return;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    path.setAttribute("d", notchPath(w, h, GHOST.rt, GHOST.rb).slice(0, -1));
    ringFocus(w, h, GHOST.rt, GHOST.rb);
  };
  const ro = new ResizeObserver(draw);
  ro.observe(g);
  draw();
  return () => { ro.disconnect(); g.removeAttribute("data-cta-bound"); };
}

/* ------------------------------------------------------------------ the contract */

let signup = null;
const loadSignup = () => (signup ||= import("./signup.js").catch((e) => { signup = null; throw e; }));

/** Binds the CTA contract once per page (event delegation: sections can re-render freely). */
export function initContract() {
  const html = document.documentElement;
  if (/Windows/.test(navigator.userAgent)) html.dataset.os = "windows";   // the head script sets it before paint; this is the fallback
  const pick = (t) => t?.closest?.('[data-cta="mac"], [data-cta="windows"]');
  const warm = (e) => { if (pick(e.target)) loadSignup().catch(() => {}); };
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("focusin", warm);
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = pick(e.target);
    if (!t) return;
    e.preventDefault();
    const kind = t.dataset.cta, viaPointer = e.detail > 0;
    loadSignup().then((m) => m.openSignup(kind, t, { viaPointer }), (err) => {
      console.error("[cta] the signup dialog failed to load", err);
      if (kind === "mac") location.href = DMG;   // never block the download
    });
  });
  initStars();
}

/* ------------------------------------------------------------------ GitHub stars */
// The count ships in the HTML (build.mjs writes it into every [data-stars] and html[data-gh-stars]), so most
// visitors never call GitHub. A browser re-checks at most every 6h; a rate limit (60/h per IP, unauthenticated)
// or any miss backs off until GitHub's reset (1h at least). Under MIN_STARS or unknown: the number stays hidden
// (the chip reads "Star on GitHub"), and it rolls in the day it crosses.

const H6 = 6 * 3600e3, H1 = 3600e3;
const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let stars = 0;
export const fmtStars = (n) => (n < 1000 ? String(n) : (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "k");

/** Paints the count into every [data-cta="github"] in scope (and their aria-labels). `roll` rolls it from `from`. */
export function paintStars(scope = document, { roll = false, from = 0 } = {}) {
  const show = stars >= MIN_STARS;
  scope.querySelectorAll('[data-cta="github"]').forEach((a) => {
    if (a.tagName === "A") {
      if (!a.getAttribute("href") || a.getAttribute("href") === "#") a.href = REPO;
      a.target = "_blank";
      a.rel = "noopener";
    }
    const base = a.dataset.label ?? (a.dataset.label = a.getAttribute("aria-label") || "");
    if (base) a.setAttribute("aria-label", show ? `${base}, ${stars} ${stars === 1 ? "star" : "stars"}` : base);
    const n = a.querySelector("[data-stars]");
    if (!n) return;
    n.hidden = !show;
    if (!show) return;
    if (roll && !reduced()) (n._roller ||= new Roller(n, { value: from, format: fmtStars })).set(stars);
    else if (n._roller) n._roller.set(stars, { instant: true });
    else n.textContent = fmtStars(stars);
  });
}

async function fetchStars({ force = false } = {}) {
  const c = get("cm-stars") || {};
  if (c.until > Date.now()) return;
  const miss = (until) => put("cm-stars", { n: c.n || 0, t: c.t || 0, until });
  try {
    const r = await fetch(API, { headers: { Accept: "application/vnd.github+json" }, cache: force ? "no-cache" : "default" });
    if (!r.ok) {
      const reset = (+r.headers.get("x-ratelimit-reset") || 0) * 1000;
      return miss(Math.max(Date.now() + H1, r.status === 403 || r.status === 429 ? reset : 0));
    }
    const n = (await r.json()).stargazers_count;
    if (typeof n !== "number") return miss(Date.now() + H1);
    put("cm-stars", { n, t: Date.now() });
    if (n !== stars) { const from = stars; stars = n; paintStars(document, { roll: true, from }); }
  } catch { miss(Date.now() + H1); }
}

function initStars() {
  const html = document.documentElement;
  const built = +html.dataset.ghStars || 0, builtAt = +html.dataset.ghStarsAt || 0;
  const c = get("cm-stars") || {};
  stars = c.t > builtAt ? c.n || 0 : built;   // the newer of the two
  paintStars();
  if (Date.now() - Math.max(builtAt, c.t || 0) > H6 && !(c.until > Date.now())) {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
    idle(() => fetchStars(), { timeout: 4000 });
  }
  // Back from GitHub after a click: count once more, and roll it up if they starred.
  let armed = false;
  document.addEventListener("click", (e) => {
    if (armed || !e.target.closest?.('[data-cta="github"]')) return;
    armed = true;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVis);
      armed = false;
      fetchStars({ force: true });
    };
    document.addEventListener("visibilitychange", onVis);
  });
}
