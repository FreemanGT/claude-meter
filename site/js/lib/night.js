// Night, reference-counted so overlapping zones never fight.
// html[data-night] only fades the fixed backdrop (a composited opacity fade, base.css) and flips a few
// targeted rules. The colour tokens swap per section: sections on or near the screen get .is-night, so
// a toggle restyles those subtrees instead of every element on the page.
import { ScrollTrigger } from "./gsap.js";

const keys = new Set();
const subs = new Set();
const near = new Set();
let io = null;

const sections = () => document.querySelectorAll("main > .s");
function watch() {
  if (io || typeof IntersectionObserver !== "function") return;
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target)));
    if (keys.size) near.forEach((s) => s.classList.add("is-night"));
  }, { rootMargin: "25% 0px" });
  sections().forEach((s) => io.observe(s));
}

const apply = () => {
  const on = keys.size > 0;
  document.documentElement.toggleAttribute("data-night", on);
  if (on) near.forEach((s) => s.classList.add("is-night"));
  else sections().forEach((s) => s.classList.remove("is-night"));
  subs.forEach((fn) => fn(on));
};

/** setNight(key, bool) — any key on → night. */
export function setNight(key, on) {
  watch();
  const had = keys.has(key);
  if (on && !had) keys.add(key);
  else if (!on && had) keys.delete(key);
  else return;
  apply();
}
export const isNight = () => keys.size > 0;
export const onNight = (fn) => (subs.add(fn), () => subs.delete(fn));

/** nightZone(el, { start = "top 55%", end = "bottom 45%" }) → ScrollTrigger */
export function nightZone(el, { start = "top 55%", end = "bottom 45%", key = el.id || "zone" } = {}) {
  watch();
  return ScrollTrigger.create({
    trigger: el, start, end,
    onToggle: (self) => setNight(key, self.isActive),
    onKill: () => setNight(key, false),
  });
}
