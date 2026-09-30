// Run ambient loops only while visible (and the tab is shown, and the visitor hasn't paused motion).
// Never start under reduced motion.
import { reduced } from "./motion.js";

// ---------------------------------------------------------------- page-wide pause (WCAG 2.2.2)
// html[data-paused]: every ambient loop stops (whileVisible below) and base.css pauses CSS loops. Toggled by
// any [data-pause-toggle] (§03's running head, the footer), remembered per viewer.
const KEY = "cm-paused";
const html = document.documentElement;
try { if ((localStorage.getItem(KEY) ?? localStorage.getItem("cm-loop-paused")) === "1") html.setAttribute("data-paused", ""); } catch {}

export const isPaused = () => html.hasAttribute("data-paused");
/** Pauses (or resumes) every ambient loop on the page; fires `cm:pause` (detail: paused) on document. */
export function setPaused(on) {
  if (on === isPaused()) return;
  html.toggleAttribute("data-paused", on);
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
  document.dispatchEvent(new CustomEvent("cm:pause", { detail: on }));
}

/** Binds every [data-pause-toggle] (its [data-pause-label] reads "Pause…" / "Play…"). Once per page. */
export function initPauseToggles() {
  const paint = () => document.querySelectorAll("[data-pause-toggle] [data-pause-label]").forEach((l) => {
    l.textContent = l.textContent.replace(/^(Pause|Play)/, isPaused() ? "Play" : "Pause");
  });
  document.addEventListener("click", (e) => { if (e.target.closest?.("[data-pause-toggle]")) setPaused(!isPaused()); });
  document.addEventListener("cm:pause", paint);
  paint();
}

/**
 * whileVisible(el, start, stop, margin = "10%", { ambient = true }) → dispose()
 * start/stop are called on each transition. Returns a function that stops and disconnects.
 * ambient: false for work that isn't motion (a clock, a readout): it keeps running while the page is paused.
 */
export function whileVisible(el, start, stop, margin = "10%", { ambient = true } = {}) {
  if (reduced() || !el) return () => {};
  let inView = false, running = false;
  const sync = () => {
    const want = inView && !document.hidden && !(ambient && isPaused());
    if (want === running) return;
    running = want;
    want ? start() : stop();
  };
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { rootMargin: `${margin} 0px` });
  io.observe(el);
  document.addEventListener("visibilitychange", sync);
  if (ambient) document.addEventListener("cm:pause", sync);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    document.removeEventListener("cm:pause", sync);
    if (running) { running = false; stop(); }
  };
}

/** Convenience: an interval that only ticks while visible (and, if ambient, while motion isn't paused). */
export function visibleInterval(el, fn, ms, opts) {
  let id = 0;
  return whileVisible(el, () => { id = setInterval(fn, ms); }, () => clearInterval(id), undefined, opts);
}
