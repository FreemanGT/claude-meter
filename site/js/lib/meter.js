// The page meter: how much of this page you've "used". Feeds the nav island.
import { gsap, ScrollTrigger } from "./gsap.js";

const subs = new Set();
let queued = false;
const emit = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; subs.forEach((fn) => fn(meter)); });
};

export const meter = {
  scrolled: 0,          // 0..100 of the whole page
  sections: [],         // [{ id, label, read (0..100 max reached), progress (0..100 live), history: number[] }]
  velocity: 0,          // px/s, 3s EMA, + = down
  overridden: null,     // number | null — the finale drives the left wing when set
  faq: { opened: 0, total: 10 },
  get display() { return this.overridden ?? this.scrolled; },
  get sectionsRead() { return this.sections.filter((s) => s.read >= 60).length; },
  get sectionsPct() { return this.sections.length ? (this.sectionsRead / this.sections.length) * 100 : 0; },
  override(pct) { this.overridden = pct == null ? null : Math.max(0, Math.min(100, pct)); emit(); },
  setFaq(opened, total = this.faq.total) { this.faq = { opened, total }; emit(); },
  subscribe(fn) { subs.add(fn); fn(meter); return () => subs.delete(fn); },
  /** Declares the section list (idempotent; keeps read history across re-inits). */
  define(ids) {
    if (this.sections.length === ids.length && this.sections.every((s, i) => s.id === ids[i])) return this;
    this.sections = ids.map((id, i) => ({ id, label: LABELS[id] || id, index: i + 1, read: 0, progress: 0, history: [] }));
    return this;
  },
};

const LABELS = { stage: "Tour", wall: "The wall", loop: "Loop", yours: "Yours", privacy: "Privacy", faq: "FAQ", finale: "The end" };

/** initMeter(ids, { reduced, lenis }) — main.js calls it after every section has created its pins. */
export function initMeter(ids, { reduced = false, lenis = null } = {}) {
  const made = [];
  made.push(ScrollTrigger.create({
    start: 0, end: "max", refreshPriority: -10,
    onUpdate: (st) => { meter.scrolled = st.progress * 100; emit(); },
  }));
  meter.define(ids);
  meter.sections.forEach((s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    made.push(ScrollTrigger.create({
      trigger: el, start: "top 80%", end: "bottom 80%", refreshPriority: -10,
      onUpdate: (st) => { s.progress = st.progress * 100; if (s.progress > s.read) s.read = s.progress; emit(); },
    }));
  });

  // Section read history for the pinned TOC sparklines, sampled every 2s (36 samples kept).
  const sample = setInterval(() => {
    if (document.hidden) return;
    meter.sections.forEach((s) => { s.history.push(s.read); if (s.history.length > 36) s.history.shift(); });
  }, 2000);

  // Velocity: 3s exponential moving average of scroll speed. Ticks only while the page moves or the
  // average is still decaying (a parked page runs nothing), and reads lenis.scroll: window.scrollY
  // forces a style/layout flush every frame.
  let lastY = 0, lastT = 0, ticking = false;
  const tick = () => {
    const t = performance.now(), dt = (t - lastT) / 1000;
    if (dt <= 0) return;
    const y = lenis.scroll, v = (y - lastY) / dt;
    meter.velocity += (v - meter.velocity) * (1 - Math.exp(-dt / 3));
    lastY = y; lastT = t;
    if (Math.abs(meter.velocity) < 1 && v === 0) { meter.velocity = 0; ticking = false; gsap.ticker.remove(tick); emit(); }
  };
  const wake = () => {
    if (ticking) return;
    ticking = true; lastY = lenis.scroll; lastT = performance.now();
    gsap.ticker.add(tick);
  };
  if (!reduced && lenis) lenis.on("scroll", wake);

  return () => { made.forEach((st) => st.kill()); clearInterval(sample); gsap.ticker.remove(tick); lenis && lenis.off("scroll", wake); };
}
