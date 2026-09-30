// Lenis smooth scroll on the GSAP ticker (one RAF for the whole site) + routed anchor scrolling.
import { gsap, ScrollTrigger } from "./gsap.js";
import { reduced } from "./motion.js";

export let lenis = null;
const BAND = 48; // anchor offset: the band

export function initSmooth() {
  if (lenis || reduced() || !window.Lenis) return lenis;
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: false });
  lenis.on("scroll", ScrollTrigger.update);
  // Anything that can start a Lenis animation wakes its frame callback first.
  for (const k of ["scrollTo", "start"]) { const f = lenis[k].bind(lenis); lenis[k] = (...a) => { wake(); return f(...a); }; }
  WAKE.forEach((t) => addEventListener(t, wake, { capture: true, passive: true }));
  addEventListener("keydown", onKey);
  wake();
  return lenis;
}

// Scroll keys go through Lenis too. A native key scroll moves the page on the compositor and the transform
// pins (lib/pin.js, pinType "transform" under Lenis) follow a frame late: the stage, wall and finale would shake.
// Widgets that own their keys (fields, sliders, menus, the dialog) and handlers that preventDefault keep them.
const OWN_KEYS = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog,[role="slider"],[role^="menu"],[role="listbox"],[role="option"],[role="radiogroup"],[role="radio"],[role="tablist"],[role="tab"],[role="grid"],[role="spinbutton"]';
const OWN_SPACE = 'button,summary,[role="button"],[role="switch"],[role="checkbox"]';   // Space activates these (a link scrolls)
function onKey(e) {
  if (!lenis || lenis.isStopped || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target instanceof Element ? e.target : null;
  if (t?.closest(OWN_KEYS)) return;
  const page = Math.max(40, innerHeight - BAND - 60);
  let d;
  switch (e.key) {
    case "ArrowDown": d = 60; break;
    case "ArrowUp": d = -60; break;
    case "PageDown": d = page; break;
    case "PageUp": d = -page; break;
    case " ": if (t?.closest(OWN_SPACE)) return; d = e.shiftKey ? -page : page; break;
    case "Home": d = -Infinity; break;
    case "End": d = Infinity; break;
    default: return;
  }
  if (e.shiftKey && e.key !== " ") return;   // shift+arrows extend a text selection
  e.preventDefault();
  lenis.scrollTo(Math.max(0, Math.min(lenis.limit, lenis.targetScroll + d)));
}

// A parked page runs nothing: once Lenis has settled for ~20 frames its callback leaves the GSAP ticker,
// and input (or a scrollTo/start) puts it back. Native scroll events (scrollbar drag, keys, touch) reach
// Lenis without a frame callback.
const WAKE = ["wheel", "pointerdown", "keydown", "touchstart"];
let awake = false, still = 0;
const raf = (t) => {
  if (!lenis) return;
  lenis.raf(t * 1000);
  if (lenis.isScrolling) still = 0;
  else if (++still > 20) { gsap.ticker.remove(raf); awake = false; }
};
function wake() {
  still = 0;
  if (awake || !lenis) return;
  awake = true;
  gsap.ticker.add(raf);
}

export function destroySmooth() {
  if (!lenis) return;
  gsap.ticker.remove(raf); awake = false;
  WAKE.forEach((t) => removeEventListener(t, wake, { capture: true }));
  removeEventListener("keydown", onKey);
  lenis.destroy();
  lenis = null;
}

export const stop = () => lenis && lenis.stop();
export const start = () => lenis && lenis.start();

const pinTriggerFor = (el) =>
  ScrollTrigger.getAll().find((st) => st.pin && (el === st.trigger || el.contains(st.trigger)));

/**
 * scrollTo(target, { progress, immediate })
 * target: number (px) | "#id" | Element. With `progress` (0..1) and a pinned section, lands at
 * st.start + progress·(st.end − st.start) of that section's pin.
 */
export function scrollTo(target, { progress, immediate = false, onComplete } = {}) {
  let y;
  if (typeof target === "number") y = target;
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const st = progress != null ? pinTriggerFor(el) : null;
    if (st) y = st.start + progress * (st.end - st.start);
    else y = el.getBoundingClientRect().top + window.scrollY - (el.id === "top" ? 0 : BAND);
  }
  y = Math.max(0, Math.min(y, ScrollTrigger.maxScroll(window)));
  if (lenis) lenis.scrollTo(y, { immediate, force: true, duration: immediate ? 0 : 1.4, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete });
  else { window.scrollTo({ top: y, behavior: "auto" }); onComplete && onComplete(); }
}

let marks = [];   // one ScrollTrigger per section (keepPosition): cached section ranges from the last refresh

/**
 * readingPosition() → { id, progress } inside an active pin, else { id, ratio } through the section at the
 * top of the screen. Pin lengths are in vh, so a raw scrollY lands on a different beat after any resize.
 * Reads ScrollTrigger's cached ranges, not live rects: on a resize event the page has already reflowed,
 * but those still describe the layout the reader was looking at.
 */
export function readingPosition() {
  const pin = ScrollTrigger.getAll().find((st) => st.pin && st.isActive);
  const sec = pin && pin.trigger.closest("main > section");
  if (sec) return { id: sec.id, progress: pin.progress };
  const y = window.scrollY, m = marks.find((st) => y < st.end) || marks[marks.length - 1];
  return m ? { id: m.trigger.id, ratio: Math.max(0, (y - m.start) / Math.max(1, m.end - m.start)) } : null;
}

/** restorePosition(pos) — lands on readingPosition()'s spot in the current layout, instantly. */
export function restorePosition(pos) {
  const el = pos && document.getElementById(pos.id);
  if (!el) return;
  lenis && lenis.resize();   // a Lenis built before the pins existed still clamps to the short page
  if (pos.progress != null && pinTriggerFor(el)) return scrollTo(el, { progress: pos.progress, immediate: true });
  const m = marks.find((st) => st.trigger === el);
  if (m) scrollTo(m.start + (pos.ratio || 0) * (m.end - m.start), { immediate: true });
}

/**
 * keepPosition() — across viewport resizes (and the breakpoint rebuilds they cause), puts the reader
 * back on the same beat after ScrollTrigger refreshes. Captured on the first resize event, re-applied on
 * every refresh until the resizing has been quiet for a second. Height-only changes on touch (the URL
 * bar) are ignored, as ScrollTrigger ignores them.
 */
export function keepPosition() {
  marks = [...document.querySelectorAll("main > section")].map((el) =>
    ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom top", refreshPriority: -20 }));   // after every pin
  let pending = null, w = innerWidth, clear = 0;
  const onResize = () => {
    const touchBar = innerWidth === w && matchMedia("(hover: none)").matches;
    w = innerWidth;
    if (touchBar) return;
    pending ||= readingPosition();
    clearTimeout(clear);
    clear = setTimeout(() => { pending = null; }, 1000);
  };
  const onRefresh = () => {
    if (!pending) return;
    restorePosition(pending);
    ScrollTrigger.update();
  };
  addEventListener("resize", onResize);
  ScrollTrigger.addEventListener("refresh", onRefresh);
  return () => {
    removeEventListener("resize", onResize); ScrollTrigger.removeEventListener("refresh", onRefresh); clearTimeout(clear);
    marks.forEach((st) => st.kill()); marks = [];
  };
}

/** Routes every in-page link (a[href^="#"], optional data-progress) through scrollTo. */
export function bindAnchors() {
  const onClick = (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0) return;
    const id = a.getAttribute("href");
    const el = id === "#" || id === "#top" ? document.body : document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const progress = a.dataset.progress != null ? parseFloat(a.dataset.progress) : undefined;
    const focus = () => {
      if (el === document.body) return;
      if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    scrollTo(el === document.body ? 0 : el, { progress, onComplete: focus });
    if (!lenis) focus();
    history.replaceState(null, "", id === "#" ? location.pathname : id);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
