// Run ambient loops only while visible (and the tab is shown). Never start under reduced motion.
import { reduced } from "./motion.js";

/**
 * whileVisible(el, start, stop, margin = "10%") → dispose()
 * start/stop are called on each transition. Returns a function that stops and disconnects.
 */
export function whileVisible(el, start, stop, margin = "10%") {
  if (reduced() || !el) return () => {};
  let inView = false, running = false;
  const sync = () => {
    const want = inView && !document.hidden;
    if (want === running) return;
    running = want;
    want ? start() : stop();
  };
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { rootMargin: `${margin} 0px` });
  io.observe(el);
  document.addEventListener("visibilitychange", sync);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    if (running) { running = false; stop(); }
  };
}

/** Convenience: an interval that only ticks while visible. */
export function visibleInterval(el, fn, ms) {
  let id = 0;
  return whileVisible(el, () => { id = setInterval(fn, ms); }, () => clearInterval(id));
}
